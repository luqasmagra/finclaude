# Finanzas Personales — Asistente con Claude

## Descripción

App personal de seguimiento financiero. El usuario interactúa en lenguaje natural con agentes Claude para registrar gastos, consultar balances, importar extractos bancarios y generar reportes.

## Objetivo de aprendizaje

Experimentar con agentes Claude, tool use, structured output, y Supabase Edge Functions como backend seguro.

## Database (Supabase)

Project ref: aqkymmcfktldheqgckja (mismo proyecto que scraper-ar)

### Tablas

- `accounts`: cuentas del usuario (id, name, type, currency, balance, active)
- `transactions`: movimientos (id, account_id, amount, description, category, date, source, created_at)
- `categories`: categorías de gastos (id, name, color, icon)

---

## Arquitectura

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Auth:** Supabase Auth (email/password) + @supabase/auth-helpers-react
- **Backend:** Supabase Edge Functions (TypeScript/Deno) — Claude API calls desde el servidor
- **DB:** Supabase PostgreSQL (tablas: accounts, transactions, categories, conversations)
- **Claude:** Haiku para parseo/categorización, Sonnet para análisis y reportes

## Flujo principal

1. Usuario escribe en lenguaje natural o sube un PDF
2. Frontend llama a una Edge Function
3. Edge Function llama a Claude con las herramientas necesarias (tool use)
4. Claude ejecuta la acción (insertar transacción, consultar DB, generar reporte)
5. Resultado vuelve al frontend

## File Structure

```
finanzas/
├── AGENTS.md                   <- instrucciones para OpenCode
├── CLAUDE.md                   <- este archivo
├── README.md                   <- documentación técnica completa
├── index.html                  <- legacy frontend (vanilla JS, no se usa)
├── frontend/                   <- frontend React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx            ← componente principal con flujo de auth
│   │   ├── main.tsx           ← entry point
│   │   ├── pages/             ← LoginPage
│   │   ├── components/        ← Dashboard, Chat, Accounts, Layout
│   │   ├── hooks/             ← useAuth (Supabase Auth)
│   │   ├── lib/               ← supabase client
│   │   └── utils/             ← helpers
│   ├── index.html             ← HTML template para Vite
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── supabase/
│   └── functions/
│       ├── chat/              ← clasifica intent + registra transacción o consulta DB
│       ├── import-statement/  ← parsea extracto bancario (modo parse + confirm)
│       └── mp-webhook/        ← recibe webhooks de Mercado Pago
└── .claude/
    ├── agents/
    │   ├── parser.md
    │   ├── analyst.md
    │   ├── categorizer.md
    │   └── reporter.md
    └── commands/
        ├── add-transaction.md
        ├── query.md
        ├── import-pdf.md
        └── report.md
```

---

## Agentes

| Agente | Trigger | Función |
|--------|---------|---------|
| `parser` | "agregar", "gasté", "cobré", "pagué" | Extrae transacción de texto libre y la inserta en DB |
| `analyst` | "cuánto", "gasté", "balance", "resumen" | Consulta DB y responde preguntas en lenguaje natural |
| `categorizer` | transacción sin categoría | Asigna categoría automáticamente por descripción |
| `reporter` | "reporte", "informe", "mes" | Genera reporte mensual con insights |

---

## Reglas de comportamiento (MUST FOLLOW)

1. Leer el archivo antes de cualquier edición. Nunca reescribir desde cero.
2. Confirmar con AskUserQuestion antes de cambios arquitecturales.
3. No agregar features no pedidas.
4. Cambios mínimos y quirúrgicos.
5. Antes de crear una Edge Function, confirmar el schema con el usuario.

## Tech Stack (NO CAMBIAR SIN PEDIDO EXPLÍCITO)

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Backend: Supabase Edge Functions (Deno/TypeScript)
- Auth: Supabase Auth (email/password) + @supabase/auth-helpers-react
- DB: Supabase PostgreSQL
- AI: Anthropic Claude (Haiku para tareas simples, Sonnet para análisis)
- Dev tools: Vite dev server, TypeScript 6, PostCSS
