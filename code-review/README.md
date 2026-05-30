# Code Review — Finanzas Personales

Fecha: 2026-05-03 (rev 1), 2026-05-03 (rev 2), 2026-05-03 (rev 3)
Revisado por: Claude Sonnet 4.6

## Archivos revisados

### Frontend (React + TypeScript)
- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/components/Dashboard/DashboardPage.tsx`
- `frontend/src/components/Chat/ChatPage.tsx`
- `frontend/src/components/Layout/Header.tsx`
- `frontend/src/components/Layout/Sidebar.tsx`
- `frontend/src/components/Accounts/AddAccountModal.tsx`
- `frontend/src/hooks/useAuth.tsx`
- `frontend/src/hooks/useAccounts.ts`
- `frontend/src/hooks/useChat.ts`
- `frontend/src/hooks/useTransactions.ts`
- `frontend/src/lib/supabase.ts`
- `frontend/src/utils/formatters.ts`
- `frontend/src/types.ts`

### Backend (Edge Functions)
- `supabase/functions/chat/index.ts`
- `supabase/functions/import-statement/index.ts`
- `supabase/functions/mp-webhook/index.ts`

### Legacy
- `index.html` (raiz del proyecto)

---

## Resumen de hallazgos

| # | Archivo | Categoria | Impacto | Estado |
|---|---------|-----------|---------|--------|
| 1 | `ChatPage.tsx` | Bug real | **Alto** — transacciones no refrescan UI | ✅ Resuelto |
| 2 | `Header.tsx:45` | Bug real | **Alto** — boton Importar es un no-op | ✅ Resuelto |
| 3 | `Sidebar.tsx:14` | Calidad | Medio — duplicado de `formatMoney` | ✅ Resuelto |
| 4 | `LoginPage/ChatPage/AddAccountModal` | TypeScript | Medio — `React.FormEvent` sin import | ✅ Resuelto |
| 5 | `types.ts:25` | TypeScript | Medio — `source` tipo incorrecto | ✅ Resuelto |
| 6 | `useTransactions.ts:4` | TypeScript | Bajo — 6 imports no usados | ✅ Resuelto |
| 7 | `chat/index.ts:488` | Performance | Bajo — query DB innecesaria | ✅ Resuelto |
| 8 | `counter.ts` | Codigo muerto | Bajo | ✅ Resuelto |
| 9 | `index.html` raiz | Codigo muerto | Bajo | ✅ Resuelto |
| 10 | `useChat.ts:71` | Codigo muerto | Bajo — exports nunca consumidos | ✅ Resuelto |
| 11 | `useAccounts.ts` / `useTransactions.ts` | Calidad | Alto — estado no compartido entre componentes | ✅ Resuelto |
| 12 | `Sidebar.tsx` + `DashboardPage.tsx` | Performance | Sugerencia — doble fetch de accounts | ✅ Resuelto |
| 13 | `useTransactions.ts:65` | Performance | Sugerencia — calculos sin `useMemo` | ✅ Resuelto |
| 14 | `chat/index.ts:260` | Calidad | Sugerencia — alias inutil | ✅ Resuelto |
| 15 | `useChat.ts:2-3` | Calidad | Sugerencia — doble import mismo modulo | ✅ Resuelto |
| 16 | `supabase.ts` | Seguridad | Sugerencia — anon key hardcodeada | ✅ Resuelto |
| 17 | `chat/index.ts:267` | Bug real | **Crítico** — `tx` no definido, crashea toda transacción | ✅ Resuelto |
| 18 | `AddAccountModal.tsx:11` / `ImportStatementModal.tsx:19` | Bug real | **Alto** — usan `useAccounts` directo, cuentas no actualizan Sidebar | ✅ Resuelto |
| 19 | `ChatPage.tsx:43` | TypeScript | Medio — `KeyboardEvent` pasado a handler que espera `FormEvent` | ✅ Resuelto |
| 20 | `DashboardPage.tsx:8` | Código muerto | Bajo — `TrendingDown` y `Wallet` importados sin usar | ✅ Resuelto |
| 21 | `useTransactions.ts:6` | Código muerto | Bajo — función `useTransactions` sin consumidores | ✅ Resuelto |
| 22 | `AccountsContext.tsx:34` / `TransactionsContext.tsx:33` | Calidad | Medio — `refetch` duplica query en lugar de llamar `fetchX(false)` | ✅ Resuelto |
| 23 | `useChat.ts:20` | Calidad | Bajo — `.filter()` JS redundante tras `.in()` de DB | ✅ Resuelto |
| 24 | `Sidebar.tsx:89` | Calidad | Bajo — `reduce` inline cuando existe `getTotalBalance()` en contexto | ✅ Resuelto |
| 25 | `chat/index.ts:53` | Performance | Bajo — `compressHistory` re-consulta conversations ya cargadas | ✅ Resuelto |
| 26 | `import-statement/index.ts:138` | Seguridad | Bajo — sin límite de tamaño en parámetro `text` | ✅ Resuelto |
| 27 | `chat/index.ts:95` | Bug real | **Crítico** — `classifyIntent` definida dos veces; la primera es código muerto e intent `correction` no se maneja | ⏸️ Pendiente |
| 28 | `useAccounts.ts` | Código muerto | Bajo — archivo completo sin consumidores tras Bug #18 | ⏸️ Pendiente |
| 29 | `chat/index.ts:72,109,140,202,449,476` | Calidad | Medio — model strings hardcodeadas en 6 lugares | ⏸️ Pendiente |
| 30 | `useChat.ts:39` / `ImportStatementModal.tsx:38,70` | Calidad | Medio — fetch manual con apikey en vez de `supabase.functions.invoke()` | ⏸️ Pendiente |
| 31 | `AccountsContext.tsx:23` / `TransactionsContext.tsx:17` | Calidad | Medio — errores de DB ignorados silenciosamente | ⏸️ Pendiente |
| 32 | `BalanceChart.tsx:58` / `CategoryPieChart.tsx:43` / `MonthlyBarChart.tsx:47` | TypeScript | Bajo — tipo `any` en formatters de Recharts | ⏸️ Pendiente |
| 33 | `BalanceChart.tsx:18` | Performance | Bajo — heavy compute (reduce+sort+map) sin `useMemo` | ⏸️ Pendiente |
| 34 | `package.json:29` | Código muerto | Bajo — `framer-motion` instalado sin usar | ⏸️ Pendiente |
| 35 | `package.json:35` | Código muerto | Bajo — `react-router-dom` instalado sin usar | ⏸️ Pendiente |
| 36 | `package.json:23` | Código muerto | Bajo — `@supabase/auth-helpers-react` instalado sin usar | ⏸️ Pendiente |

---

## Documentacion por categoria

- [01-bugs.md](./01-bugs.md) — Bugs reales con impacto en funcionalidad
- [02-codigo-muerto.md](./02-codigo-muerto.md) — Archivos, funciones y exports sin uso
- [03-calidad.md](./03-calidad.md) — Duplicados, simplificaciones y code smells
- [04-typescript.md](./04-typescript.md) — Tipos incorrectos, imports no usados, anotaciones
- [05-performance.md](./05-performance.md) — Renders innecesarios, fetches duplicados, memoizacion
- [06-seguridad.md](./06-seguridad.md) — Credenciales, CORS, sanitizacion

---

## Hallazgos resueltos en sesion 2026-05-03

### Bug #1 - Transacciones no refrescan UI
- **Problema:** Al registrar transaccion desde chat, Sidebar/Dashboard no se actualizaban
- **Solucion:** Crear `AccountsContext` y `TransactionsContext` para compartir estado entre componentes
- **Archivos:** Nuevos `context/AccountsContext.tsx`, `context/TransactionsContext.tsx`

### Bug #2 - Boton Importar no funciona
- **Problema:** Boton "Importar" en Header no hacia nada
- **Solucion:** Crear `ImportStatementModal` con flujo completo (parse + preview + confirm)

### Calidad #3 - `formatCurrency` duplicado
- **Solucion:** Eliminar funcion local, usar `formatMoney` directamente

### Calidad #11 - Estado no compartido entre componentes
- **Problema:** Cada componente creaba su propia instancia de `useAccounts()`/`useTransactions()`
- **Solucion:** React Context para compartir estado + refetch silencioso (sin cambiar loading)

### TypeScript #4, #5, #6 - Imports y tipos
- **Solucion:** Imports directos desde 'react', tipo `source: 'mercadopago'`, limpiar imports

### Performance #7, #13 - Querys y useMemo
- **Solucion:** Eliminar query extra, agregar `useMemo` en calculos agregados

### Codigo muerto #8, #10
- **Solucion:** Eliminar `counter.ts`, limpiar exports de `useChat.ts`

### Seguridad #16 - Anon key en variables de entorno
- **Solucion:** Mover a `.env.local` + `.env.example`, usar `import.meta.env`

### Codigo muerto #9 - index.html raiz
- **Solucion:** Eliminado el archivo legacy de la raiz del proyecto

### Performance #12 - Doble fetch de accounts
- **Solucion:** Ya estaba resuelto con el AccountsContext del #11. Ambos componentes comparten el mismo estado.

---

## Hallazgos rev 2 — 2026-05-03

### Bug #17 — `tx` no definido en `chat/index.ts:267`
- **Origen:** Regresion introducida al resolver Calidad #2 (se eliminó `const tx = transaction` pero no se actualizó la referencia en la línea siguiente)
- **Impacto:** Toda transacción exitosa termina en `ReferenceError: tx is not defined` → respuesta 500

### Bug #18 — `AddAccountModal` y `ImportStatementModal` usan hook directo
- **Problema:** Ambos importan `useAccounts()` independiente en vez de `useAccountsContext` → crear cuenta no actualiza el Sidebar; +2 queries extra a accounts en el mount de la app
- **Fix:** Usar `useAccountsContext` en ambos modales

### TypeScript #19 — Mismatch de tipos en `handleKeyDown`
- **Problema:** `handleKeyDown` recibe `KeyboardEvent` y llama `handleSubmit(e)` que espera `FormEvent` → error de compilación TypeScript

### Código muerto #20 — Imports sin usar en `DashboardPage`
- **Problema:** `TrendingDown` y `Wallet` importados de lucide-react, nunca aparecen en el JSX

### Código muerto #21 — `useTransactions` standalone sin consumidores
- **Problema:** `TransactionsContext.tsx` reimplementó la misma lógica; nadie importa `useTransactions` (solo `useTransactionsByPeriod` del mismo archivo se usa)

### Calidad #22 — `refetch` duplica query en ambos contextos
- **Problema:** `refetch` en `AccountsContext` y `TransactionsContext` repite el mismo SQL de `fetchX(false)` — debería delegarle la llamada

### Calidad #23 — Filtro JS redundante en `useChat`
- **Problema:** `.filter((m) => m.role === 'user' || m.role === 'assistant')` repite lo que ya hace `.in('role', ['user', 'assistant'])` en la query

### Calidad #24 — `reduce` inline en Sidebar
- **Problema:** `accounts.reduce((sum, a) => sum + a.balance, 0)` recalcula lo que `getTotalBalance()` del contexto ya expone

### Performance #25 — `compressHistory` hace query extra
- **Problema:** Carga `conversations` por segunda vez cuando esos datos ya están disponibles desde `loadConversationHistory()`

### Seguridad #26 — Sin límite de tamaño en `import-statement`
- **Problema:** El parámetro `text` acepta payloads arbitrariamente grandes → podría causar gastos inesperados de API

---

## Hallazgos rev 3 — 2026-05-03

### Bug #27 — `classifyIntent` definida dos veces
- **Problema:** Dos declaraciones `async function classifyIntent` en el mismo archivo. La segunda (línea 126) pisa a la primera (línea 95) en runtime. La primera es código muerto. Además, el tercer intent `'correction'` que retorna la segunda definición no tiene handler → cae silenciosamente a `handleQuery`
- **Fix:** Eliminar líneas 95-125; decidir si `'correction'` se maneja como transacción o se elimina

### Código muerto #28 — `useAccounts.ts` sin consumidores
- **Problema:** Tras resolver Bug #18, todos los componentes usan `useAccountsContext`. El archivo `hooks/useAccounts.ts` no tiene ningún importador
- **Fix:** Eliminar el archivo

### Calidad #29 — Model strings hardcodeadas en 6 lugares
- **Problema:** `'claude-haiku-4-5-20251001'` (4 veces) y `'claude-sonnet-4-6'` (2 veces) en `chat/index.ts`
- **Fix:** Extraer a `const MODEL_HAIKU` y `const MODEL_SONNET` al inicio del archivo

### Calidad #30 — `fetch` manual con apikey vs `supabase.functions.invoke()`
- **Problema:** `useChat.ts` e `ImportStatementModal.tsx` construyen requests con fetch + apikey manual. El cliente Supabase tiene `invoke()` que maneja eso automáticamente
- **Fix:** Usar `supabase.functions.invoke('chat', { body })` en ambos archivos

### Calidad #31 — Errores de DB silenciados en contextos
- **Problema:** `AccountsContext.fetchAccounts` y `TransactionsContext.fetchTransactions` ignoran el `error` de Supabase → fallo silencioso con lista vacía
- **Fix:** Capturar y `console.error` el error

### TypeScript #32 — `any` en formatters de Recharts
- **Problema:** Los tres gráficos del dashboard usan `(value: any)` en sus tooltip formatters
- **Fix:** Usar `(value: number | string)` en los tres archivos

### Performance #33 — `BalanceChart.data` sin `useMemo`
- **Problema:** `reduce + sort + map` sobre todas las transacciones recalcula en cada render
- **Fix:** Envolver en `useMemo([transactions])`

### Código muerto #34, #35, #36 — Dependencias sin usar
- `framer-motion`, `react-router-dom`, `@supabase/auth-helpers-react` — instaladas en `package.json` pero sin ningún import en el código fuente
- **Fix:** `npm uninstall` de las tres
