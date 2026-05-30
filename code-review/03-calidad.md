# Calidad y simplificacion

Code smells, duplicaciones y patrones que reducen la claridad o mantenibilidad del codigo.

---

## 1. `formatCurrency` en Sidebar duplica `formatMoney` de utils

**Archivo:** `frontend/src/components/Layout/Sidebar.tsx:4,14-20`

### Descripcion

`Sidebar.tsx` importa `formatMoney` desde utils en la linea 4, pero luego define una funcion local `formatCurrency` con exactamente la misma implementacion:

```ts
// Sidebar.tsx:4
import { formatMoney } from '../../utils/formatters';

// Sidebar.tsx:14-20 — funcion local identica
const formatCurrency = (amount: number, currency = 'ARS') => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};
```

```ts
// utils/formatters.ts:1-7 — la misma funcion
export function formatMoney(amount: number, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
```

Son identicas. `formatCurrency` se usa para las cuentas (con `acc.currency`) y `formatMoney` para las transacciones. Pero `formatMoney` ya soporta el parametro `currency`, por lo que `formatCurrency` es completamente redundante.

**Fix:** Eliminar `formatCurrency` y usar `formatMoney` en todos los casos.

```tsx
// Sidebar.tsx — antes
<div>{formatCurrency(acc.balance, acc.currency)}</div>
<span>Total: {formatCurrency(accounts.reduce(...)}</span>

// Sidebar.tsx — despues
<div>{formatMoney(acc.balance, acc.currency)}</div>
<span>Total: {formatMoney(accounts.reduce(...)}</span>
```

---

## 9. Model strings hardcodeadas en 6 lugares de `chat/index.ts`

**Archivo:** `supabase/functions/chat/index.ts:72,109,140,202,449,476`

### Descripcion

Los nombres de modelo de Claude aparecen hardcodeados seis veces:

```ts
// Líneas 72, 109, 140, 202:
model: 'claude-haiku-4-5-20251001',

// Líneas 449, 476:
model: 'claude-sonnet-4-6',
```

Si se quiere actualizar a un modelo nuevo (o cambiar Haiku por Sonnet), hay que editar 6 líneas con riesgo de inconsistencias.

### Fix

Definir constantes al principio del archivo (después de las importaciones):

```ts
const MODEL_HAIKU = 'claude-haiku-4-5-20251001';
const MODEL_SONNET = 'claude-sonnet-4-6';
```

Y reemplazar cada ocurrencia:
```ts
model: MODEL_HAIKU,  // en compressHistory, classifyIntent, handleTransaction
model: MODEL_SONNET, // en handleQuery
```

---

## 10. `fetch` manual con apikey en vez de `supabase.functions.invoke()`

**Archivos:**
- `frontend/src/hooks/useChat.ts:39-48`
- `frontend/src/components/Import/ImportStatementModal.tsx:34-41` y `66-78`

### Descripcion

Ambos archivos llaman a las Edge Functions con `fetch` manual, pasando la apikey en el header:

```ts
// useChat.ts:39-48
const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
  body: JSON.stringify({ text, accounts }),
});

// ImportStatementModal.tsx:34-41
const res = await fetch(`${SUPABASE_URL}/functions/v1/import-statement`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
  body: JSON.stringify({ text, account_id: selectedAccount }),
});
```

El cliente de Supabase ya tiene `supabase.functions.invoke()` que maneja URL, headers de autenticación y serialización automáticamente. El uso de `fetch` manual requiere importar `SUPABASE_URL` y `SUPABASE_ANON_KEY` como constantes, creando acoplamiento innecesario.

### Fix

```ts
// useChat.ts — reemplazar fetch manual
const { data: json, error } = await supabase.functions.invoke('chat', {
  body: { text, accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type })) },
});
if (error) throw error;

// ImportStatementModal.tsx — parse
const { data: json, error } = await supabase.functions.invoke('import-statement', {
  body: { text, account_id: selectedAccount },
});

// ImportStatementModal.tsx — confirm
const { data: json, error } = await supabase.functions.invoke('import-statement', {
  body: { confirm: true, account_id: selectedAccount, transactions: parsedTransactions },
});
```

