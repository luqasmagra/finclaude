# Bugs — Impacto en funcionalidad

## Bug 1 — Sidebar y Dashboard no se actualizan tras registrar una transaccion por chat

**Severidad:** Alta
**Archivo:** `frontend/src/components/Chat/ChatPage.tsx:28`

### Descripcion

Cuando el usuario registra una transaccion via chat (ej: "gaste $2000 en almuerzo"), la Edge Function `chat` la inserta en la DB y responde con `{ type: 'transaction', message: '...' }`. Sin embargo, `ChatPage.tsx` ignora el valor de retorno de `sendMessage`:

```tsx
// ChatPage.tsx:27-28
const text = input;
setInput('');
await sendMessage(text);  // <-- retorno ignorado
```

Como resultado, la lista de transacciones en el `Sidebar` y los graficos del `DashboardPage` no se actualizan hasta que el usuario recarga la pagina.

### Contexto historico

En el frontend legacy (`index.html`), esto estaba resuelto: despues de cada transaccion exitosa se llamaba `loadData()`, que refrescaba cuentas, categorias y transacciones.

```js
// index.html:751-753
if (json.type === 'transaction') {
  loadData();
}
```

### Por que ocurre en React

`Sidebar` y `DashboardPage` tienen sus propias instancias de `useAccounts` y `useTransactions`. No hay estado compartido entre estos componentes y `ChatPage`. Cuando `useChat` registra una transaccion, los hooks de los otros componentes no se enteran.

### Fix propuesto

**Opcion A (minima):** Usar el retorno de `sendMessage` en `ChatPage` y llamar a un callback de refresco.

```tsx
// App.tsx — levantar refetch como prop
function AppContent() {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <>
      <Sidebar key={`sidebar-${refreshKey}`} onAddAccount={...} />
      <ChatPage onTransactionCreated={triggerRefresh} />
    </>
  );
}
```

```tsx
// ChatPage.tsx
const result = await sendMessage(text);
if (result?.type === 'transaction') {
  onTransactionCreated();
}
```

