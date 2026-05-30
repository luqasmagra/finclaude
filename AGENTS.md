# AGENTS.md — Finanzas Personales

## Project

Single-user personal finance app. Natural-language chat interface. All Claude API calls run server-side in Supabase Edge Functions (Deno/TypeScript). Frontend is a single `index.html` (vanilla JS, no build tools).

**Supabase project:** `aqkymmcfktldheqgckja`

## Commands

- **Deploy an Edge Function:** `npx supabase functions deploy <name> --project-ref aqkymmcfktldheqgckja`
- **Frontend dev:** `cd frontend && npm run dev` (Vite dev server)
- **Frontend build:** `cd frontend && npm run build` (TypeScript + Vite build)
- **Frontend preview:** `cd frontend && npm run preview` (preview production build)
- ESLint 9 configured (`frontend/eslint.config.js`) with @typescript-eslint + eslint-plugin-react-hooks.
- No test runner ni formatter configurados.
- GitHub: https://github.com/luqasmagra/finclaude

## Architecture

```
frontend/ (React + TypeScript + Vite)
  ├── src/
  │   ├── App.tsx           ← Main app with auth flow
  │   ├── main.tsx          ← Entry point
  │   ├── pages/            ← LoginPage
  │   ├── components/       ← Dashboard, Chat, Accounts, Layout
  │   ├── hooks/            ← useAuth (Supabase Auth)
  │   ├── lib/              ← supabase client
  │   └── utils/            ← helpers
  ├── Vite (dev server + build)
  ├── Tailwind CSS (styling)
  ├── marked.js (Markdown rendering)
  └── fetch() → Edge Functions

supabase/functions/
  ├── chat/index.ts              ← main entry: classify → transaction or query (deployed v12)
  ├── import-statement/index.ts  ← two-mode: parse + confirm (Sonnet)
  ├── mp-webhook/index.ts        ← Mercado Pago webhook receiver (deployed v6, no Claude)
  └── mp-sync/index.ts           ← manual MP sync for wallet-to-wallet transfers (deployed v13, no Claude)

DB tables: accounts, transactions, categories, conversations
  └── RLS enabled on all 4 (FOR ALL TO authenticated)
  └── Trigger `trg_update_account_balance` auto-updates accounts.balance on tx INSERT/UPDATE/DELETE
```

## Model selection

| Task | Model | Why |
|------|-------|-----|
| Classify intent (transaction vs query) | Haiku | Binary classification, 16 tokens |
| Parse transaction from free text | Haiku | Simple extraction, tool_choice forced |
| Answer financial queries (agentic loop) | Sonnet | Multi-step reasoning |
| Parse bank statements | Sonnet | Variable formats, long context |
| Compress conversation history | Haiku | Simple summarization |

## Edge Function details

**chat**: Uses Haiku for `classifyIntent()`, then either Haiku with forced `tool_choice` for transactions, or Sonnet agentic loop for queries. Conversation history persisted in `conversations` table; compressed every 8 messages. Client passes `accounts[]` in body to avoid extra DB query.

**import-statement**: Two modes in one endpoint. Parse mode uses Sonnet with forced `tool_choice` to extract transactions. Returns preview for user confirmation. Confirm mode does bulk insert (no Claude call).

**mp-webhook**: No Claude. HMAC-SHA256 signature validation, idempotency via `external_id` UNIQUE column. Determines income vs expense by comparing `payer.id` to hardcoded `MP_USER_ID`. Wallet-to-wallet MP transfers do NOT trigger webhooks.

**All Edge Functions have `verify_jwt: false`** — personal app, no attack surface concern.

## Rules (MUST FOLLOW)

1. Read the file before editing. Never rewrite from scratch.
2. Confirm with the user before architectural changes.
3. Do not add unrequested features.
4. Make minimal, surgical changes.
5. Before creating a new Edge Function, confirm the schema with the user.

## Tech stack constraints (DO NOT CHANGE without explicit request)

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Backend: Supabase Edge Functions (Deno/TypeScript)
- Auth: Supabase Auth (email/password) + @supabase/auth-helpers-react
- DB: Supabase PostgreSQL
- AI: Anthropic Claude (Haiku for simple tasks, Sonnet for analysis)
- Dev tools: Vite dev server, TypeScript 6, PostCSS

## Pending tasks

- Load chat history from DB on app init
- Manual MP sync button in frontend (mp-sync Edge Function already exists at v13)
