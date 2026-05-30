import { createClient } from 'npm:@supabase/supabase-js';
import Anthropic from 'npm:@anthropic-ai/sdk';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const MP_USER_ID = '384898465';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, content-type, apikey, x-client-info',
};

async function classifyDescriptions(
  descriptions: string[],
  categories: { id: string; name: string }[],
): Promise<(string | null)[]> {
  const categoryList = categories
    .map((c) => `- ${c.name} (id: ${c.id})`)
    .join('\n');
  const descriptionsList = descriptions
    .map((d, i) => `${i}: "${d}"`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system:
      'Eres un asistente que ayuda a clasificar transacciones financieras en categorías predefinidas. Recibirás una lista de descripciones de transacciones y una lista de categorías disponibles. Para cada descripción, debes asignar la categoría más adecuada basándote únicamente en la información proporcionada en la descripción. Si la descripción es vaga o no permite una clasificación clara, asigna null. Devuelve tus respuestas en el formato especificado por la herramienta assign_categories',
    tools: [
      {
        name: 'assign_categories',
        description:
          'Asigna categorías a transacciones basándose en su descripción',
        input_schema: {
          type: 'object',
          properties: {
            assignments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: {
                    type: 'number',
                    description: 'Índice de la transacción (0-based)',
                  },
                  category_id: {
                    type: 'string',
                    description:
                      'ID de la categoría asignada, o null si no se puede clasificar',
                  },
                },
                required: ['index', 'category_id'],
              },
            },
          },
          required: ['assignments'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'assign_categories' },
    messages: [
      {
        role: 'user',
        content: `Clasificá estas transacciones de Mercado Pago en las categorías disponibles. Si la descripción es muy vaga ("Varios", "Pago QR", etc.), asigná null.

Categorías disponibles:
${categoryList}

Transacciones:
${descriptionsList}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use')
    return descriptions.map(() => null);

  const input = toolUse.input as Record<string, unknown>;
  const assignments = (input.assignments ?? []) as {
    index: number;
    category_id: string | null;
  }[];

  const result: (string | null)[] = descriptions.map(() => null);
  for (const a of assignments) {
    if (a.index >= 0 && a.index < descriptions.length) {
      result[a.index] = a.category_id;
    }
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Last month for incremental sync
  const beginDate = new Date();
  beginDate.setMonth(beginDate.getMonth() - 1);
  const beginStr = beginDate.toISOString().split('T')[0];

  const mpRes = await fetch(
    `https://api.mercadopago.com/v1/payments/search?payer.id=${MP_USER_ID}&status=approved&sort=date_created&criteria=desc&limit=100&begin_date=${beginStr}`,
    { headers: { Authorization: `Bearer ${MP_TOKEN}` } },
  );

  if (!mpRes.ok) {
    const errText = await mpRes.text();
    return new Response(
      JSON.stringify({ error: 'MP API error', details: errText }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const mpData = await mpRes.json();
  const payments = mpData.results ?? [];

  console.log(
    'MP response - total:',
    mpData.paging?.total,
    'results count:',
    payments.length,
  );
  if (payments.length > 0) {
    console.log('First payment sample:', JSON.stringify(payments[0], null, 2));
  }

  if (payments.length === 0) {
    return new Response(
      JSON.stringify({ synced: 0, message: 'No se encontraron pagos' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .ilike('name', '%mercado pago%')
    .maybeSingle();

  if (!account) {
    return new Response(
      JSON.stringify({ error: 'Cuenta de Mercado Pago no encontrada' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const allPaymentIds = payments.map((p: Record<string, unknown>) => String(p.id));
  const { data: existingTxs } = await supabase
    .from('transactions')
    .select('external_id')
    .in('external_id', allPaymentIds);

  const knownIds = new Set<string>(
    existingTxs?.map((tx: { external_id: string }) => tx.external_id) ?? [],
  );

  const newPayments = payments.filter(
    (p: Record<string, unknown>) => !knownIds.has(String(p.id)),
  );

  if (newPayments.length === 0) {
    return new Response(
      JSON.stringify({
        synced: 0,
        message: 'Todos los pagos ya están registrados',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // Classify with Haiku
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name');

  const descriptions = newPayments.map(
    (p: Record<string, unknown>) =>
      (p.description as string) || `Pago QR MP #${p.id}`,
  );

  let categoryIds: (string | null)[] = descriptions.map(() => null);
  if (categories && categories.length > 0) {
    try {
      categoryIds = await classifyDescriptions(descriptions, categories);
      console.log('Haiku classifications:', JSON.stringify(categoryIds));
    } catch (err) {
      console.error('Haiku classification error:', err);
    }
  }

  const transactionsToInsert = newPayments.map(
    (p: Record<string, unknown>, i: number) => {
      const date =
        (p.date_approved ?? (p.date_created as string))?.split('T')[0] ??
        new Date().toISOString().split('T')[0];

      const isIncome = String(p.collector?.id) === MP_USER_ID;
      const amount = isIncome
        ? (p.transaction_amount as number)
        : -(p.transaction_amount as number);

      return {
        account_id: account.id,
        amount,
        description: descriptions[i],
        category_id: categoryIds[i] ?? null,
        date,
        source: 'mercadopago' as const,
        external_id: String(p.id),
      };
    },
  );

  console.log(
    'Transactions to insert:',
    JSON.stringify(transactionsToInsert, null, 2),
  );

  const { error } = await supabase
    .from('transactions')
    .insert(transactionsToInsert);

  if (error) {
    console.error('Supabase insert error:', JSON.stringify(error, null, 2));
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const totalAmount = transactionsToInsert.reduce(
    (sum: number, t: { amount: number }) => sum + t.amount,
    0,
  );

  return new Response(
    JSON.stringify({
      synced: transactionsToInsert.length,
      total: totalAmount,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
