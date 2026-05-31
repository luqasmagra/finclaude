import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// ─── PARSE: extract transactions from text with Sonnet ───────────────────────
async function parseStatement(text: string, account_id: string) {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name');
  const categoryList = (categories ?? [])
    .map((c: { id: string; name: string }) => `- ${c.name} (id: ${c.id})`)
    .join('\n');

  const today = new Date().toISOString().split('T')[0];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system:
      'Eres un asistente que ayuda a importar transacciones financieras desde extractos bancarios. Recibirás un extracto en formato de texto y una lista de categorías disponibles. Tu tarea es extraer todas las transacciones del extracto, asignarles la categoría más apropiada basándote únicamente en la información proporcionada en la descripción de cada transacción, y devolverlas en el formato especificado por la herramienta extract_transactions. Si una transacción no tiene suficiente información para ser clasificada, puedes omitir la categoría (dejarla como null). Asegúrate de extraer también la fecha y el monto de cada transacción.',
    tools: [
      {
        name: 'extract_transactions',
        description: 'Extrae todas las transacciones de un extracto bancario',
        input_schema: {
          type: 'object' as const,
          properties: {
            transactions: {
              type: 'array',
              description: 'Lista de transacciones extraídas',
              items: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number',
                    description:
                      'Monto. Negativo para débitos/gastos, positivo para créditos/ingresos',
                  },
                  description: {
                    type: 'string',
                    description:
                      'Descripción de la transacción tal como aparece en el extracto',
                  },
                  category_id: {
                    type: 'string',
                    description: 'ID de la categoría más apropiada',
                  },
                  date: {
                    type: 'string',
                    description: 'Fecha en formato YYYY-MM-DD',
                  },
                },
                required: ['amount', 'description', 'date'],
              },
            },
          },
          required: ['transactions'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'extract_transactions' },
    messages: [
      {
        role: 'user',
        content: `Hoy es ${today}. Extraé todas las transacciones de este extracto bancario. Para cada una, asigná la categoría más apropiada de la lista.

Categorías disponibles:
${categoryList}

Extracto:
${text}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No se pudieron extraer transacciones del extracto');
  }

  const { transactions } = toolUse.input as {
    transactions: {
      amount: number;
      description: string;
      category_id?: string;
      date: string;
    }[];
  };

  return transactions.map((tx) => ({ ...tx, account_id }));
}

// ─── CONFIRM: bulk insert transactions ───────────────────────────────────────
async function confirmImport(
  transactions: {
    amount: number;
    description: string;
    category_id?: string;
    date: string;
    account_id: string;
  }[],
) {
  const rows = transactions.map((tx) => ({
    account_id: tx.account_id,
    amount: tx.amount,
    description: tx.description,
    category_id: tx.category_id ?? null,
    date: tx.date,
    source: 'import',
  }));

  const { data, error } = await supabase
    .from('transactions')
    .insert(rows)
    .select('id');
  if (error) throw new Error(error.message);
  return data?.length ?? rows.length;
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();

    // Confirm mode: receives already-parsed transactions and inserts them
    if (body.confirm === true) {
      const count = await confirmImport(body.transactions);
      return new Response(JSON.stringify({ imported: count }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse mode: extract transactions from text
    const { text, account_id } = body;
    if (!text || !account_id) {
      return new Response(
        JSON.stringify({ error: 'text y account_id son requeridos' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const MAX_TEXT_LENGTH = 50_000;
    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({
          error: `El extracto no puede superar ${MAX_TEXT_LENGTH} caracteres`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: accountExists } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .maybeSingle();

    if (!accountExists) {
      return new Response(
        JSON.stringify({ error: 'Cuenta no encontrada' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const transactions = await parseStatement(text, account_id);

    // Calculate preview
    const amounts = transactions.map((t) => t.amount);
    const dates = transactions.map((t) => t.date).sort();
    const totalExpenses = amounts
      .filter((a) => a < 0)
      .reduce((s, a) => s + a, 0);
    const totalIncome = amounts.filter((a) => a > 0).reduce((s, a) => s + a, 0);

    return new Response(
      JSON.stringify({
        transactions,
        preview: {
          count: transactions.length,
          date_from: dates[0] ?? null,
          date_to: dates[dates.length - 1] ?? null,
          total_expenses: totalExpenses,
          total_income: totalIncome,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
