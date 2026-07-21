/**
 * DB tracer — writes the same events as the file tracer, but into a dedicated
 * Postgres (a separate Supabase project via HAWK_TRACE_DATABASE_URL). This works
 * on read-only/serverless hosts and never touches the retrieval DB.
 *
 * The loop's Observer is synchronous but inserts are async, so writes are
 * fire-and-forget and tracked in `pending`; flush() awaits them before the
 * serverless function freezes after the response.
 *
 * Concurrency: the ROUTE builds one tracer PER REQUEST (so `turn_id` is a safe
 * per-turn value, not a shared-singleton race), while the pg pool is memoized at
 * module level and reused across turns.
 */

import { randomUUID } from "node:crypto";
import type { Settings } from "../config.js";
import { makePool } from "../retrieval/db.js";
import type { DbPool } from "../retrieval/db.js";
import type { LoopEvent } from "../types.js";
import { scrub } from "./scrub.js";
import type { Tracer } from "./tracing.js";

// turn_id groups a turn's events; the btree indexes cover the timeline/type queries.
const ENSURE_SCHEMA = `
CREATE TABLE IF NOT EXISTS agent_traces (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  provider text,
  model text,
  turn_id uuid,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_traces_turn_idx ON agent_traces (turn_id);
CREATE INDEX IF NOT EXISTS agent_traces_type_ts_idx ON agent_traces (type, ts DESC);`;

const INSERT_ROW = `INSERT INTO agent_traces (type, provider, model, turn_id, data) VALUES ($1, $2, $3, $4, $5)`;

// One pool per process, and the schema created once per pool.
let sharedPool: DbPool | null = null;
const schemaByPool = new WeakMap<DbPool, Promise<unknown>>();

const ensureSchema = (pool: DbPool): Promise<unknown> => {
  let ready = schemaByPool.get(pool);
  if (!ready) {
    ready = pool.query(ENSURE_SCHEMA);
    schemaByPool.set(pool, ready);
  }
  return ready;
};

/** A per-turn tracer that persists to `agent_traces`. A pool can be injected
 * (tests); otherwise a module-shared pool is created from the connection string. */
export const makeDbTracer = (
  databaseUrl: string,
  settings: Settings,
  pool: DbPool = (sharedPool ??= makePool(databaseUrl)),
): Tracer => {
  const turnId = randomUUID();
  const pending = new Set<Promise<unknown>>();
  let turnStartedAt = 0;

  const enqueue = (
    type: string,
    data: Record<string, unknown>,
    provider: string | null = null,
    model: string | null = null,
  ): void => {
    const work = ensureSchema(pool)
      .then(() => pool.query(INSERT_ROW, [type, provider, model, turnId, JSON.stringify(data)]))
      .catch(() => {}) // tracing must never break a turn
      .finally(() => pending.delete(work));
    pending.add(work);
  };

  return Object.freeze({
    turnId,

    event: (kind: string, event: LoopEvent) => {
      if (kind === "text") return; // streaming deltas are for the live UI, not the trace
      if (kind === "llm") {
        // llm rows double as the cost ledger — they carry in/out tokens.
        enqueue(kind, event, settings.provider, settings.model || "");
      } else {
        enqueue(kind, event);
      }
    },

    turnStart: (userMessage: string) => {
      turnStartedAt = Date.now();
      enqueue("turn_start", { user_message: scrub(userMessage) });
    },

    // duration_ms is stored at write time so the read side never derives it.
    turnEnd: (reply: string, iterations: number) => {
      enqueue("turn_end", {
        reply: scrub(reply),
        iterations,
        duration_ms: turnStartedAt ? Date.now() - turnStartedAt : null,
      });
    },

    // Await outstanding inserts so they land before the function freezes / exits.
    flush: async () => {
      await Promise.allSettled([...pending]);
    },

    // Release the pool so the CLI process can exit.
    close: async () => {
      await pool.end();
      if (pool === sharedPool) sharedPool = null;
    },
  });
};
