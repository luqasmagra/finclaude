# Personal Finance — Claude Assistant

## Description

Personal finance tracking app. The user interacts in natural language with Claude agents to record expenses, check balances, import bank statements, and generate reports.

## Learning goal

Experiment with Claude agents, tool use, structured output, and Supabase Edge Functions as a secure backend.

## Database (Supabase)

Project ref: aqkymmcfktldheqgckja (same project as scraper-ar)

### Tables

- `accounts`: user accounts (id, name, type, currency, balance, active)
- `transactions`: movements (id, account_id, amount, description, category_id→categories, date, source, external_id UNIQUE, created_at)
- `categories`: expense categories (id, name, color, icon)
- `conversations`: chat history (id, role[user/assistant/summary], content, created_at)

---

## Architecture

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Auth:** Supabase Auth (email/password) via @supabase/supabase-js
- **Backend:** Supabase Edge Functions (TypeScript/Deno) — Claude API calls from the server
- **DB:** Supabase PostgreSQL (tables: accounts, transactions, categories, conversations)
- **Claude:** Haiku for parsing/categorization, Sonnet for analysis and reports

## Main flow

1. User writes in natural language or uploads a PDF
2. Frontend calls an Edge Function, or writes directly to Supabase for manual UI actions
3. Edge Function calls Claude with the required tools (tool use)
4. Claude executes the action (insert transaction, query DB, generate report)
5. Result returns to the frontend

## File Structure

```
finanzas/
├── CLAUDE.md                   <- this file
├── README.md                   <- full technical documentation
├── index.html                  <- legacy frontend (vanilla JS, unused)
├── frontend/                   <- React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── App.tsx            ← main component with auth flow
│   │   ├── main.tsx           ← entry point
│   │   ├── pages/             ← LoginPage
│   │   ├── components/        ← Dashboard, Chat, Accounts, Transactions, Import, Layout, UI
│   │   ├── context/           ← accounts, transactions, toast providers
│   │   ├── hooks/             ← useAuth (Supabase Auth)
│   │   ├── lib/               ← supabase client
│   │   └── utils/             ← helpers
│   ├── index.html             ← HTML template for Vite
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── supabase/
│   └── functions/
│       ├── chat/              ← classifies intent + records transaction or queries DB
│       ├── import-statement/  ← parses bank statement (parse + confirm mode)
│       ├── mp-webhook/        ← receives Mercado Pago webhooks
│       └── mp-sync/           ← manual MP sync (wallet-to-wallet transfers)
└── .claude/
    ├── agents/
    │   ├── accessibility.md
    │   ├── analyst.md
    │   ├── model-updater.md
    │   └── security-reviewer.md
    └── skills/
        ├── check-logs/
        ├── db-query/
        ├── deploy-functions/
        ├── frontend-design/
        ├── prompt-engineer/
        ├── vercel-react-best-practices/
        └── web-design-guidelines/
```

---

## Agents

| Agent | Trigger | Function |
|-------|---------|----------|
| `accessibility` | "a11y", "accesibilidad", modals/forms/dialogs | Reviews WCAG, keyboard navigation, ARIA, focus, and contrast in the React frontend |
| `analyst` | "cuánto", "gasté", "balance", "resumen" | Queries DB and answers questions in natural language |
| `model-updater` | editing Edge Functions | Audits model IDs in supabase/functions/ and reports stale ones |
| `security-reviewer` | reviewing mp-webhook, chat, RLS | Reviews security: HMAC, JWT, RLS, SQL injection, XSS |

---

## Behavior rules (MUST FOLLOW)

1. Read the file before any edit. Never rewrite from scratch.
2. Confirm with AskUserQuestion before architectural changes.
3. Do not add unrequested features.
4. Make minimal, surgical changes.
5. Before creating an Edge Function, confirm the schema with the user.

## Tech Stack (DO NOT CHANGE without explicit request)

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Backend: Supabase Edge Functions (Deno/TypeScript)
- Auth: Supabase Auth (email/password) via @supabase/supabase-js
- DB: Supabase PostgreSQL
- AI: Anthropic Claude (Haiku for simple tasks, Sonnet for analysis)
- Dev tools: Vite dev server, TypeScript 6, PostCSS
