import { createClient } from 'npm:@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';
const MP_USER_ID = Deno.env.get('MP_USER_ID') ?? '';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Validates the HMAC-SHA256 signature MP sends in x-signature
async function validateSignature(
  req: Request,
  paymentId: string,
): Promise<boolean> {
  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id') ?? '';
  if (!xSignature) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => p.trim().split('=')),
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const template = `id:${paymentId};request-id:${xRequestId};ts:${ts}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(MP_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(template),
  );
  const expected = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqual(expected, v1);
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return new Response('OK', { status: 200 });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!MP_USER_ID) {
      return new Response('MP_USER_ID env var is not set', { status: 500 });
    }

    let body: { type?: string; data?: { id?: string } };
    try {
      body = await req.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    if (body.type !== 'payment' || !body.data?.id) {
      return new Response('OK', { status: 200 });
    }

    const paymentId = String(body.data.id);

    // Validate MP signature
    const valid = await validateSignature(req, paymentId);
    if (!valid) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Idempotency: do not process the same payment twice
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('external_id', paymentId)
      .maybeSingle();

    if (existing) {
      return new Response('Already processed', { status: 200 });
    }

    // Fetch payment details from the MP API
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${MP_TOKEN}` },
      },
    );

    if (!mpRes.ok) {
      return new Response('MP API error', { status: 500 });
    }

    const payment = await mpRes.json();

    // Only record approved payments
    if (payment.status !== 'approved') {
      return new Response('OK', { status: 200 });
    }

    // If we are the payer → expense (negative). If we are the collector → income (positive).
    const isPayer = String(payment.payer?.id) === MP_USER_ID;
    const amount = isPayer
      ? -payment.transaction_amount
      : payment.transaction_amount;

    const date =
      (payment.date_approved ?? payment.date_created)?.split('T')[0] ??
      new Date().toISOString().split('T')[0];

    const description =
      payment.description ||
      (isPayer ? `Pago MP #${paymentId}` : `Cobro MP #${paymentId}`);

    // Find the Mercado Pago account in the DB
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .ilike('name', '%mercado pago%')
      .maybeSingle();

    if (!account) {
      return new Response('MP account not found in DB', { status: 500 });
    }

    const { error } = await supabase.from('transactions').insert({
      account_id: account.id,
      amount,
      description,
      date,
      source: 'mercadopago',
      external_id: paymentId,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
