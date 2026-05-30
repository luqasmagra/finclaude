# Finanzas Personales — Documentación Técnica

> App personal de contabilidad en lenguaje natural. El usuario interactúa por chat; Claude clasifica el intent, extrae datos estructurados y consulta la base de datos.

---

## Tabla de contenidos

1. [Visión general](#1-visión-general)
2. [Arquitectura](#2-arquitectura)
3. [Schema de base de datos](#3-schema-de-base-de-datos)
4. [Edge Functions](#4-edge-functions)
   - [chat](#41-chat--función-principal)
   - [import-statement](#42-import-statement)
   - [mp-webhook](#43-mp-webhook)
5. [Uso de Claude — modelos, tools y estrategias](#5-uso-de-claude--modelos-tools-y-estrategias)
6. [Frontend](#6-frontend)
7. [Estado actual y roadmap](#7-estado-actual-y-roadmap)

---

## 1. Visión general

| | |
|---|---|
| **Stack** | React 19 + TypeScript + Vite + Tailwind CSS · Supabase Auth/DB/Edge Functions · Anthropic Claude |
| **Proyecto Supabase** | `aqkymmcfktldheqgckja` |
| **Modelos** | Haiku 4.5 (clasificación y parseo) · Sonnet 4.6 (análisis y extracción masiva) |
| **Auth** | Supabase Auth email/password + @supabase/auth-helpers-react, usuario único |
| **Punto de entrada AI** | Todo el procesamiento de Claude ocurre en Edge Functions (servidor), nunca en el cliente |

El usuario escribe en lenguaje natural. El frontend envía el texto a `/functions/v1/chat`. La Edge Function determina si es un registro de movimiento o una consulta, y actúa en consecuencia.

---

## 2. Arquitectura

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

**Decisiones de diseño:**
- `verify_jwt: false` en todas las Edge Functions — app personal, sin superficie de ataque relevante.
- El cliente pasa `accounts[]` al llamar a `chat` para evitar una query extra en la Edge Function cuando se registra una transacción.
- Claude recibe los IDs reales de cuentas y categorías en el prompt; él elige cuál usar según el texto.

---

## 3. Schema de base de datos

### `categories`
| columna | tipo | descripción |
|---------|------|-------------|
| id | uuid PK | |
| name | text | ej. "Comida", "Transporte" |
| color | text | hex |
| icon | text | emoji |

8 categorías por defecto. Se pasan a Claude como lista `- Nombre (id: xxx)` para que asigne la más apropiada.

### `accounts`
| columna | tipo | descripción |
|---------|------|-------------|
| id | uuid PK | |
| name | text | |
| type | text | `cash` / `bank` / `digital` |
| currency | text | ej. "ARS" |
| balance | numeric | mantenido por trigger |
| active | bool | |

### `transactions`
| columna | tipo | descripción |
|---------|------|-------------|
| id | uuid PK | |
| account_id | uuid → accounts | |
| amount | numeric | negativo = egreso, positivo = ingreso |
| description | text | extraída por Claude del texto libre |
| category_id | uuid → categories | asignada por Claude |
| date | date | extraída del texto o fecha actual |
| source | text | `manual` / `import` / `mercadopago` |
| external_id | text UNIQUE | ID del pago en MP — garantiza idempotencia del webhook |
| created_at | timestamptz | |

### `conversations`
| columna | tipo | descripción |
|---------|------|-------------|
| id | uuid PK | |
| role | text | `user` / `assistant` / `summary` |
| content | text | texto del mensaje o resumen comprimido |
| created_at | timestamptz | |

Usada por la Edge Function `chat` para mantener historial persistente entre sesiones. Cada 8 mensajes, Haiku comprime el historial en un registro con `role = 'summary'`.

### Trigger: `trg_update_account_balance`
Se ejecuta en `INSERT`, `UPDATE` y `DELETE` sobre `transactions`. Recalcula y actualiza `accounts.balance` automáticamente. El frontend no necesita gestionar el balance manualmente.

### RLS
Las 4 tablas tienen RLS habilitado con políticas `FOR ALL TO authenticated`. Solo el usuario autenticado puede leer y escribir sus datos.

---

## 4. Edge Functions

### 4.1 `chat` — función principal

**Endpoint:** `POST /functions/v1/chat`
**Body:** `{ text: string, accounts: { id, name, type }[] }`
**Deploy:** v3 en Supabase

#### Flujo completo

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
(Haiku)               (Sonnet, loop agéntico)
   │         │
   ▼         ▼
INSERT DB    SELECT DB (múltiples rounds)
   │         │
   └────┬────┘
        ▼
Response { type, message, [transaction] }
```

#### Step 1 — `classifyIntent(text)`

Llama a Haiku con `max_tokens: 16`. El modelo responde una sola palabra: `transaction` o `query`. No usa tools — es una clasificación binaria pura por texto.

```
"gasté 500 en facturas" → "transaction"
"cuánto gasté este mes" → "query"
```

Si la respuesta no contiene ninguna de las dos palabras, se trata como `query` (fallback seguro).

#### Step 2a — `handleTransaction(text, accounts)`

Usa **Haiku con `tool_choice` forzado** (`{ type: "tool", name: "register_transaction" }`). Esto garantiza que Claude siempre llame a la tool y devuelva JSON estructurado, nunca texto libre.

**Tool `register_transaction`:**
```typescript
{
  amount: number,          // negativo para gastos
  description: string,
  category_id?: string,    // Claude elige de la lista provista
  account_id: string,      // Claude elige de la lista provista
  date: string,            // YYYY-MM-DD, default hoy
  needs_clarification: boolean,
  clarification_question?: string
}
```

El prompt incluye la fecha de hoy, la lista de cuentas con IDs y la lista de categorías con IDs. Claude es quien decide qué cuenta y categoría corresponden al texto.

Si `needs_clarification: true`, la función devuelve la pregunta sin insertar nada. Si no, inserta en `transactions` y devuelve un mensaje de confirmación formateado en Markdown.

#### Step 2b — `handleQuery(question)`

Loop agéntico con **Sonnet**. La función mantiene un array `messages[]` y sigue llamando a la API mientras `stop_reason === 'tool_use'`.

**Tools disponibles:**

| Tool | Descripción | Parámetros |
|------|-------------|------------|
| `get_accounts` | Todas las cuentas activas con balance | ninguno |
| `get_transactions` | Transacciones filtradas | `date_from`, `date_to`, `account_name`, `category_name`, `limit` |
| `get_spending_by_category` | Agrupado por categoría en un período | `date_from`, `date_to` (required) |

El loop permite que Sonnet encadene múltiples herramientas. Por ejemplo: primero llama `get_accounts` para ver los nombres, luego `get_transactions` filtrando por cuenta. Termina cuando `stop_reason === 'end_turn'` y devuelve el texto final como Markdown.

#### Historial de conversación (v3)

La versión deployada en Supabase persiste el historial en la tabla `conversations`. Cada 8 mensajes, Haiku genera un resumen que reemplaza el historial anterior (`role = 'summary'`), evitando que el contexto crezca indefinidamente. El historial se carga al inicio de cada llamada para que Sonnet tenga contexto de la sesión.

---

### 4.2 `import-statement`

**Endpoint:** `POST /functions/v1/import-statement`
**Dos modos en el mismo endpoint**, determinados por el body.

#### Modo parse

**Body:** `{ text: string, account_id: string }`

Llama a **Sonnet con `tool_choice` forzado** (`extract_transactions`). El modelo recibe el texto completo del extracto bancario y extrae todas las transacciones en un solo llamado.

**Tool `extract_transactions`:**
```typescript
{
  transactions: [{
    amount: number,      // negativo débitos, positivo créditos
    description: string,
    category_id?: string,
    date: string         // YYYY-MM-DD
  }]
}
```

Se usa Sonnet (no Haiku) porque los extractos bancarios tienen formato variable, pueden ser largos y requieren comprensión de contexto para inferir si un movimiento es débito o crédito.

La respuesta incluye las transacciones parseadas **y un preview** calculado en la Edge Function:

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

El frontend muestra el preview en un modal antes de confirmar. El usuario puede revisar antes de que se persista algo.

#### Modo confirm

**Body:** `{ confirm: true, transactions: [...] }`

Bulk insert directo en `transactions` con `source: "import"`. No llama a Claude. Devuelve `{ imported: number }`.

#### Por qué dos pasos

El usuario ve exactamente qué va a importarse y puede cancelar. Si el parseo falla o produce basura, nada se escribe en la DB.

---

### 4.3 `mp-webhook`

**Endpoint:** `POST /functions/v1/mp-webhook`
**Trigger:** Mercado Pago envía una notificación HTTP cuando ocurre un evento de pago.
**Deploy:** v6 en Supabase

Esta función **no usa Claude**. Es un receptor de webhooks puro que registra pagos de MP automáticamente en la DB.

#### Flujo

```
MP POST { type: "payment", data: { id: "12345" } }
        │
        ▼
validateSignature()        ← HMAC-SHA256 contra x-signature header
        │
        ▼
SELECT transactions WHERE external_id = paymentId
        │ (ya existe → 200 OK, no procesar)
        ▼
GET api.mercadopago.com/v1/payments/:id
        │
        ▼
status === "approved" ?    ← descartar pendientes, rechazados, etc.
        │
        ▼
payer.id === MP_USER_ID ?  ← egreso si somos el pagador, ingreso si somos el cobrador
        │
        ▼
INSERT transactions { source: "mercadopago", external_id: paymentId }
```

#### Validación de firma (HMAC-SHA256)

MP envía el header `x-signature` con el formato `ts=...,v1=...`. La función reconstruye el template `id:{paymentId};request-id:{xRequestId};ts:{ts}` y lo firma con `MP_WEBHOOK_SECRET` usando Web Crypto API. Si la firma no coincide, devuelve 401.

#### Idempotencia

Antes de consultar la API de MP, se verifica si ya existe un registro con ese `external_id` en `transactions` (columna UNIQUE). Si existe, se devuelve 200 sin hacer nada. Esto protege contra reenvíos y reintentos de MP.

#### Determinación de ingreso/egreso

```typescript
const isPayer = String(payment.payer?.id) === MP_USER_ID;  // "384898465"
const amount = isPayer ? -payment.transaction_amount : payment.transaction_amount;
```

No hay heurística de texto: la dirección del dinero se determina comparando el `payer.id` del pago con el `MP_USER_ID` hardcodeado como constante en la función.

#### Limitación conocida

Las transferencias billetera → billetera dentro de MP **no disparan webhook**. Estos movimientos requieren sincronización manual.

#### Secrets requeridos

| Secret | Descripción |
|--------|-------------|
| `MP_ACCESS_TOKEN` | Token productivo de MP, para consultar `/v1/payments/:id` |
| `MP_WEBHOOK_SECRET` | Clave de validación HMAC provista por MP al configurar el webhook |

---

## 5. Uso de Claude — modelos, tools y estrategias

### Selección de modelo por tarea

| Tarea | Modelo | Razón |
|-------|--------|-------|
| Clasificar intent (transaction/query) | Haiku | Clasificación binaria, 16 tokens, latencia mínima |
| Parsear transacción de texto libre | Haiku | Extracción estructurada simple, tool_choice forzado |
| Responder consultas financieras | Sonnet | Razonamiento multi-step, loop agéntico |
| Extraer transacciones de extracto | Sonnet | Contexto largo, variabilidad de formatos bancarios |
| Comprimir historial de conversación | Haiku | Resumen simple, costo bajo |

### Estrategias de tool_choice

| Estrategia | Dónde se usa | Efecto |
|------------|--------------|--------|
| `{ type: "tool", name: "..." }` | `handleTransaction`, `parseStatement` | Fuerza una tool call específica. Claude no puede responder en texto libre. Garantiza JSON estructurado. |
| `{ type: "auto" }` (default) | `handleQuery` | Sonnet decide si usar tools o no, y cuáles encadenar. Habilita el loop agéntico. |

### Loop agéntico en handleQuery

```
messages = [{ role: "user", content: pregunta }]

while stop_reason === "tool_use":
    response = claude(messages)
    messages.push({ role: "assistant", content: response.content })

    results = await Promise.all(toolUses.map(runQueryTool))
    messages.push({ role: "user", content: toolResults })

return respuesta_final_en_texto
```

Claude puede encadenar N herramientas en N rounds. En la práctica, las consultas simples resuelven en 1-2 rounds; las consultas complejas (ej. "comparame los gastos de enero vs febrero") pueden requerir 3+.

### Cómo Claude identifica cuentas y categorías

Se le pasan los registros reales de la DB como parte del prompt de usuario:

```
Cuentas disponibles:
- Efectivo (id: abc-123, tipo: cash)
- Cuenta Bancaria (id: def-456, tipo: bank)

Categorías disponibles:
- Comida (id: ghi-789)
- Transporte (id: jkl-012)
```

Claude resuelve la ambigüedad semántica ("pagué con la tarjeta" → elige la cuenta `bank`) y devuelve el ID directo. No hay lógica de matching en el código de la Edge Function.

---

## 6. Frontend

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS

**Dependencias principales:**
- `@supabase/supabase-js` — cliente DB
- `@supabase/auth-helpers-react` — hooks de autenticación
- `marked.js` — render de Markdown en mensajes del asistente
- `react-router-dom` — routing
- `recharts` — gráficos
- `lucide-react` — iconos
- `framer-motion` — animaciones
- `date-fns` — manejo de fechas

### Estructura

```
src/
├── App.tsx              ← componente principal con AuthProvider
├── main.tsx             ← entry point
├── pages/
│   └── LoginPage.tsx    ← pantalla de login/registro
├── components/
│   ├── Dashboard/       ← vista de dashboard
│   ├── Chat/            ← interfaz de chat
│   ├── Accounts/        ← componentes de cuentas y modal
│   └── Layout/          ← Header, Sidebar, etc.
├── hooks/
│   └── useAuth.tsx      ← hook de autenticación con Supabase
├── lib/
│   └── supabase.ts      ← cliente de Supabase configurado
└── utils/               ← funciones auxiliares
```

### Pantallas

| Pantalla | Descripción |
|----------|-------------|
| LoginPage | Login con email/password via Supabase Auth + @supabase/auth-helpers-react |
| Dashboard | Vista con tabs Dashboard/Chat, sidebar con cuentas y transacciones |

### Componentes principales

**App.tsx:** Envuelve la app en `<AuthProvider>` y gestiona el flujo de autenticación. Muestra `<LoginPage>` si no hay usuario, o `<Header>` + `<Sidebar>` + vista activa (Dashboard/Chat) si hay sesión.

**useAuth hook:** Expone `user`, `loading` y `signOut()` usando `@supabase/auth-helpers-react`.

**Sidebar:** Cuentas activas con balance (actualizado en tiempo real post-transacción; balance negativo en rojo), categorías con color e icono, últimas 5 transacciones.

**Chat:** Un único `fetch()` a `/functions/v1/chat` por mensaje. El frontend pasa `accounts[]` en el body (ya los tiene del sidebar). Las respuestas del asistente se renderizan con `marked.js`.

### Modales

| Modal | Trigger |
|-------|---------|
| AddAccountModal | Botón en sidebar |
| Importar extracto | Botón "Importar" en header (pendiente de migración) |
| Preview de importación | Tras parsear el extracto, antes de confirmar (pendiente de migración) |

### Estilos

- **Tailwind CSS** para estilos utilitarios
- Custom CSS en `index.css` para variables de color y estilos globales
- Variables CSS personalizadas para tema oscuro: `--bg`, `--surface`, `--accent`, `--green`, `--red`, etc.

### Dev workflow

```bash
cd frontend
npm run dev      # Vite dev server (hot reload)
npm run build    # TypeScript check + Vite build
npm run preview  # Preview production build
```

### Seguridad

- Datos de usuario sanitizados antes de renderizar en JSX (React sanitiza por defecto)
- `dangerouslySetInnerHTML` solo usado con output de `marked.js` (controlado)

---

## 7. Estado actual y roadmap

### Funcional y deployado

- [x] Auth con Supabase
- [x] Chat con clasificación de intent (Haiku)
- [x] Registro de transacciones por lenguaje natural (Haiku + tool use forzado)
- [x] Consultas financieras con loop agéntico (Sonnet)
- [x] Historial de conversación persistente con resumen dinámico (v3)
- [x] Importación de extractos bancarios — parse + preview + confirm (Sonnet)
- [x] Trigger de balance automático en DB
- [x] RLS en todas las tablas
- [x] Integración Mercado Pago via webhook (HMAC-SHA256, idempotencia, ingreso/egreso automático)

### Pendiente

- [ ] Cargar historial del chat al iniciar la app (conversations desde DB → frontend)
- [ ] Botón sync manual MP (transferencias billetera→billetera no generan webhook)
- [ ] Subir a GitHub

### Edge Functions eliminadas (legacy)

- ~~`parse-transaction`~~ — reemplazada por el path `transaction` dentro de `chat`
- ~~`query-finances`~~ — reemplazada por el path `query` dentro de `chat`