Esto también elimina los exports `SUPABASE_URL` y `SUPABASE_ANON_KEY` de `supabase.ts` (que quedarían sin consumidores).

---

## 11. Errores de DB ignorados silenciosamente en los contextos

**Archivos:**
- `frontend/src/context/AccountsContext.tsx:23-31`
- `frontend/src/context/TransactionsContext.tsx:17-27`

### Descripcion

Ambos contextos ignoran el `error` que retorna Supabase:

```ts
// AccountsContext.tsx:23-28
const { data } = await supabase        // error ignorado
  .from('accounts')
  .select('*')
  .eq('active', true)
  .order('name');
setAccounts(data || []);               // si falla → lista vacía silenciosa
```

Si la query falla (timeout, red caída, permisos RLS), la app muestra una lista vacía sin ningún mensaje al usuario.

### Fix

```ts
const { data, error } = await supabase
  .from('accounts')
  .select('*')
  .eq('active', true)
  .order('name');

if (error) {
  console.error('[AccountsContext] fetchAccounts failed:', error.message);
}
setAccounts(data || []);
```

Mismo patrón en `TransactionsContext`. No requiere mostrar UI de error (app personal), pero al menos el log ayuda a debuggear en producción.

---

## 2. Alias inutil `const tx = transaction` en chat Edge Function

**Archivo:** `supabase/functions/chat/index.ts:260`

### Descripcion

Despues de insertar la transaccion en DB, el codigo crea un alias sin proposito:

```ts
// chat/index.ts:259-261
const { data: transaction, error: dbError } = await supabase
  .from('transactions')
  .insert(...)...

const tx = transaction;  // alias que no aporta nada
const sign = tx.amount >= 0 ? '+' : '';
```

`tx` se usa exactamente igual que `transaction`. No hay razon para el alias.

**Fix:** Eliminar la linea y usar `transaction` directamente.

```ts
const sign = transaction.amount >= 0 ? '+' : '';
const amount = new Intl.NumberFormat(...).format(transaction.amount);
const cat = transaction.categories ? ... : 'Sin categoria';
```

---

## 3. Doble import del mismo modulo en `useChat`

**Archivo:** `frontend/src/hooks/useChat.ts:2-3`

### Descripcion

```ts
// useChat.ts:2-3
import { ChatMessage, ChatResponse } from '../types';
import { Account } from '../types';
```

Dos sentencias `import` separadas del mismo modulo `'../types'`.

**Fix:** Unificar en una sola linea.

```ts
import { ChatMessage, ChatResponse, Account } from '../types';
```

---

## 4. Query extra a DB en `chat/index.ts` para obtener el count

**Archivo:** `supabase/functions/chat/index.ts:486-489`

### Descripcion

Al final de cada request, el handler hace una tercera llamada a `loadConversationHistory()` unicamente para obtener el `count` y decidir si comprimir:

```ts
// chat/index.ts:474  -> primera llamada (carga historial)
const history = await loadConversationHistory();

// ...guarda user message y assistant message...

// chat/index.ts:488  -> tercera llamada innecesaria
const { count } = await loadConversationHistory();
if (count >= COMPRESS_THRESHOLD) {
  await compressHistory();
}
```

Ya se tiene `history.count` de la primera llamada. Solo se agregaron 2 mensajes nuevos (user + assistant). El nuevo count es `history.count + 2`.

**Fix:**

```ts
const history = await loadConversationHistory();
// ...procesamiento...
await saveMessage('user', text);
// ...
await saveMessage('assistant', result.message);

if (history.count + 2 >= COMPRESS_THRESHOLD) {
  await compressHistory();
}
```

Esto elimina un round-trip a la DB en cada interaccion.

---

## 5. Estado no compartido entre componentes causa bugs de actualizacion

**Archivos:** `frontend/src/hooks/useAccounts.ts`, `frontend/src/hooks/useTransactions.ts`

### Descripcion

El frontend original (HTML + Vanilla JS) tenla un estado global unico que se actualizaba en un solo lugar despues de cada transaccion:

```js
// index.html:751-753
if (json.type === 'transaction') {
  loadData();  // actualiza todo
}
```

En la migracion a React, cada componente creo su propia instancia de los hooks:

