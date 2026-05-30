# Personal Finance — Technical Documentation

> Personal accounting app in natural language. The user interacts via chat; Claude classifies intent, extracts structured data, and queries the database.

---

## Table of contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Database schema](#3-database-schema)
4. [Edge Functions](#4-edge-functions)
   - [chat](#41-chat--main-function)
   - [import-statement](#42-import-statement)
   - [mp-webhook](#43-mp-webhook)
   - [mp-sync](#44-mp-sync)
5. [Claude usage — models, tools, and strategies](#5-claude-usage--models-tools-and-strategies)
6. [Frontend](#6-frontend)
7. [Current state and roadmap](#7-current-state-and-roadmap)

---

## 1. Overview

|                      |                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| **Stack**            | React 19 + TypeScript + Vite + Tailwind CSS · Supabase Auth/DB/Edge Functions · Anthropic Claude |
| **Supabase project** | `aqkymmcfktldheqgckja`                                                                           |
| **Models**           | Haiku 4.5 (classification and parsing) · Sonnet 4.6 (analysis and bulk extraction)               |
| **Auth**             | Supabase Auth email/password + @supabase/auth-helpers-react, single user                         |
| **AI entry point**   | All Claude processing runs in Edge Functions (server-side), never on the client                  |

The user writes in natural language. The frontend sends the text to `/functions/v1/chat`. The Edge Function determines whether it's a transaction record or a query, and acts accordingly.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Vite + Tailwind)            │
│                                                             │
│  src/                                                       │
│  ├── App.tsx (auth flow)                                    │
│  ├── components/ (Dashboard, Chat, Accounts, Layout)       │
│  ├── hooks/ (useAuth)                                       │
│  └── lib/ (supabase client)                                 │
│                                                             │
│  @supabase/auth-helpers-react ──► Auth (session token)      │
│  fetch() ──────────────────────► /functions/v1/chat         │
│  fetch() ──────────────────────► /functions/v1/import-st... │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Edge Functions (Deno / TypeScript)                │
│                                                             │
│  chat                import-statement    mp-webhook         │
│  ├─ classifyIntent()  ├─ parseStatement() ├─ validateSig()  │
│  ├─ handleTx()        └─ confirmImport()  └─ INSERT tx      │
│  └─ handleQuery()           │                    ▲          │
│         │                   │             MP API │          │
│         ▼                   ▼             (pago) │          │
│  Anthropic API        Anthropic API   Mercado Pago ────────►│
│  (Haiku / Sonnet)     (Sonnet)        api.mercadopago.com   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL                                        │
│  accounts · transactions · categories · conversations       │
└─────────────────────────────────────────────────────────────┘
```

**Design decisions:**

- `verify_jwt: false` on all Edge Functions — personal app, no relevant attack surface.
- The client passes `accounts[]` when calling `chat` to avoid an extra query in the Edge Function when recording a transaction.
- Claude receives the real account and category IDs in the prompt; it chooses which one to use based on the text.

---

## 3. Database schema

### `categories`

| column | type    | description                 |
| ------ | ------- | --------------------------- |
| id     | uuid PK |                             |
| name   | text    | e.g. "Comida", "Transporte" |
| color  | text    | hex                         |
| icon   | text    | emoji                       |

8 default categories. Passed to Claude as a list `- Name (id: xxx)` so it assigns the most appropriate one.

### `accounts`

| column   | type    | description                 |
| -------- | ------- | --------------------------- |
| id       | uuid PK |                             |
| name     | text    |                             |
| type     | text    | `cash` / `bank` / `digital` |
| currency | text    | e.g. "ARS"                  |
| balance  | numeric | maintained by trigger       |
| active   | bool    |                             |

### `transactions`

| column      | type              | description                                 |
| ----------- | ----------------- | ------------------------------------------- |
| id          | uuid PK           |                                             |
| account_id  | uuid → accounts   |                                             |
| amount      | numeric           | negative = expense, positive = income       |
| description | text              | extracted by Claude from free text          |
| category_id | uuid → categories | assigned by Claude                          |
| date        | date              | extracted from text or current date         |
| source      | text              | `manual` / `import` / `mercadopago`         |
| external_id | text UNIQUE       | MP payment ID — ensures webhook idempotency |
| created_at  | timestamptz       |                                             |

### `conversations`

| column     | type        | description                        |
| ---------- | ----------- | ---------------------------------- |
| id         | uuid PK     |                                    |
| role       | text        | `user` / `assistant` / `summary`   |
| content    | text        | message text or compressed summary |
| created_at | timestamptz |                                    |

Used by the `chat` Edge Function to maintain persistent history across sessions. Every 8 messages, Haiku compresses the history into a record with `role = 'summary'`, preventing context from growing indefinitely. History is loaded at the start of each call so Sonnet has session context.

### Trigger: `trg_update_account_balance`

Fires on `INSERT`, `UPDATE`, and `DELETE` on `transactions`. Recalculates and updates `accounts.balance` automatically. The frontend does not need to manage balances manually.

### RLS

All 4 tables have RLS enabled with `FOR ALL TO authenticated` policies. Only the authenticated user can read and write their data.

---

## 4. Edge Functions

### 4.1 `chat` — main function

**Endpoint:** `POST /functions/v1/chat`
**Body:** `{ text: string, accounts: { id, name, type }[] }`
**Deploy:** v12 on Supabase

#### Full flow

```
Request { text, accounts }
        │
        ▼
classifyIntent(text)          ← Haiku, 16 tokens max
        │
   ┌────┴────┐
   │         │
"transaction" "query"
   │         │
   ▼         ▼
handleTransaction()   handleQuery()
(Haiku)               (Sonnet, agentic loop)
   │         │
   ▼         ▼
INSERT DB    SELECT DB (multiple rounds)
   │         │
   └────┬────┘
        ▼
Response { type, message, [transaction] }
```

#### Step 1 — `classifyIntent(text)`

Calls Haiku with `max_tokens: 16`. The model replies with a single word: `transaction` or `query`. No tools — pure binary text classification.

```
"gasté 500 en facturas" → "transaction"
"cuánto gasté este mes" → "query"
```

If the response contains neither word, it falls back to `query` (safe default).

#### Step 2a — `handleTransaction(text, accounts)`

Uses **Haiku with forced `tool_choice`** (`{ type: "tool", name: "register_transaction" }`). This guarantees Claude always calls the tool and returns structured JSON, never free text.

**Tool `register_transaction`:**

```typescript
{
  amount: number,          // negative for expenses
  description: string,
  category_id?: string,    // Claude picks from the provided list
  account_id: string,      // Claude picks from the provided list
  date: string,            // YYYY-MM-DD, default today
  needs_clarification: boolean,
  clarification_question?: string
}
```

The prompt includes today's date, the list of accounts with IDs, and the list of categories with IDs. Claude decides which account and category match the text.

If `needs_clarification: true`, the function returns the question without inserting anything. Otherwise, it inserts into `transactions` and returns a Markdown-formatted confirmation message.

#### Step 2b — `handleQuery(question)`

Agentic loop with **Sonnet**. The function maintains a `messages[]` array and keeps calling the API while `stop_reason === 'tool_use'`.

**Available tools:**

| Tool                       | Description                      | Parameters                                                       |
| -------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `get_accounts`             | All active accounts with balance | none                                                             |
| `get_transactions`         | Filtered transactions            | `date_from`, `date_to`, `account_name`, `category_name`, `limit` |
| `get_spending_by_category` | Grouped by category in a period  | `date_from`, `date_to` (required)                                |

The loop lets Sonnet chain multiple tools. For example: first calls `get_accounts` to see account names, then `get_transactions` filtered by account. Ends when `stop_reason === 'end_turn'` and returns the final text as Markdown.

#### Conversation history (v3)

The version deployed on Supabase persists history in the `conversations` table. Every 8 messages, Haiku generates a summary that replaces the previous history (`role = 'summary'`), preventing context from growing indefinitely. History is loaded at the start of each call so Sonnet has session context.

---

### 4.2 `import-statement`

**Endpoint:** `POST /functions/v1/import-statement`
**Two modes in the same endpoint**, determined by the request body.

#### Parse mode

**Body:** `{ text: string, account_id: string }`

Calls **Sonnet with forced `tool_choice`** (`extract_transactions`). The model receives the full bank statement text and extracts all transactions in a single call.

**Tool `extract_transactions`:**

```typescript
{
  transactions: [{
    amount: number,      // negative debits, positive credits
    description: string,
    category_id?: string,
    date: string         // YYYY-MM-DD
  }]
}
```

Sonnet is used (not Haiku) because bank statements have variable formats, can be long, and require contextual understanding to infer whether a movement is a debit or credit.

The response includes the parsed transactions **and a preview** calculated in the Edge Function:

```typescript
{
  transactions: [...],
  preview: {
    count: number,
    date_from: string,
    date_to: string,
    total_expenses: number,
    total_income: number
  }
}
```

The frontend shows the preview in a modal before confirming. The user can review before anything is persisted.

#### Confirm mode

**Body:** `{ confirm: true, transactions: [...] }`

Direct bulk insert into `transactions` with `source: "import"`. Does not call Claude. Returns `{ imported: number }`.

#### Why two steps

The user sees exactly what will be imported and can cancel. If parsing fails or produces garbage, nothing is written to the DB.

---

### 4.3 `mp-webhook`

**Endpoint:** `POST /functions/v1/mp-webhook`
**Trigger:** Mercado Pago sends an HTTP notification when a payment event occurs.
**Deploy:** v6 on Supabase

This function **does not use Claude**. It is a pure webhook receiver that automatically records MP payments in the DB.

#### Flow

```
MP POST { type: "payment", data: { id: "12345" } }
        │
        ▼
validateSignature()        ← HMAC-SHA256 against x-signature header
        │
        ▼
SELECT transactions WHERE external_id = paymentId
        │ (already exists → 200 OK, skip)
        ▼
GET api.mercadopago.com/v1/payments/:id
        │
        ▼
status === "approved" ?    ← discard pending, rejected, etc.
        │
        ▼
payer.id === MP_USER_ID ?  ← expense if we are the payer, income if we are the collector
        │
        ▼
INSERT transactions { source: "mercadopago", external_id: paymentId }
```

#### Signature validation (HMAC-SHA256)

MP sends the `x-signature` header in the format `ts=...,v1=...`. The function reconstructs the template `id:{paymentId};request-id:{xRequestId};ts:{ts}` and signs it with `MP_WEBHOOK_SECRET` using the Web Crypto API. If the signature does not match, it returns 401.

#### Idempotency

Before querying the MP API, the function checks whether a record with that `external_id` already exists in `transactions` (UNIQUE column). If it exists, returns 200 without doing anything. This protects against MP retries and re-deliveries.

#### Income/expense determination

```typescript
const isPayer = String(payment.payer?.id) === MP_USER_ID; // "384898465"
const amount = isPayer
  ? -payment.transaction_amount
  : payment.transaction_amount;
```

No text heuristics: the direction of money is determined by comparing the payment's `payer.id` with the `MP_USER_ID` hardcoded as a constant in the function.

#### Known limitation

Wallet-to-wallet transfers within MP **do not trigger webhooks**. These movements require manual synchronization.

#### Required secrets

| Secret              | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `MP_ACCESS_TOKEN`   | MP production token, to query `/v1/payments/:id`                |
| `MP_WEBHOOK_SECRET` | HMAC validation key provided by MP when configuring the webhook |

---

### 4.4 `mp-sync`

**Endpoint:** `POST /functions/v1/mp-sync`
**Deploy:** v13 on Supabase

Manual sync of Mercado Pago payments. Supplements the webhook limitation: wallet-to-wallet transfers within MP **do not trigger the `mp-webhook`**. This function allows manually syncing those movements.

**Does not use Claude.** Queries the MP API directly and records pending payments in `transactions` with `source: "mercadopago"`, respecting idempotency via `external_id`.

---

## 5. Claude usage — models, tools, and strategies

### Model selection by task

| Task                                | Model  | Reason                                            |
| ----------------------------------- | ------ | ------------------------------------------------- |
| Classify intent (transaction/query) | Haiku  | Binary classification, 16 tokens, minimal latency |
| Parse transaction from free text    | Haiku  | Simple structured extraction, forced tool_choice  |
| Answer financial queries            | Sonnet | Multi-step reasoning, agentic loop                |
| Extract transactions from statement | Sonnet | Long context, variable bank statement formats     |
| Compress conversation history       | Haiku  | Simple summarization, low cost                    |

### tool_choice strategies

| Strategy                        | Used in                               | Effect                                                                                     |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `{ type: "tool", name: "..." }` | `handleTransaction`, `parseStatement` | Forces a specific tool call. Claude cannot reply in free text. Guarantees structured JSON. |
| `{ type: "auto" }` (default)    | `handleQuery`                         | Sonnet decides whether and which tools to chain. Enables the agentic loop.                 |

### Agentic loop in handleQuery

```
messages = [{ role: "user", content: question }]

while stop_reason === "tool_use":
    response = claude(messages)
    messages.push({ role: "assistant", content: response.content })

    results = await Promise.all(toolUses.map(runQueryTool))
    messages.push({ role: "user", content: toolResults })

return final_text_response
```

Claude can chain N tools in N rounds. In practice, simple queries resolve in 1-2 rounds; complex queries (e.g. "compare my spending in January vs February") may require 3+.

### How Claude identifies accounts and categories

Real DB records are passed as part of the user prompt:

```
Cuentas disponibles:
- Efectivo (id: abc-123, tipo: cash)
- Cuenta Bancaria (id: def-456, tipo: bank)

Categorías disponibles:
- Comida (id: ghi-789)
- Transporte (id: jkl-012)
```

Claude resolves semantic ambiguity ("pagué con la tarjeta" → picks the `bank` account) and returns the ID directly. There is no matching logic in the Edge Function code.

---

## 6. Frontend

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS

**Main dependencies:**

- `@supabase/supabase-js` — DB client
- `@supabase/auth-helpers-react` — auth hooks
- `marked.js` — Markdown rendering in assistant messages
- `react-router-dom` — routing
- `recharts` — charts
- `lucide-react` — icons
- `framer-motion` — animations
- `date-fns` — date handling

### Structure

```
src/
├── App.tsx              ← main component with AuthProvider
├── main.tsx             ← entry point
├── pages/
│   └── LoginPage.tsx    ← login/register screen
├── components/
│   ├── Dashboard/       ← dashboard view
│   ├── Chat/            ← chat interface
│   ├── Accounts/        ← account components and modal
│   └── Layout/          ← Header, Sidebar, etc.
├── hooks/
│   └── useAuth.tsx      ← authentication hook with Supabase
├── lib/
│   └── supabase.ts      ← configured Supabase client
└── utils/               ← helper functions
```

### Screens

| Screen    | Description                                                                |
| --------- | -------------------------------------------------------------------------- |
| LoginPage | Login with email/password via Supabase Auth + @supabase/auth-helpers-react |
| Dashboard | Tabbed view with Dashboard/Chat, sidebar with accounts and transactions    |

### Main components

**App.tsx:** Wraps the app in `<AuthProvider>` and manages the auth flow. Shows `<LoginPage>` if there is no user, or `<Header>` + `<Sidebar>` + active view (Dashboard/Chat) if there is a session.

**useAuth hook:** Exposes `user`, `loading`, and `signOut()` using `@supabase/auth-helpers-react`.

**Sidebar:** Active accounts with balance (updated in real time after a transaction; negative balance in red), categories with color and icon, last 5 transactions.

**Chat:** A single `fetch()` to `/functions/v1/chat` per message. The frontend passes `accounts[]` in the body (already available from the sidebar). Assistant responses are rendered with `marked.js`.

### Modals

| Modal            | Trigger                                                            |
| ---------------- | ------------------------------------------------------------------ |
| AddAccountModal  | Button in sidebar                                                  |
| Import statement | "Importar" button in header (pending migration)                    |
| Import preview   | After parsing the statement, before confirming (pending migration) |

### Styles

- **Tailwind CSS** for utility styles
- Custom CSS in `index.css` for color variables and global styles
- Custom CSS variables for dark theme: `--bg`, `--surface`, `--accent`, `--green`, `--red`, etc.

### Dev workflow

```bash
cd frontend
npm run dev      # Vite dev server (hot reload)
npm run build    # TypeScript check + Vite build
npm run preview  # Preview production build
```

### Security

- User data sanitized before rendering in JSX (React sanitizes by default)
- `dangerouslySetInnerHTML` only used with `marked.js` output (controlled)

---
