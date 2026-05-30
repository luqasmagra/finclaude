# Performance

Fetches duplicados, re-renders innecesarios y calculos sin memoizar.

---

## 1. `useAccounts` se instancia dos veces en paralelo

**Archivos:**
- `frontend/src/components/Layout/Sidebar.tsx:11`
- `frontend/src/components/Dashboard/DashboardPage.tsx:12`

### Descripcion

Cuando el usuario esta en la pantalla del Dashboard, se realizan **dos fetches independientes a la tabla `accounts`**: uno desde `Sidebar` y otro desde `DashboardPage`.

```ts
// Sidebar.tsx:11
const { accounts, loading: accountsLoading } = useAccounts();

// DashboardPage.tsx:12
const { accounts, getTotalBalance } = useAccounts();
```

Cada llamada a `useAccounts()` crea su propia instancia del hook con su propio estado y su propio `useEffect` que ejecuta el fetch. No hay cache compartido entre instancias.

### Impacto

- 2 queries a Supabase en lugar de 1 en cada carga del dashboard
- Si una cuenta se crea/modifica, hay que coordinar el refresco entre dos instancias separadas (relacionado con Bug 1 en [01-bugs.md](./01-bugs.md))

### Fix propuesto

Levantar el estado de `accounts` a `App.tsx` y pasarlo por props (o crear un `AccountsContext`). Esto tambien resuelve el Bug 1 ya que el refresco seria en un solo lugar:

```tsx
// App.tsx
function AppContent() {
  const { accounts, loading, refetch, getTotalBalance } = useAccounts();

  return (
    <>
      <Sidebar accounts={accounts} onAddAccount={...} onAccountCreated={refetch} />
      <DashboardPage accounts={accounts} getTotalBalance={getTotalBalance} />
      <ChatPage accounts={accounts} onTransactionCreated={refetch} />
    </>
  );
}
```

---

## 2. Calculos agregados de `useTransactionsByPeriod` sin `useMemo`

**Archivo:** `frontend/src/hooks/useTransactions.ts:65-92`

### Descripcion

Cuatro calculos sobre el array `transactions` se ejecutan en cada render del hook, sin memoizacion:

```ts
// useTransactions.ts:65-92
const totalExpenses = transactions
  .filter(t => t.amount < 0)
  .reduce((sum, t) => sum + Math.abs(t.amount), 0);

const totalIncome = transactions
  .filter(t => t.amount > 0)
  .reduce((sum, t) => sum + t.amount, 0);

const byCategory = transactions
  .filter(t => t.amount < 0)
  .reduce((acc, t) => { ... }, {} as Record<string, number>);

const byMonth = transactions.reduce((acc, t) => { ... }, {} as Record<...>);
```

Estos calculos iteran sobre `transactions` cuatro veces en cada render. Si el usuario tiene 12 meses de historial (periodo `1y`), pueden ser varios cientos de transacciones procesadas en cada re-render de `DashboardPage`.

### Fix

Envolver cada calculo en `useMemo` con `[transactions]` como dependencia:

```ts
const totalExpenses = useMemo(
  () => transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
  [transactions]
);

const totalIncome = useMemo(
  () => transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
  [transactions]
);

const byCategory = useMemo(
  () => transactions.filter(t => t.amount < 0).reduce((acc, t) => {
    const cat = t.categories?.name || 'Sin categoria';
    acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>),
  [transactions]
);

const byMonth = useMemo(
  () => transactions.reduce((acc, t) => {
    const month = t.date.substring(0, 7);
    if (!acc[month]) acc[month] = { income: 0, expenses: 0 };
    if (t.amount > 0) acc[month].income += t.amount;
    else acc[month].expenses += Math.abs(t.amount);
    return acc;
  }, {} as Record<string, { income: number; expenses: number }>),
  [transactions]
);
```

Ademas, con `useMemo`, los valores como `categoryData` y `monthlyData` en `DashboardPage` tampoco se recalcularían a menos que `transactions` cambie.

