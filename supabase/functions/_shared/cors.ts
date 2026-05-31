const FRONTEND_URL = Deno.env.get('FRONTEND_URL');
if (!FRONTEND_URL) throw new Error('[cors] FRONTEND_URL env var is not set');

export const corsHeaders = {
  'Access-Control-Allow-Origin': FRONTEND_URL,
  'Access-Control-Allow-Headers':
    'authorization, content-type, apikey, x-client-info',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}
