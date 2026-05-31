import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const COMPRESS_THRESHOLD = 8;

const MODEL_HAIKU = 'claude-haiku-4-5-20251001';
const MODEL_SONNET = 'claude-sonnet-4-6';

// ─── CONVERSATION HISTORY HELPERS ───────────────────────────────────────────

async function loadConversationHistory(): Promise<{
  summary: string | null;
  messages: { role: string; content: string }[];
  count: number;
}> {
  const { data } = await supabase
    .from('conversations')
    .select('role, content')
    .order('created_at', { ascending: true })
    .limit(100);

  if (!data || data.length === 0) {
    return { summary: null, messages: [], count: 0 };
  }

  let summary: string | null = null;
  const messages: { role: string; content: string }[] = [];

  for (const row of data) {
    if (row.role === 'summary') {
      summary = row.content;
      messages.length = 0;
    } else {
      messages.push({ role: row.role, content: row.content });
    }
  }

  return { summary, messages, count: messages.length };
}

async function saveMessage(role: string, content: string) {
  await supabase.from('conversations').insert({ role, content });
}

async function compressHistory(data: { role: string; content: string }[]) {
  if (!data || data.length === 0) return;

  let summaryIdx = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].role === 'summary') {
      summaryIdx = i;
      break;
    }
  }

  const messagesToCompress = data.slice(summaryIdx + 1);
  if (messagesToCompress.length < COMPRESS_THRESHOLD) return;

  const conversationText = messagesToCompress
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: MODEL_HAIKU,
    max_tokens: 512,
    system:
      'Resumís conversaciones financieras en español. ' +
      'Generás un resumen de máximo 4 oraciones preservando esta información en orden de prioridad:\n' +
      '1. Transacciones registradas: monto EXACTO en pesos, descripción, cuenta y fecha\n' +
      '2. Correcciones realizadas a transacciones previas\n' +
      '3. Preguntas respondidas con datos numéricos concretos\n' +
      '4. Aclaraciones pendientes o sin responder\n\n' +
      'Omití saludos, confirmaciones genéricas y mensajes sin contenido financiero.',
    messages: [
      {
        role: 'user',
        content: `Resumí esta conversación:\n\n${conversationText}`,
      },
    ],
  });

  const summary = (response.content[0] as Anthropic.TextBlock).text;

  await supabase.from('conversations').delete().neq('role', 'summary');

  await supabase
    .from('conversations')
    .insert({ role: 'summary', content: summary });
}

// ─── STEP 1: Classify intent with Haiku ──────────────────────────────────────
async function classifyIntent(
  text: string,
  history: {
    summary: string | null;
    messages: { role: string; content: string }[];
  },
): Promise<'transaction' | 'query' | 'correction'> {
  const lastAssistantMsg = history.messages
    .slice()
    .reverse()
    .find((m) => m.role === 'assistant');

  const contextHint = lastAssistantMsg
    ? `\nContexto — último mensaje del asistente: "${lastAssistantMsg.content.substring(0, 150)}"`
    : '';

  const response = await anthropic.messages.create({
    model: MODEL_HAIKU,
    max_tokens: 16,
    system:
      'Clasificás mensajes financieros en español en una de tres categorías. ' +
      'Respondé ÚNICAMENTE con la palabra, sin puntuación ni texto adicional.\n\n' +
      'Categorías:\n' +
      '- "transaction": el usuario registra un movimiento de dinero (gasto, pago, cobro, ingreso, transferencia) ' +
      'o responde a una pregunta de aclaración sobre una transacción\n' +
      '- "correction": el usuario modifica, corrige o actualiza una transacción ya registrada\n' +
      '- "query": el usuario hace una pregunta o consulta sobre sus finanzas\n\n' +
      'Ejemplos:\n' +
      'Mensaje: "gasté 800 en el super" → transaction\n' +
      'Mensaje: "me pagaron el sueldo" → transaction\n' +
      'Mensaje: "no, eran 1200 pesos" → correction\n' +
      'Mensaje: "cambiá el monto a 800" → correction\n' +
      'Mensaje: "cuánto gasté esta semana?" → query\n' +
      'Mensaje: "cuál es mi saldo en Mercado Pago?" → query' +
      contextHint,
    messages: [
      {
        role: 'user',
        content: `Mensaje: "${text}"\nCategoría:`,
      },
    ],
  });

  const result = (response.content[0] as Anthropic.TextBlock).text
    .trim()
    .toLowerCase();

  if (result.includes('correction')) return 'correction';
  return result.includes('transaction') ? 'transaction' : 'query';
}