```tsx
// App.tsx
const { refetch: refetchAccounts } = useAccounts();

// Sidebar.tsx
const { accounts } = useAccounts();

// DashboardPage.tsx
const { accounts } = useAccounts();
```

Cada `useAccounts()` crea un estado independiente. Cuando `App.tsx` llama a `refetchAccounts()`, solo actualiza su propia instancia, no la de `Sidebar` ni `DashboardPage`.

**Resultado:** Cuando el usuario registra una transaccion desde el chat, las cuentas y transacciones en el sidebar no se actualizan hasta recargar la pagina.

### Fix

Crear React Context para compartir el estado entre componentes:

- `AccountsContext` - provee `accounts`, `loading`, `refetch`, `createAccount`, `getTotalBalance`
- `TransactionsContext` - provee `transactions`, `loading`, `refetch`

Todos los componentes que necesitan accounts/transacciones consumen el contexto en lugar de crear instancias independientes.

Ademas, los metodos `refetch` fueron modificados para NO cambiar el estado `loading` durante el refetch, evitando que se muestre "Cargando..." innecesariamente.

### Archivos modificados

- `frontend/src/context/AccountsContext.tsx` - nuevo
- `frontend/src/context/TransactionsContext.tsx` - nuevo
- `frontend/src/App.tsx` - usa los Providers
- `frontend/src/components/Layout/Sidebar.tsx` - consume contextos
- `frontend/src/components/Dashboard/DashboardPage.tsx` - consume AccountsContext
- `frontend/src/components/Chat/ChatPage.tsx` - consume contextos

---

## 6. `refetch` duplica query en `AccountsContext` y `TransactionsContext`

**Archivos:**
- `frontend/src/context/AccountsContext.tsx:34-42`
- `frontend/src/context/TransactionsContext.tsx:33-38`

### Descripcion

En ambos contextos, la función `refetch` repite íntegramente el SQL de `fetchX(false)`:

```ts
// AccountsContext.tsx:34-42 — copia exacta de fetchAccounts(false)
const refetch = useCallback(async () => {
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('active', true)
    .order('name');
  setAccounts(data || []);
}, []);
```

`fetchAccounts(showLoading = false)` hace exactamente lo mismo cuando se llama sin loading. La duplicación significa que si alguna vez se ajusta el query (ej: agregar un filtro), hay que cambiarlo en dos lugares.

### Fix

```ts
// AccountsContext.tsx
const refetch = useCallback(() => fetchAccounts(false), [fetchAccounts]);

// TransactionsContext.tsx
const refetch = useCallback(() => fetchTransactions(false), [fetchTransactions]);
```

---

## 7. `.filter()` redundante en `useChat` tras filtro de DB

**Archivo:** `frontend/src/hooks/useChat.ts:20-22`

### Descripcion

```ts
// useChat.ts:13-22
const { data } = await supabase
  .from('conversations')
  .select('role, content, created_at')
  .in('role', ['user', 'assistant'])  // DB ya filtra solo user/assistant
  .order('created_at', { ascending: true });

if (data) {
  const chatMsgs = data
    .filter((m) => m.role === 'user' || m.role === 'assistant')  // redundante
    .map(...)
}
```

El `.in('role', ['user', 'assistant'])` de Supabase garantiza que solo llegan filas con esos roles. El `.filter()` en JS nunca descarta ningún elemento.

### Fix

```ts
const chatMsgs = data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
```

---

## 8. `reduce` inline en Sidebar cuando existe `getTotalBalance()` en contexto

**Archivo:** `frontend/src/components/Layout/Sidebar.tsx:89`

### Descripcion

```tsx
// Sidebar.tsx:89
<span>Total: {formatMoney(accounts.reduce((sum, a) => sum + a.balance, 0))}</span>
```

`AccountsContext` ya expone `getTotalBalance()` que hace exactamente este cálculo. El contexto se desestructura en la línea 11 pero no se incluye `getTotalBalance`.

### Fix

```tsx
// Sidebar.tsx:11
const { accounts, loading: accountsLoading, getTotalBalance } = useAccountsContext();

// Sidebar.tsx:89
<span>Total: {formatMoney(getTotalBalance())}</span>
```
