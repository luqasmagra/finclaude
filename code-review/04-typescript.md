# TypeScript — Tipos, imports y anotaciones

---

## 1. `React.FormEvent` / `React.KeyboardEvent` sin importar `React` como namespace

**Archivos:**
- `frontend/src/pages/LoginPage.tsx:13`
- `frontend/src/components/Chat/ChatPage.tsx:22,31`
- `frontend/src/components/Accounts/AddAccountModal.tsx:18`

### Descripcion

Los tres archivos usan tipos del namespace `React.*` en sus anotaciones, pero ninguno importa `React` como default o namespace:

```ts
// LoginPage.tsx:1 — solo importa useState
import { useState } from 'react';
// ...
const handleSubmit = async (e: React.FormEvent) => {  // Error: 'React' no esta en scope
```

```ts
// ChatPage.tsx:1
import { useState, useRef, useEffect } from 'react';
// ...
const handleSubmit = async (e: React.FormEvent) => {   // Error
const handleKeyDown = (e: React.KeyboardEvent) => {    // Error
```

```ts
// AddAccountModal.tsx:1
import { useState } from 'react';
// ...
const handleSubmit = async (e: React.FormEvent) => {  // Error
```

Con el JSX transform automatico de React 17+, no es necesario `import React from 'react'` para el JSX en si. Pero usar `React.FormEvent` como tipo requiere que `React` este en scope como namespace o default import. Sin ese import, TypeScript deberia reportar error `Cannot find name 'React'`.

### Fix

Importar los tipos directamente desde `'react'` con named imports:

```ts
// LoginPage.tsx
import { useState, FormEvent } from 'react';
// ...
const handleSubmit = async (e: FormEvent) => {
```

```ts
// ChatPage.tsx
import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
// ...
const handleSubmit = async (e: FormEvent) => {
const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
```

```ts
// AddAccountModal.tsx
import { useState, FormEvent } from 'react';
// ...
const handleSubmit = async (e: FormEvent) => {
```

---

## 2. `Transaction.source` tipo incorrecto

**Archivo:** `frontend/src/types.ts:25`

### Descripcion

La interfaz `Transaction` define `source` como:

```ts
// types.ts:25
source: 'manual' | 'import' | 'webhook';
```

Sin embargo, la Edge Function `mp-webhook` inserta `'mercadopago'` como valor de `source`:

```ts
// supabase/functions/mp-webhook/index.ts:129
const { error } = await supabase.from('transactions').insert({
  account_id: account.id,
  amount,
  description,
  date,
  source: 'mercadopago',  // no coincide con el tipo del frontend
  external_id: paymentId,
});
```

El valor `'webhook'` nunca se escribe en la DB. El valor real es `'mercadopago'`.

### Fix

```ts
// types.ts
source: 'manual' | 'import' | 'mercadopago';
```

---

## 3. Seis imports no usados de `date-fns`

**Archivo:** `frontend/src/hooks/useTransactions.ts:4`

### Descripcion

```ts
// useTransactions.ts:4
import {
  subDays,
  subMonths,
  startOfMonth,   // no se usa
  endOfMonth,     // no se usa
  startOfDay,     // no se usa
  endOfDay,       // no se usa
  parseISO,       // no se usa
  isWithinInterval // no se usa
} from 'date-fns';
```

Solo `subDays` y `subMonths` se usan en el hook. Los otros seis probablemente quedaron de una implementacion anterior donde los calculos de rango de fechas se hacian en el cliente con estas funciones, antes de delegar el filtrado a Supabase con `.gte()` y `.lte()`.

### Fix

```ts
import { subDays, subMonths } from 'date-fns';
```

Ademas del ruido en el codigo, estos imports agregan 6 funciones de `date-fns` al bundle aunque tree-shaking deberia eliminarlas. Con TypeScript strict o `noUnusedLocals: true` en tsconfig, esto generaria errores de compilacion.

---

## 4. `Conversation` interface nunca usada en el frontend

**Archivo:** `frontend/src/types.ts:31-35`

### Descripcion

```ts
// types.ts:31-35
export interface Conversation {
  role: 'user' | 'assistant' | 'summary';
  content: string;
  created_at: string;
}
```

Esta interface no se importa ni usa en ningun componente o hook del frontend. La tabla `conversations` se consulta en `useChat.ts` pero el tipo del resultado no se anota explicitamente con `Conversation`.

Es un hallazgo menor: no genera errores, pero es un tipo huerfano. Se puede dejar como documentacion del schema o eliminar si se prefiere mantener solo lo que se usa.

---

## 5. `handleKeyDown` pasa `KeyboardEvent` a `handleSubmit` que espera `FormEvent`

**Archivo:** `frontend/src/components/Chat/ChatPage.tsx:42-46`

### Descripcion

```ts
// ChatPage.tsx:30
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  // ...
};

// ChatPage.tsx:42-46
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit(e);  // ← KeyboardEvent pasado donde se espera FormEvent
  }
};
```

`KeyboardEvent` y `FormEvent` son tipos distintos en React. TypeScript reporta un error de tipos aquí. En runtime funciona accidentalmente porque ambos tienen `.preventDefault()`, pero el tipado es incorrecto.

### Fix

En `handleKeyDown`, llamar a `sendMessage` directamente en lugar de pasar por `handleSubmit`:

```ts
const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    sendMessage(text).then((response) => {
      if (response?.type === 'transaction' && onTransactionCreated) {
        onTransactionCreated();
      }
    });
  }
};
```

Alternativamente, extraer la lógica de envío a una función compartida que ambos handlers llamen.

---

## 6. Tipo `any` en formatters de Recharts

**Archivos:**
- `frontend/src/components/Dashboard/BalanceChart.tsx:58`
- `frontend/src/components/Dashboard/CategoryPieChart.tsx:43`
- `frontend/src/components/Dashboard/MonthlyBarChart.tsx:47`

### Descripcion

Los tres tooltips de Recharts usan `any` para tipar el valor del formatter:

```ts
// BalanceChart.tsx:58
formatter={(value: any) => [formatMoney(Number(value)), 'Balance']}

// CategoryPieChart.tsx:43
formatter={(value: any) => [formatMoney(Number(value)), 'Gastado']}

// MonthlyBarChart.tsx:47
formatter={(value: any, name: any) => [
  formatMoney(Number(value)),
  name === 'income' ? 'Ingresos' : 'Egresos'
]}
```

### Fix

Recharts tipea el formatter como `(value: number | string, name: string) => ReactNode | [ReactNode, ReactNode]`. Reemplazar `any` por los tipos correctos:

```ts
// BalanceChart.tsx
formatter={(value: number | string) => [formatMoney(Number(value)), 'Balance']}

// CategoryPieChart.tsx
formatter={(value: number | string) => [formatMoney(Number(value)), 'Gastado']}

// MonthlyBarChart.tsx
formatter={(value: number | string, name: string) => [
  formatMoney(Number(value)),
  name === 'income' ? 'Ingresos' : 'Egresos'
]}