// ─── STEP 2a: Parse and record transaction ───────────────────────────────────
async function handleTransaction(
  text: string,
  accounts: { id: string; name: string; type: string }[],
  history: {
    summary: string | null;
    messages: { role: string; content: string }[];
  },
) {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name');

  const categoryList = (categories ?? [])
    .map((c: { id: string; name: string }) => `- ${c.name} (id: ${c.id})`)
    .join('\n');

  const accountList = accounts
    .map((a) => `- ${a.name} (id: ${a.id}, tipo: ${a.type})`)
    .join('\n');

  const today = new Date().toISOString().split('T')[0];

  const messages: Anthropic.MessageParam[] = [];

  if (history.summary) {
    messages.push({
      role: 'user',
      content: `Resumen de la conversación previa: ${history.summary}`,
    });
  }

  for (const msg of history.messages) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }

  messages.push({
    role: 'user',
    content: `Hoy es ${today}. Extraé la información de esta transacción.\n\nCuentas disponibles:\n${accountList}\n\nCategorías disponibles:\n${categoryList}\n\nTexto: "${text}"`,
  });

  const response = await anthropic.messages.create({
    model: MODEL_HAIKU,
    max_tokens: 256,
    system:
      'Extraés datos de transacciones financieras en pesos argentinos (ARS) y los registrás ' +
      'llamando a la herramienta register_transaction. Nunca respondés con texto libre.\n\n' +
      'Reglas:\n' +
      '- Monto: NEGATIVO para gastos, pagos, compras y egresos. POSITIVO para ingresos, cobros y depósitos.\n' +
      '- account_id: ID de la cuenta mencionada en el texto. Si no se menciona ninguna, dejá el campo como string vacío ("").\n' +
      '- date: formato YYYY-MM-DD. Si no se especifica, usá la fecha de hoy.\n' +
      '- needs_clarification: true SOLO si falta el monto o no se puede inferir la descripción.',
    tools: [
      {
        name: 'register_transaction',
        description:
          'Registra una transacción financiera extraída del texto del usuario',
        input_schema: {
          type: 'object' as const,
          properties: {
            amount: {
              type: 'number',
              description:
                'Monto. Negativo para gastos/egresos, positivo para ingresos',
            },
            description: {
              type: 'string',
              description: 'Descripción corta de la transacción',
            },
            category_id: {
              type: 'string',
              description: 'ID de la categoría que mejor aplica',
            },
            account_id: {
              type: 'string',
              description:
                'ID de la cuenta mencionada en el texto. Dejá vacío ("") si no se menciona ninguna.',
            },
            date: {
              type: 'string',
              description: 'Fecha YYYY-MM-DD. Si no se menciona, usar hoy',
            },
            needs_clarification: {
              type: 'boolean',
              description: 'true si falta información crítica',
            },
            clarification_question: {
              type: 'string',
              description: 'Pregunta si needs_clarification es true',
            },
          },
          required: [
            'amount',
            'description',
            'account_id',
            'date',
            'needs_clarification',
          ],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'register_transaction' },
    messages,
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return { type: 'error', message: 'No pude interpretar la transacción' };
  }

  const parsed = toolUse.input as {
    amount: number;
    description: string;
    category_id?: string;
    account_id: string;
    date: string;
    needs_clarification: boolean;
    clarification_question?: string;
  };

  if (parsed.needs_clarification) {
    return { type: 'clarification', message: parsed.clarification_question };
  }

  const rawAccountId = parsed.account_id?.trim();
  const finalAccountId =
    rawAccountId && rawAccountId.length > 0 ? rawAccountId : accounts[0]?.id;
  if (!finalAccountId || finalAccountId.length === 0) {
    return {
      type: 'error',
      message:
        'No se encontró una cuenta disponible para registrar la transacción',
    };
  }

  const { data: transaction, error: dbError } = await supabase
    .from('transactions')
    .insert({
      account_id: finalAccountId,
      amount: parsed.amount,
      description: parsed.description,
      category_id: parsed.category_id?.trim()
        ? parsed.category_id.trim()
        : null,
      date: parsed.date,
      source: 'manual',
    })
    .select('*, accounts(name), categories(name, icon)')
    .single();

  if (dbError) return { type: 'error', message: dbError.message };

  const sign = transaction.amount >= 0 ? '+' : '';
  const amount = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(transaction.amount);
  const cat = transaction.categories
    ? `${transaction.categories.icon} ${transaction.categories.name}`
    : 'Sin categoría';

  return {
    type: 'transaction',
    message: `✓ Registrado: **${transaction.description}** — ${sign}${amount} en ${transaction.accounts?.name}. Categoría: ${cat}.`,
    transaction,
  };
}

// ─── STEP 2b: Query with Sonnet agentic loop ─────────────────────────────────
const QUERY_SYSTEM =
  'Sos un asistente financiero personal que responde preguntas sobre las finanzas del usuario en pesos argentinos.\n\n' +
  'Cuándo usar cada herramienta:\n' +
  '- get_accounts: saldos, balances, listado de cuentas\n' +
  '- get_spending_by_category: totales por categoría o comparaciones ("cuánto gasté en X", "en qué gasté más")\n' +
  '- get_transactions: movimientos específicos, últimas compras, gastos de un comercio concreto\n\n' +
  'Podés encadenar herramientas si la pregunta lo requiere.\n\n' +
  'Formato de respuesta:\n' +
  '- Montos siempre como "$X.XXX" (ej: "$15.000", "$800")\n' +
  '- Si una herramienta devuelve resultados vacíos, decilo: "No encontré transacciones de [X] en ese período"\n' +
  '- Usá listas o negrita solo cuando hay múltiples items. Respuesta directa para preguntas directas.';

const queryTools: Anthropic.Tool[] = [
  {
    name: 'get_accounts',
    description: 'Obtiene todas las cuentas con sus balances actuales',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_transactions',
    description:
      'Obtiene transacciones filtradas por fecha, cuenta o categoría',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: {
          type: 'string',
          description: 'Fecha inicio YYYY-MM-DD (opcional)',
        },
        date_to: {
          type: 'string',
          description: 'Fecha fin YYYY-MM-DD (opcional)',
        },
        account_name: {
          type: 'string',
          description: 'Nombre de la cuenta (opcional)',
        },
        category_name: {
          type: 'string',
          description: 'Nombre de la categoría (opcional)',
        },
        limit: {
          type: 'number',
          description: 'Máximo de resultados (default 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_spending_by_category',
    description:
      'Obtiene el total gastado agrupado por categoría en un período',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
        date_to: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
      },
      required: ['date_from', 'date_to'],
    },
  },
];

async function runQueryTool(name: string, input: Record<string, unknown>) {
  if (name === 'get_accounts') {
    const { data } = await supabase
      .from('accounts')
      .select('name, type, currency, balance')
      .eq('active', true)
      .order('name');
    return data ?? [];
  }

  if (name === 'get_transactions') {
    let query = supabase
      .from('transactions')
      .select('amount, description, date, accounts(name), categories(name)')
      .order('date', { ascending: false })
      .limit((input.limit as number) ?? 50);

    if (input.date_from) query = query.gte('date', input.date_from as string);
    if (input.date_to) query = query.lte('date', input.date_to as string);
    if (input.account_name) {
      const { data: acc } = await supabase
        .from('accounts')
        .select('id')
        .ilike('name', `%${input.account_name}%`)
        .single();
      if (acc) query = query.eq('account_id', (acc as { id: string }).id);
    }
    if (input.category_name) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', `%${input.category_name}%`)
        .single();
      if (cat) query = query.eq('category_id', (cat as { id: string }).id);
    }

    const { data } = await query;
    return data ?? [];
  }

  if (name === 'get_spending_by_category') {
    const { data } = await supabase
      .from('transactions')
      .select('amount, categories(name)')
      .lt('amount', 0)
      .gte('date', input.date_from as string)
      .lte('date', input.date_to as string);

    if (!data) return [];

    const grouped: Record<string, number> = {};
    for (const tx of data) {
      const cat =
        (tx.categories as { name: string } | null)?.name ?? 'Sin categoría';
      grouped[cat] = (grouped[cat] ?? 0) + Math.abs(tx.amount as number);
    }
    return Object.entries(grouped)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

  return { error: 'Herramienta desconocida' };
}

async function handleQuery(
  question: string,
  history: {
    summary: string | null;
    messages: { role: string; content: string }[];
  },
) {
  const today = new Date().toISOString().split('T')[0];
  const messages: Anthropic.MessageParam[] = [];

  if (history.summary) {
    messages.push({
      role: 'user',
      content: `Resumen de la conversación previa: ${history.summary}`,
    });
  }

  for (const msg of history.messages) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }

  messages.push({
    role: 'user',
    content: `Hoy es ${today}. Respondé esta pregunta sobre las finanzas del usuario:\n\n"${question}"`,
  });

  let response = await anthropic.messages.create({
    model: MODEL_SONNET,
    max_tokens: 1536,
    system: QUERY_SYSTEM,
    tools: queryTools,
    messages,
  });

  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter((b) => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (block) => {
        if (block.type !== 'tool_use') return null!;
        const result = await runQueryTool(
          block.name,
          block.input as Record<string, unknown>,
        );
        return {
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: JSON.stringify(result),
        };
      }),
    );

    messages.push({ role: 'user', content: toolResults });
    response = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 1536,
      system: QUERY_SYSTEM,
      tools: queryTools,
      messages,
    });
  }

  const answer = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('\n');
  return { type: 'query', message: answer };
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { text, accounts } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const history = await loadConversationHistory();
    await saveMessage('user', text);

    const intent = await classifyIntent(text, history);

    let result;
    if (intent === 'transaction' || intent === 'correction') {
      result = await handleTransaction(text, accounts ?? [], history);
    } else {
      result = await handleQuery(text, history);
    }

    await saveMessage('assistant', result.message);

    const currentCount = history.count + 2;
    if (currentCount >= COMPRESS_THRESHOLD) {
      const allMessages = [
        ...(history.summary
          ? [{ role: 'summary', content: history.summary }]
          : []),
        ...history.messages,
        { role: 'user', content: text },
        { role: 'assistant', content: result.message },
      ];
      await compressHistory(allMessages);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
