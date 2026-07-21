/**
 * Eval store — persists offline quality results (the release gate and the
 * retrieval A/B) to the ops DB so a deployed dashboard can read them. Same shape
 * as db-tracer: auto-create tables (memoized per pool), best-effort resilient reads.
 */

import type { DbPool } from "../retrieval/db.js";

const ENSURE_GATE = `CREATE TABLE IF NOT EXISTS eval_runs (
  id bigserial PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now(),
  config text,
  deterministic text,
  judge text,
  suites jsonb NOT NULL
)`;

const ENSURE_AB = `CREATE TABLE IF NOT EXISTS ab_runs (
  id bigserial PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now(),
  config text,
  k int,
  cases int,
  results jsonb NOT NULL
)`;

// Create each table once per (pool, table) — memoized so repeated writes skip the DDL.
const poolTables = new WeakMap<DbPool, Map<string, Promise<unknown>>>();
const ensure = (pool: DbPool, ddl: string, table: string): Promise<unknown> => {
  let byTable = poolTables.get(pool);
  if (!byTable) {
    byTable = new Map();
    poolTables.set(pool, byTable);
  }
  let ready = byTable.get(table);
  if (!ready) {
    ready = pool.query(ddl);
    byTable.set(table, ready);
  }
  return ready;
};

// ---- writes (called from the CLI scripts) ----------------------------------

export type GateRecord = {
  config: string;
  deterministic: string;
  judge: string;
  suites: Record<string, { passed: number; failed: number }>;
  ran_at?: string;
};

export const recordGateRun = async (pool: DbPool, record: GateRecord): Promise<void> => {
  await ensure(pool, ENSURE_GATE, "eval_runs");
  await pool.query(
    `INSERT INTO eval_runs (ran_at, config, deterministic, judge, suites)
     VALUES (coalesce($1::timestamptz, now()), $2, $3, $4, $5)`,
    [record.ran_at ?? null, record.config, record.deterministic, record.judge, JSON.stringify(record.suites)],
  );
};

export type BucketScore = { recall: number; mrr: number; n: number };
export type AbResults = Record<string, Record<string, BucketScore | null>>;

export type AbRecord = { config: string; k: number; cases: number; results: AbResults };

export const recordAbRun = async (pool: DbPool, record: AbRecord): Promise<void> => {
  await ensure(pool, ENSURE_AB, "ab_runs");
  await pool.query(
    `INSERT INTO ab_runs (config, k, cases, results) VALUES ($1, $2, $3, $4)`,
    [record.config, record.k, record.cases, JSON.stringify(record.results)],
  );
};

// ---- reads (called from the web) -------------------------------------------

export type EvalRun = {
  ran_at: string;
  config: string | null;
  deterministic: string | null;
  judge: string | null;
  suites: Record<string, { passed: number; failed: number }>;
};

export type AbRun = { ran_at: string; config: string | null; k: number; cases: number; results: AbResults };

export const fetchLatestGate = async (pool: DbPool): Promise<EvalRun | null> => {
  try {
    const { rows } = await pool.query(
      `SELECT ran_at, config, deterministic, judge, suites FROM eval_runs ORDER BY ran_at DESC LIMIT 1`,
    );
    return (rows[0] as EvalRun) ?? null;
  } catch {
    return null;
  }
};

export const fetchGateHistory = async (pool: DbPool, limit = 20): Promise<EvalRun[]> => {
  try {
    const { rows } = await pool.query(
      `SELECT ran_at, config, deterministic, judge, suites FROM eval_runs ORDER BY ran_at DESC LIMIT $1`,
      [limit],
    );
    return rows as EvalRun[];
  } catch {
    return [];
  }
};

export const fetchLatestAb = async (pool: DbPool): Promise<AbRun | null> => {
  try {
    const { rows } = await pool.query(
      `SELECT ran_at, config, k, cases, results FROM ab_runs ORDER BY ran_at DESC LIMIT 1`,
    );
    return (rows[0] as AbRun) ?? null;
  } catch {
    return null;
  }
};
