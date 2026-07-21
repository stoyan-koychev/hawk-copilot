/**
 * Configuration — every knob is an env var, documented in .env.example.
 * No settings framework: a frozen record read once at startup. If you can
 * read this file, you know everything Hawk can be configured to do.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// Node 22 replaces the dotenv dependency; a missing .env throws, which is fine.
try {
  process.loadEnvFile();
} catch {
  // no .env in cwd — env vars may still be set in the shell
}

export type Settings = {
  // --- LLM: pick a provider, set its key. See src/loop/providers.ts.
  readonly provider: string;
  // Explicit overrides (optional): key, endpoint, and model ids. Left empty,
  // the provider's own key env var and default models are used.
  readonly apiKey: string;
  readonly baseUrl: string | null;
  readonly model: string;
  // Cheap model used by the retrieval gate and the consolidation summarizer.
  readonly smallModel: string;

  // --- Home: where Hawk keeps its state (memory DB, calendar, outbox, traces).
  // Defaults to ./.hawk next to where you run it, so you can open every file
  // it writes. Local-first means you can always look.
  readonly home: string;

  // --- Loop guardrails
  readonly maxIterations: number;
  // Headroom matters for REASONING models: they spend output tokens thinking
  // before the answer, so a low cap makes them hit max_tokens mid-thought and
  // return an EMPTY reply. 8192 leaves room to think AND answer.
  readonly maxTokens: number;
  // Working memory is a SLIDING WINDOW: only the last N turns go into the
  // prompt. Older turns aren't lost — they're in state.db, distilled into
  // facts by consolidation, and pulled back by the retrieval gate.
  readonly historyTurns: number;

  // --- Memory
  readonly consolidateEvery: number;
  readonly retrievalTopK: number;

  // --- Reliability (HAWK_LLM_TIMEOUT is seconds in .env; stored as ms here)
  readonly llmTimeoutMs: number;
  // --- Org knowledge base (Supabase Postgres + pgvector); empty = retrieval unavailable
  readonly databaseUrl: string;
  // --- Tracing backend. "file" writes JSONL locally (default); "db" writes to a
  // SEPARATE Postgres (HAWK_TRACE_DATABASE_URL) so it works on read-only/serverless
  // hosts without touching the retrieval DB; "off" disables it. HAWK_TRACE=off forces off.
  readonly traceBackend: "off" | "file" | "db";
  // Dedicated traces database (a separate Supabase project). Empty = no db backend.
  readonly traceDatabaseUrl: string;
};

const int = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultHome = (): string => {
  // import.meta.dirname exists under real Node ESM (tsx, node) but is
  // undefined inside bundlers (webpack/Next) — there, HAWK_HOME must be set.
  const dir: string | undefined = import.meta.dirname;
  return dir
    ? path.resolve(dir, "../.hawk")
    : path.resolve(process.cwd(), ".hawk");
};

const traceBackendFrom = (traceDatabaseUrl: string): Settings["traceBackend"] => {
  if (["0", "off", "false"].includes((process.env.HAWK_TRACE ?? "").toLowerCase())) return "off";
  return traceDatabaseUrl ? "db" : "file";
};

export const loadSettings = (overrides: Partial<Settings> = {}): Settings => {
  const traceDatabaseUrl = process.env.HAWK_TRACE_DATABASE_URL ?? "";
  return Object.freeze({
    provider: process.env.HAWK_PROVIDER ?? "openai",
    apiKey: process.env.HAWK_API_KEY ?? "",
    baseUrl: process.env.HAWK_BASE_URL || null,
    model: process.env.HAWK_MODEL ?? "",
    smallModel: process.env.HAWK_SMALL_MODEL ?? "",
    home: process.env.HAWK_HOME ?? defaultHome(),
    maxIterations: int("HAWK_MAX_ITERATIONS", 10),
    maxTokens: int("HAWK_MAX_TOKENS", 8192),
    historyTurns: int("HAWK_HISTORY_TURNS", 12),
    consolidateEvery: int("HAWK_CONSOLIDATE_EVERY", 6),
    retrievalTopK: int("HAWK_RETRIEVAL_TOP_K", 4),
    llmTimeoutMs: int("HAWK_LLM_TIMEOUT", 120) * 1000,
    databaseUrl: process.env.DATABASE_URL ?? "",
    traceDatabaseUrl,
    traceBackend: traceBackendFrom(traceDatabaseUrl),
    ...overrides,
  });
};

export const ensureHome = (home: string): string => {
  mkdirSync(home, { recursive: true });
  mkdirSync(path.join(home, "traces"), { recursive: true });
  mkdirSync(path.join(home, "outbox"), { recursive: true });
  return home;
};
