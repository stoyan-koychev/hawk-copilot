/**
 * Read side of the trace layer — the "dashboard is SQL, not JSONL" queries over
 * agent_traces. Dollar cost stays derived in TS from a pricing table (prices
 * change; tokens are ground truth). Resilient: if the table doesn't exist yet
 * (empty traces DB), every query returns empty instead of throwing.
 */

import type { DbPool } from "../retrieval/db.js";

// USD per 1,000,000 tokens, [input, output]. EDIT to your provider's real rates.
const PRICING: Record<string, [number, number]> = {
  "gpt-4.1-mini": [0.4, 1.6],
  "gpt-5.3-chat-latest": [1.25, 10],
};
const DEFAULT_PRICING: [number, number] = [1, 3];

/** Dollar cost for a model's token counts — pure, so it's unit-tested. */
export const estimateCostUsd = (model: string, tokensIn: number, tokensOut: number): number => {
  const [inRate, outRate] = PRICING[model] ?? DEFAULT_PRICING;
  return (tokensIn / 1_000_000) * inRate + (tokensOut / 1_000_000) * outRate;
};

export type TurnRow = {
  turn_id: string;
  started: string | null;
  question: string | null;
  reply: string | null;
  duration_ms: number | null;
  tool_calls: number;
  tokens_in: number;
  tokens_out: number;
};

export type CostDayRow = { day: string; model: string; tokens_in: number; tokens_out: number };

export type Dashboard = {
  turns: TurnRow[];
  latency: { p50: number | null; p95: number | null };
  costByDay: (CostDayRow & { cost_usd: number })[];
};

const EMPTY: Dashboard = { turns: [], latency: { p50: null, p95: null }, costByDay: [] };

const TURNS_SQL = `
SELECT turn_id,
       max(ts)                       FILTER (WHERE type='turn_start')                 AS started,
       max(data->>'user_message')    FILTER (WHERE type='turn_start')                 AS question,
       max(data->>'reply')           FILTER (WHERE type='turn_end')                   AS reply,
       max((data->>'duration_ms')::int) FILTER (WHERE type='turn_end')               AS duration_ms,
       count(*)                      FILTER (WHERE type='tool')                       AS tool_calls,
       coalesce(sum((data->'usage'->>'in')::int)  FILTER (WHERE type='llm'), 0)       AS tokens_in,
       coalesce(sum((data->'usage'->>'out')::int) FILTER (WHERE type='llm'), 0)       AS tokens_out
FROM agent_traces
WHERE turn_id IS NOT NULL
GROUP BY turn_id
ORDER BY started DESC NULLS LAST
LIMIT $1`;

const LATENCY_SQL = `
SELECT percentile_cont(0.50) WITHIN GROUP (ORDER BY (data->>'duration_ms')::numeric) AS p50,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY (data->>'duration_ms')::numeric) AS p95
FROM agent_traces
WHERE type='turn_end' AND (data ? 'duration_ms') AND data->>'duration_ms' IS NOT NULL`;

const COST_SQL = `
SELECT date_trunc('day', ts)::date::text        AS day,
       coalesce(model, 'unknown')               AS model,
       coalesce(sum((data->'usage'->>'in')::int), 0)  AS tokens_in,
       coalesce(sum((data->'usage'->>'out')::int), 0) AS tokens_out
FROM agent_traces
WHERE type='llm'
GROUP BY 1, 2
ORDER BY 1 DESC
LIMIT 30`;

/** Delete every trace row. Best-effort (no-op if the table doesn't exist). */
export const purgeTraces = async (pool: DbPool): Promise<void> => {
  try {
    await pool.query("DELETE FROM agent_traces");
  } catch {
    // table not created yet — nothing to purge
  }
};

/** Everything the /ops dashboard shows, in one shot. Empty if the table is absent. */
export const fetchDashboard = async (pool: DbPool, turnLimit = 50): Promise<Dashboard> => {
  try {
    const [turns, latency, cost] = await Promise.all([
      pool.query(TURNS_SQL, [turnLimit]),
      pool.query(LATENCY_SQL),
      pool.query(COST_SQL),
    ]);
    return {
      turns: turns.rows as TurnRow[],
      latency: (latency.rows[0] as { p50: number | null; p95: number | null }) ?? {
        p50: null,
        p95: null,
      },
      costByDay: (cost.rows as CostDayRow[]).map((row) => ({
        ...row,
        cost_usd: estimateCostUsd(row.model, row.tokens_in, row.tokens_out),
      })),
    };
  } catch {
    // Table not created yet (empty traces DB) or transient error → empty dashboard.
    return EMPTY;
  }
};
