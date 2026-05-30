# Codigo muerto

Archivos, funciones y exports que no se utilizan en ninguna parte del proyecto activo.

---

## 1. `frontend/src/counter.ts` — archivo de scaffolding Vite

**Archivo:** `frontend/src/counter.ts`

### Descripcion

Este archivo es el ejemplo de contador que Vite genera automaticamente al crear un nuevo proyecto. Nunca fue eliminado del scaffolding inicial.

```ts
// counter.ts
export function setupCounter(element: HTMLButtonElement) {
  let counter = 0
  const setCounter = (count: number) => {
    counter = count
    element.innerHTML = `Count is ${counter}`
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(0)
}
```

No se importa en ningun archivo del proyecto. No tiene relacion con la app de finanzas.

**Accion:** Eliminar el archivo.

---

## 2. `index.html` (raiz del proyecto) — frontend legacy Vanilla JS

**Archivo:** `index.html` (880 lineas)

### Descripcion

Es la version original de la app: un unico archivo HTML con Vanilla JS + Supabase CDN + marked.js. Implementa:

- Auth con Supabase
- Sidebar con cuentas, categorias y transacciones
- Chat con la Edge Function `chat`
- Modal de agregar cuenta
- Modal de importar extracto (parse + preview + confirm)
- Historial del chat cargado desde DB

El proyecto fue migrado a React + TypeScript (carpeta `frontend/`). Este archivo ya no se sirve desde ningun servidor ni build tool del proyecto React. El `CLAUDE.md` lo marca explicitamente como "legacy frontend (vanilla JS, no se usa)".

**Nota:** Antes de eliminar, verificar que el modal de importacion de React este implementado (ver [01-bugs.md Bug 2](./01-bugs.md#bug-2)), ya que `index.html` es actualmente la unica forma de usar esa feature.

**Accion:** Eliminar una vez confirmado que el frontend React lo reemplaza completamente.

---

## 3. `clearMessages` y `reloadHistory` en `useChat` — exports nunca consumidos

**Archivo:** `frontend/src/hooks/useChat.ts:71-75`

### Descripcion

El hook `useChat` exporta dos valores que ningun consumidor usa:

```ts
// useChat.ts:71-75
const clearMessages = useCallback(() => {
  setMessages([]);
}, []);

return { messages, loading, sendMessage, clearMessages, reloadHistory: loadHistory };
```

`ChatPage.tsx` (unico consumidor) solo desestructura `{ messages, loading, sendMessage }`.

```tsx
// ChatPage.tsx:14
const { messages, loading, sendMessage } = useChat(accounts);
```

`clearMessages` y `reloadHistory` nunca se llaman desde ningun componente.

**Accion:** Eliminar ambos de la clausula `return`. Si en el futuro se necesitan (ej: boton "limpiar chat"), se pueden recuperar.

```ts
// useChat.ts — return simplificado
return { messages, loading, sendMessage };
```

---

## 4. `refetch` en `useAccounts` y `useTransactions` — export parcialmente muerto

**Archivos:**
- `frontend/src/hooks/useAccounts.ts:37`
- `frontend/src/hooks/useTransactions.ts:26`

### Descripcion

Ambos hooks exportan `refetch`:

```ts
// useAccounts.ts:37
return { accounts, loading, refetch: fetchAccounts, createAccount, getTotalBalance };

// useTransactions.ts:26
return { transactions, loading, refetch: fetchTransactions };
```

Ningun componente llama `refetch` externamente. En `useAccounts`, `fetchAccounts` se llama internamente en `createAccount`, pero el alias `refetch` nunca se usa afuera. En `useTransactions`, `refetch` no se usa en ningun lugar.

**Nota:** Estos exports se vuelven utiles cuando se resuelva el Bug 1 (ver [01-bugs.md](./01-bugs.md#bug-1)), ya que `refetch` seria el mecanismo de refresco tras una transaccion. Por eso se recomienda **mantenerlos** por ahora y resolver el bug primero.

---

## 5. `TrendingDown` y `Wallet` — imports sin usar en `DashboardPage`

**Archivo:** `frontend/src/components/Dashboard/DashboardPage.tsx:8`

### Descripcion

```ts
// DashboardPage.tsx:8
import { TrendingUp, TrendingDown, Wallet, PieChart, BarChart3 } from 'lucide-react';
```

`TrendingUp`, `PieChart` y `BarChart3` se usan en el JSX. `TrendingDown` y `Wallet` nunca aparecen en ninguna línea del componente.

**Accion:** Eliminarlos del import.

```ts
import { TrendingUp, PieChart, BarChart3 } from 'lucide-react';
```

---

## 6. Función `useTransactions` standalone sin consumidores

**Archivo:** `frontend/src/hooks/useTransactions.ts:6-42`

### Descripcion

`useTransactions.ts` exporta dos funciones:

1. `useTransactions` (líneas 6-42) — lista reciente con limit 50
2. `useTransactionsByPeriod` (líneas 44-117) — transacciones filtradas por período

`useTransactionsByPeriod` es usada en `DashboardPage.tsx`. Pero `useTransactions` **no tiene ningún consumidor**: `TransactionsContext.tsx` reimplementó exactamente la misma lógica de forma independiente, y `Sidebar.tsx` consume el contexto.

```ts
// Nadie importa esto en ningún archivo del proyecto:
export function useTransactions() { ... }
```

**Accion:** Eliminar la función `useTransactions` de `useTransactions.ts`. Conservar `useTransactionsByPeriod` ya que sí se usa.

---

## 7. `useAccounts.ts` — archivo completo sin consumidores

**Archivo:** `frontend/src/hooks/useAccounts.ts`

### Descripcion

Tras resolver Bug #18 (migrar `AddAccountModal` e `ImportStatementModal` a `useAccountsContext`), ningún componente importa ya `useAccounts` del archivo `hooks/useAccounts.ts`. El archivo define la misma lógica que `AccountsContext.tsx` pero en forma de hook local, y fue reemplazado por el contexto compartido.

```ts
// Ningún archivo del proyecto tiene este import:
import { useAccounts } from '../../hooks/useAccounts';
```

**Accion:** Eliminar el archivo `frontend/src/hooks/useAccounts.ts`.

---

## 8. `framer-motion` — dependencia instalada sin usar

**Archivo:** `frontend/package.json:29`

```json
"framer-motion": "^12.38.0"
```

No hay ningún `import ... from 'framer-motion'` en ningún archivo del proyecto.

**Accion:**
```bash
npm uninstall framer-motion
```

---

## 9. `react-router-dom` — dependencia instalada sin usar

**Archivo:** `frontend/package.json:35`

```json
"react-router-dom": "^7.14.2"
```

La app usa navegación por estado (tab `dashboard`/`chat` en `App.tsx`), no React Router. No hay ningún `import ... from 'react-router-dom'` en ningún archivo.

**Accion:**
```bash
npm uninstall react-router-dom
```

---

## 10. `@supabase/auth-helpers-react` — dependencia instalada sin usar

**Archivo:** `frontend/package.json:23`

```json
"@supabase/auth-helpers-react": "^0.15.0"
```

La autenticación está implementada con un hook propio (`useAuth.tsx`) que usa `@supabase/supabase-js` directamente. No hay ningún import de `auth-helpers-react` en el código.

**Accion:**
```bash
npm uninstall @supabase/auth-helpers-react
```