---

## 3. `renderMarkdown` re-parsea en cada render

**Archivo:** `frontend/src/components/Chat/ChatPage.tsx:38-40,74`

### Descripcion

```tsx
// ChatPage.tsx:38-40
const renderMarkdown = (text: string) => {
  return marked.parse(text) as string;
};

// Usado dentro del .map():
dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
```

En cada re-render de `ChatPage` (ej: cuando el usuario escribe en el textarea), todos los mensajes del historial son re-parseados por `marked`. Con conversaciones largas esto es trabajo innecesario.

### Fix

Memoizar el resultado del parse por mensaje. La forma mas simple es usar un componente separado con `useMemo` o `React.memo`:

```tsx
// Opcion simple: componente con memo
const MarkdownMessage = React.memo(({ content }: { content: string }) => (
  <div
    className="prose prose-invert prose-sm max-w-none"
    dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
  />
));

// En ChatPage.tsx:
{msg.role === 'assistant' ? (
  <MarkdownMessage content={msg.content} />
) : (
  <p className="whitespace-pre-wrap">{msg.content}</p>
)}
```

`React.memo` evita que el mensaje se re-renderice si `content` no cambio.

---

## 4. `compressHistory` re-consulta conversations ya cargadas

**Archivo:** `supabase/functions/chat/index.ts:53-97`

### Descripcion

Al final de cada request en la Edge Function `chat`, si se alcanza el umbral de compresión, se llama a `compressHistory()`. Esta función hace su propia query a `conversations`:

```ts
// chat/index.ts:460 — primera carga del historial
const history = await loadConversationHistory();

// ... procesamiento, saveMessage x2 ...

// chat/index.ts:487-489 — se usa history.count (correcto)
if (history.count + 2 >= COMPRESS_THRESHOLD) {
  await compressHistory();  // ← adentro hace OTRA query a conversations
}

// compressHistory (línea 53):
async function compressHistory() {
  const { data } = await supabase
    .from('conversations')
    .select('role, content')
    .order('created_at', { ascending: true });  // query duplicada
  ...
}
```

Esto agrega un round-trip a la DB en cada request que alcance el umbral. Los datos recién cargados por `loadConversationHistory` más los 2 mensajes nuevos ya son suficientes.

### Fix

Pasar los datos como parámetro:

```ts
async function compressHistory(
  data: { role: string; content: string }[]
) {
  // usar data directamente en lugar de re-consultar
  let summaryIdx = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].role === 'summary') { summaryIdx = i; break; }
  }
  const messagesToCompress = data.slice(summaryIdx + 1);
  if (messagesToCompress.length < COMPRESS_THRESHOLD) return;
  // ... resto igual
}

// En el handler:
if (history.count + 2 >= COMPRESS_THRESHOLD) {
  await compressHistory([...history.messages]);
}
```

---

## 5. `BalanceChart` recalcula `data` sin `useMemo`

**Archivo:** `frontend/src/components/Dashboard/BalanceChart.tsx:18-32`

### Descripcion

La variable `data` se construye directamente en el cuerpo del componente con un `reduce` + `sort` + `map` sobre el array `transactions`. En el período `1y` esto puede iterar sobre 200+ transacciones. El cálculo se repite en cada re-render de `DashboardPage` aunque `transactions` no haya cambiado.

### Fix

```ts
import { useMemo } from 'react';

export function BalanceChart({ transactions }: BalanceChartProps) {
  const data = useMemo(() =>
    transactions.reduce((acc, tx) => {
      const month = tx.date.substring(0, 7);
      const existing = acc.find(d => d.month === month);
      if (existing) {
        existing.balance += tx.amount;
      } else {
        acc.push({ month, balance: tx.amount });
      }
      return acc;
    }, [] as { month: string; balance: number }[])
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({ ...d, month: formatMonth(d.month) })),
  [transactions]);

  if (data.length === 0) { ... }
  // ...
}