**Opcion B (mas limpia):** Levantar el estado de `accounts` y `transactions` a `App.tsx` y pasarlo por props, eliminando los fetches duplicados (ver tambien [05-performance.md](./05-performance.md#fetch-duplicado-de-accounts)).

---

## Bug 2 — Boton "Importar" en el Header no hace nada

**Severidad:** Alta
**Archivo:** `frontend/src/components/Layout/Header.tsx:45-48`

### Descripcion

El boton "Importar extracto" en el header del frontend React no tiene handler:

```tsx
// Header.tsx:45-48
<button className="flex items-center gap-2 px-3 py-1.5 text-sm ...">
  <Upload size={16} />
  Importar
</button>
```

No hay `onClick`, no abre ningun modal. La feature de importacion de extractos (Edge Function `import-statement`) esta implementada en el backend y funciona, pero es completamente inaccesible desde el frontend React.

### Estado actual

El modal de importacion existe unicamente en `index.html` (frontend legacy). El frontend React nunca implemento esta pantalla.

### Fix propuesto

Implementar el modal de importacion en React, similar a `AddAccountModal.tsx`. El flujo es:

1. Modal con selector de cuenta + textarea para el texto del extracto
2. POST a `/functions/v1/import-statement` con `{ text, account_id }`
3. Mostrar preview de transacciones encontradas
4. POST a `/functions/v1/import-statement` con `{ confirm: true, transactions }`
5. Llamar `onTransactionCreated()` para refrescar el estado

El backend ya esta listo. Solo falta el componente React.

Ademas, agregar el `onClick` al boton:

```tsx
// Header.tsx
interface HeaderProps {
  currentTab: 'dashboard' | 'chat';
  onTabChange: (tab: 'dashboard' | 'chat') => void;
  onImport: () => void;  // nuevo
}

<button onClick={onImport} className="...">
  <Upload size={16} />
  Importar
</button>
```

---

## Bug 17 — `tx is not defined` crashea toda transacción

**Severidad:** Crítica
**Archivo:** `supabase/functions/chat/index.ts:267`

### Descripcion

Al resolver la Calidad #2 (eliminar el alias inútil `const tx = transaction`), se eliminó la variable pero la línea que la usaba no fue actualizada:

```ts
// chat/index.ts:267 — estado actual (roto)
const cat = transaction.categories
  ? `${tx.categories.icon} ${tx.categories.name}`  // tx no existe → ReferenceError
  : 'Sin categoría';
```

Esto provoca que **toda transacción registrada exitosamente** lance `ReferenceError: tx is not defined` y devuelva 500 al frontend. El usuario ve un error aunque la transacción sí se insertó en la DB.

### Fix

```ts
const cat = transaction.categories
  ? `${transaction.categories.icon} ${transaction.categories.name}`
  : 'Sin categoría';
```

---

## Bug 18 — `AddAccountModal` y `ImportStatementModal` usan `useAccounts` directo

**Severidad:** Alta
**Archivos:**
- `frontend/src/components/Accounts/AddAccountModal.tsx:11`
- `frontend/src/components/Import/ImportStatementModal.tsx:19`

### Descripcion

Ambos modales instancian `useAccounts()` directamente en lugar de consumir el `AccountsContext` compartido:

```ts
// AddAccountModal.tsx:3,11
import { useAccounts } from '../../hooks/useAccounts';
const { createAccount } = useAccounts();

// ImportStatementModal.tsx:3,19
import { useAccounts } from '../../hooks/useAccounts';
const { accounts } = useAccounts();
```

**Consecuencia 1 — AddAccountModal:** Cuando el usuario crea una cuenta nueva, `useAccounts().createAccount()` inserta en DB y refresca su propia copia local. El `AccountsContext` (que es lo que el `Sidebar` y `DashboardPage` consumen) no se entera. El Sidebar no muestra la cuenta nueva hasta recargar la página.

**Consecuencia 2 — queries extra:** Los dos modales siempre están montados en `App.tsx`. Cada `useAccounts()` dispara su propio `useEffect` al montar → **2 queries extra** a `accounts` que no aportan nada (los datos ya están en el contexto).

### Fix

```ts
// AddAccountModal.tsx
import { useAccountsContext } from '../../context/AccountsContext';
const { createAccount } = useAccountsContext();

// ImportStatementModal.tsx
import { useAccountsContext } from '../../context/AccountsContext';
const { accounts } = useAccountsContext();
```

`AccountsContext.createAccount` ya llama `fetchAccounts(false)` internamente, por lo que el Sidebar se actualiza automáticamente al crear una cuenta.

---

## Bug 27 — `classifyIntent` definida dos veces; `correction` sin handler

**Severidad:** Crítica
**Archivo:** `supabase/functions/chat/index.ts:95-161`

### Descripcion

Hay dos definiciones de `async function classifyIntent` en el mismo archivo:

```ts
// Primera definición (líneas 95-125) — CÓDIGO MUERTO
async function classifyIntent(...): Promise<'transaction' | 'query'> {
  // prompt de 2 intents
  return result.includes('transaction') ? 'transaction' : 'query';
}

// Segunda definición (líneas 126-161) — LA QUE CORRE
async function classifyIntent(...): Promise<'transaction' | 'query' | 'correction'> {
  // prompt de 3 intents con instrucción de "correction"
  if (result.includes('correction')) return 'correction';
  return result.includes('transaction') ? 'transaction' : 'query';
}
```

En JavaScript/TypeScript la segunda declaración pisa a la primera. La primera (líneas 95-125) **nunca se ejecuta**. 

Además, el handler solo maneja dos intents:

```ts
// chat/index.ts:510-513
if (intent === 'transaction') {
  result = await handleTransaction(text, accounts ?? [], history);
} else {
  result = await handleQuery(text, history);  // 'correction' cae acá silenciosamente
}
```

Si el usuario dice algo como "cambiá el último gasto de $1000 a $1200", Claude clasifica como `'correction'` → cae al handler de query → responde como si fuera una pregunta en lugar de corregir la transacción.

### Origen

La segunda definición parece ser un WIP de una feature de corrección de transacciones que nunca se terminó. Se olvidó eliminar la primera.

### Fix

**Paso 1 — eliminar la primera definición (líneas 95-125):**
```ts
// Borrar completamente este bloque:
// ─── STEP 1: Clasificar intent con Haiku ────────────────
async function classifyIntent(
  text: string,
  history: { ... },
): Promise<'transaction' | 'query'> {
  // ...
}
```

**Paso 2 — decidir el destino de `'correction'`:**

Opción A (mínima — si la feature no está lista): simplificar la segunda definición para que no retorne `'correction'` y el comportamiento vuelva a ser predecible:
```ts
async function classifyIntent(...): Promise<'transaction' | 'query'> {
  // ...
  return result.includes('transaction') ? 'transaction' : 'query';
}
```

Opción B (completa): agregar manejo de `'correction'` en el handler, enviando el texto al mismo `handleTransaction` con contexto adicional sobre la corrección:
```ts
if (intent === 'transaction' || intent === 'correction') {
  result = await handleTransaction(text, accounts ?? [], history);
} else {
  result = await handleQuery(text, history);
}
```
