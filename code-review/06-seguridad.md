# Seguridad

---

## Contexto general

Esta es una app personal de usuario unico. Las decisiones de seguridad documentadas en `CLAUDE.md` son intencionales:

- `verify_jwt: false` en todas las Edge Functions — aceptado por diseno
- CORS `Access-Control-Allow-Origin: *` — aceptado para una app local/personal
- Supabase RLS habilitado en las 4 tablas con politicas `FOR ALL TO authenticated`

Los hallazgos de esta seccion son **sugerencias**, no vulnerabilidades criticas en el contexto actual.

---

## 1. Anon key de Supabase hardcodeada en el frontend

**Archivo:** `frontend/src/lib/supabase.ts:3-4`

### Descripcion

```ts
// supabase.ts:3-4
const supabaseUrl = 'https://aqkymmcfktldheqgckja.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

La clave anon esta hardcodeada directamente en el codigo fuente, y ademas se exporta como constante:

```ts
export const SUPABASE_ANON_KEY = supabaseAnonKey;
```

### Nivel de riesgo: Bajo

La clave anon de Supabase es **publica por diseno** — es seguro que la vea el navegador. No permite operaciones privilegiadas. El acceso a los datos esta controlado por RLS. Supabase documenta explicitamente que la clave anon puede estar en el frontend.

### Por que aun asi vale la pena moverla a env vars

Si el proyecto se sube a GitHub (pendiente segun MEMORY.md), la clave quedara en el historial de commits. Si en el futuro se rota la clave, habria que editar el codigo en lugar de solo cambiar la variable de entorno.

### Fix

```bash
# .env.local (no commitear)
VITE_SUPABASE_URL=https://aqkymmcfktldheqgckja.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

```ts
// supabase.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

Agregar `.env.local` al `.gitignore` y crear un `.env.example` con las keys vacias para documentar las variables necesarias.

**Nota:** La misma clave aparece tambien en `index.html` (legacy, linea 504). Si se mantiene ese archivo, actualizar ahi tambien.

---

## 2. `dangerouslySetInnerHTML` con contenido de Claude

**Archivo:** `frontend/src/components/Chat/ChatPage.tsx:74`

### Descripcion

```tsx
// ChatPage.tsx:74
<div
  className="prose prose-invert prose-sm max-w-none"
  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
/>
```

El HTML renderizado proviene de las respuestas de Claude (Claude Sonnet via Edge Function `chat`). Nunca proviene directamente de input del usuario.

### Nivel de riesgo: Muy bajo

Claude no genera HTML arbitrario malicioso en sus respuestas. El riesgo de XSS en este contexto es practicamente nulo. El mismo patron se usa en el `index.html` legacy con `marked.parse()`.

Para mayor tranquilidad, se puede configurar `marked` con una opcion de sanitizacion o usar `DOMPurify`:

```ts
import DOMPurify from 'dompurify';

const renderMarkdown = (text: string) => {
  return DOMPurify.sanitize(marked.parse(text) as string);
};
```

Esto agrega una dependencia extra (`dompurify`) por un riesgo casi nulo. No se recomienda a menos que el origen del contenido cambie.

---

## 3. Modo `confirm` en `import-statement` no valida el payload

**Archivo:** `supabase/functions/import-statement/index.ts:129-133`

### Descripcion

En modo confirm, la Edge Function acepta e inserta directamente el array de transacciones que envia el frontend:

```ts
// import-statement/index.ts:129-133
if (body.confirm === true) {
  const count = await confirmImport(body.transactions);
  // ...
}
```

No hay validacion de que `body.transactions` tenga el formato esperado, ni limites de cantidad, ni verificacion de que los `account_id` correspondan a cuentas del usuario autenticado.

### Nivel de riesgo: Bajo (app personal)

Con `verify_jwt: false` y RLS con `FOR ALL TO authenticated`, cualquier usuario autenticado puede llamar a esta funcion. Como es una app de usuario unico, esto no es un problema practico.

Si en el futuro la app tuviera multiples usuarios, seria importante:
1. Verificar el JWT en la Edge Function
2. Validar que `account_id` pertenezca al usuario del token
3. Limitar la cantidad de transacciones por request

---

## 4. Comparacion HMAC no es constant-time

**Archivo:** `supabase/functions/mp-webhook/index.ts:45`

### Descripcion

```ts
// mp-webhook/index.ts:45
return expected === v1;
```

La comparacion de la firma HMAC usa `===`, que en JavaScript puede terminar antes si los primeros caracteres no coinciden (timing oracle).

### Nivel de riesgo: Teorico / Negligible

Explotar este tipo de vulnerabilidad requiere realizar miles de requests midiendo diferencias de microsegundos en los tiempos de respuesta, desde una red con latencia estable. En la practica, la latencia de red hace que este ataque sea irrealizable contra un endpoint publico como un webhook.

Aun asi, la implementacion correcta seria:

```ts
// Comparacion constant-time manual
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

return timingSafeEqual(expected, v1);
```

---

## 5. Sin límite de tamaño en el parámetro `text` de `import-statement`

**Archivo:** `supabase/functions/import-statement/index.ts:138`

### Descripcion

En modo parse, la Edge Function acepta texto de tamaño arbitrario y lo envía directamente a Claude Sonnet:

```ts
const { text, account_id } = body;
// sin validación de tamaño
const transactions = await parseStatement(text, account_id);
```

Un payload de varios MB generaría un request costoso a la API de Anthropic (tokens de entrada proporcionales al tamaño del texto).

### Nivel de riesgo: Bajo (app personal)

Para uso personal es poco probable que ocurra. Si la URL de la Edge Function quedara expuesta, alguien podría disparar costos de API.

### Fix

```ts
const MAX_TEXT_LENGTH = 50_000; // ~12,500 tokens aprox
if (text.length > MAX_TEXT_LENGTH) {
  return new Response(
    JSON.stringify({ error: `El extracto no puede superar ${MAX_TEXT_LENGTH} caracteres` }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```
