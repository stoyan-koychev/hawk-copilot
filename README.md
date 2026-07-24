# Hawk Copilot

A grounded **RAG assistant** for a product knowledge base: a hybrid-retrieval agent with a
tool-use loop, a streaming chat UI, and a full **evaluation and observability stack** (retrieval
A/B testing, LLM-as-judge, a release gate, and a live traces dashboard).

Ask a question and the agent searches the docs, reads a full page when needed, and answers only
from what it retrieved, with citations. Every turn is measured and traced.

---

## Features

- **Grounded** — answers are built from retrieved documentation and cite their sources; off-topic
  or unanswerable questions are declined, not guessed.
- **Measurable** — retrieval quality (recall@k, MRR) and answer quality (faithfulness,
  groundedness) are scored, and a release gate blocks regressions before deploy.
- **Observable** — every turn is traced step-by-step (tokens, latency, cost, PII-scrubbed
  messages) and surfaced on an ops dashboard.

---

## How it works

```
Browser (Next.js chat, SSE streaming)
        │
        ▼
Agent loop  ──reason──▶ LLM
   │        ◀─observe── tool results
   ├─ search_docs   ─▶ Hybrid retrieval (BM25-family ⊕ vector, fused by RRF)
   ├─ read_full_doc ─▶ Postgres + pgvector knowledge base
   └─ convert_currency
        │
        ▼
Tracing → separate Postgres → /ops dashboard
Evals (offline): retrieval A/B + LLM-as-judge → release gate
```

1. **Agent loop** (`src/loop/agent.ts`) — a reason → act → observe loop. The model can call tools,
   read the results, and call more tools, all within one turn, until it produces a final answer.
2. **Hybrid retrieval** (`src/retrieval/search.ts`) — a lexical signal (Postgres full-text,
   BM25-family) and a semantic signal (pgvector cosine over OpenAI embeddings) run in parallel and
   are fused with **Reciprocal Rank Fusion (RRF)**.
3. **Grounding** — retrieved passages are returned as a numbered list so the model cites by number
   (`[1] [2]`); the system prompt (`src/system-prompt.ts`) enforces scope and citation.
4. **Evals** — `pnpm ab` compares retrieval strategies; the judge suite grades answers; `pnpm gate`
   ties it together as a pass/fail release check.
5. **Observability** — a per-turn tracer (`src/ops/db-tracer.ts`) writes each step to a dedicated
   Postgres; the `/ops` pages read it back.

For a deeper walk-through of the evals, see [`EVALS-NOTES.md`](EVALS-NOTES.md). For a
portfolio-style overview, see [`PROJECT-SUMMARY.md`](PROJECT-SUMMARY.md).

---

## Repository layout

This is a **pnpm monorepo**: the agent lives at the root as the `@hawk/agent` package, and the web
app (`web/`) depends on it.

```
.
├── src/                    # @hawk/agent — the agent, retrieval, tools, evals engine
│   ├── agent.ts            # makeAgent(): wires client + pool + tools + system prompt
│   ├── main.ts             # CLI entry (pnpm chat)
│   ├── system-prompt.ts    # SOUL / PERSONALITY / GUARDRAILS
│   ├── config.ts           # all settings (env-var driven, read once)
│   ├── types.ts            # shared types (messages, events, observer)
│   ├── loop/               # the agent loop + provider clients
│   │   ├── agent.ts        #   runLoop() — reason/act/observe
│   │   ├── client.ts       #   resolveSettings + getClient
│   │   ├── providers.ts    #   provider registry (openai | anthropic)
│   │   └── openai-compat.ts
│   ├── retrieval/          # the RAG core
│   │   ├── search.ts       #   sparse / dense / hybrid + RRF
│   │   ├── embed.ts        #   query embeddings (OpenAI)
│   │   ├── db.ts           #   pg pool
│   │   └── config.ts       #   k, RRF constant
│   ├── tools/              # the agent's tools
│   │   ├── registry.ts     #   Tool type + executeTool
│   │   ├── search-docs.ts  #   search_docs (emits retrieval events)
│   │   ├── read-doc.ts     #   read_full_doc
│   │   └── currency.ts     #   convert_currency
│   └── ops/                # evals + observability
│       ├── rag-metrics.ts  #   recall@k, MRR
│       ├── ab.ts           #   pnpm ab — retrieval A/B
│       ├── judge.ts        #   LLM-as-judge scoring
│       ├── release-gate.ts #   pnpm gate
│       ├── db-tracer.ts    #   per-turn tracing → Postgres
│       ├── trace-queries.ts#   dashboard queries + cost
│       ├── scrub.ts        #   PII redaction
│       ├── feedback.ts     #   thumbs up/down
│       ├── eval-store.ts   #   persist gate/AB runs
│       └── version.ts      #   configVersion() hash
│
├── evals/                  # the test/eval suites + dataset
│   ├── rag-dataset.jsonl   #   golden set (labeled by question style)
│   ├── helpers.ts          #   scripted fake LLM for offline tests
│   ├── deterministic/      #   free, no-LLM tests (part of pnpm test)
│   └── judge/              #   LLM-as-judge quality (needs an API key)
│
└── web/                    # Next.js chat UI + /ops dashboard
    ├── app/                #   routes: / (chat), /ops, /ops/evals, /api/*
    ├── components/         #   atomic design: base / blocks / layouts / views
    ├── util/               #   pure helpers + tests
    └── lib/                #   server-only data access for /ops
```

