const CLIENT_URL = Deno.env.get('CLIENT_URL');
if (!CLIENT_URL) throw new Error('[cors] CLIENT_URL env var is not set');

export const corsHeaders = {
  'Access-Control-Allow-Origin': CLIENT_URL,
  'Access-Control-Allow-Headers':
    'authorization, content-type, apikey, x-client-info',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}