Start reading at **`src/loop/agent.ts`** (the loop) and **`src/retrieval/search.ts`** (the RAG),
then **`web/app/api/chat/route.ts`** (how the UI drives it).

---

## Getting started

### Prerequisites
- Node **22+** and **pnpm**
- A **Postgres + pgvector** database with the knowledge base ingested (Supabase works well)
- An **OpenAI** or **Anthropic** API key

### 1. Install
```bash
pnpm install
```

### 2. Configure
Copy the template and fill it in (`.env` at the repo root):
```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `HAWK_PROVIDER` | `openai` or `anthropic` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | key for the chosen provider |
| `HAWK_MODEL` | main chat model (provider default if empty) |
| `HAWK_SMALL_MODEL` | cheaper model used by the judge |
| `DATABASE_URL` | Postgres/pgvector knowledge base (use a **pooler** URL, port 6543, on serverless) |
| `HAWK_TRACE_DATABASE_URL` | *optional* — a **separate** Postgres for tracing; enables the DB tracer + `/ops` |

Tracing defaults to local JSONL files; set `HAWK_TRACE_DATABASE_URL` to enable the database tracer
and the `/ops` dashboard. `HAWK_TRACE=off` disables tracing entirely.

### 3. Run

**CLI chat:**
```bash
pnpm chat
```

**Web app (chat + /ops dashboard):**
```bash
cd web
pnpm dev        # http://localhost:3000  (chat) · /ops · /ops/evals
```

---

## Commands

| Command | What it does |
|---|---|
| `pnpm chat` | interactive CLI chat with the agent |
| `pnpm test` | deterministic evals + unit tests (no API cost) |
| `pnpm eval:judge` | LLM-as-judge answer-quality suite (needs a key) |
| `pnpm ab` | retrieval A/B: sparse vs dense vs hybrid (recall@k, MRR) |
| `pnpm gate` | release gate — deterministic + judge, pass/fail, writes a stamped report |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` / `pnpm format` | Biome |
| `cd web && pnpm dev` | run the Next.js UI |
| `cd web && pnpm build` | production build |

---

## Evaluation & observability at a glance

- **Retrieval A/B** (`pnpm ab`) — every golden case through sparse / dense / hybrid, scored with
  **recall@k** and **MRR**, broken down by question style (paraphrase / jargon / mixed).
- **LLM-as-judge** (`pnpm eval:judge`) — a second model grades **Faithfulness** and
  **Groundedness** against a threshold. Offline only — never in the user's live path.
- **Release gate** (`pnpm gate`) — deterministic tests must pass 100%, judge scores must clear
  threshold; each verdict is stamped with a **config-version hash** so it's attributable.
- **Tracing + `/ops`** — per-turn timelines, tokens, latency, cost, and thumbs feedback, with PII
  scrubbed before anything is stored.

See [`EVALS-NOTES.md`](EVALS-NOTES.md) for the full explanation of every metric and term.

---

## Tech stack

**Agent / backend:** TypeScript (ESM, Node 22), Anthropic & OpenAI SDKs, Postgres + **pgvector**,
hybrid **BM25-family + dense** retrieval with **RRF**.
**Web:** Next.js 16 (App Router, SSE streaming), React 19, Tailwind v4, GSAP, react-markdown.
**Quality/infra:** Vitest, LLM-as-judge, a release gate, custom tracing → Postgres, pnpm monorepo.

---

## Notes

- The **knowledge-base ingestion** (documents/chunks tables, `tsvector` + `embedding` columns) is
  provisioned in the database directly and is not part of this repo's source; the app is the
  **query + generation + evaluation** side.
- The lexical signal is Postgres full-text ranking (`ts_rank_cd`) — **BM25-family**, not literal
  Okapi BM25.
