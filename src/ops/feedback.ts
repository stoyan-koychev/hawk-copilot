/**
 * Feedback — thumbs up/down keyed by turn_id, stored in its own table (different
 * lifecycle and write path from agent_traces: it comes from the browser). Stamped
 * with configVersion() so satisfaction can be sliced by prompt/retrieval version.
 */

import type { DbPool } from "../retrieval/db.js";
import { configVersion } from "./version.js";

const ENSURE_SCHEMA = `CREATE TABLE IF NOT EXISTS agent_feedback (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  turn_id uuid NOT NULL,
  rating smallint NOT NULL,
  config_version text,
  note text
)`;

const INSERT_ROW = `INSERT INTO agent_feedback (turn_id, rating, config_version, note) VALUES ($1, $2, $3, $4)`;

const schemaByPool = new WeakMap<DbPool, Promise<unknown>>();
const ensureSchema = (pool: DbPool): Promise<unknown> => {
  let ready = schemaByPool.get(pool);
  if (!ready) {
    ready = pool.query(ENSURE_SCHEMA);
    schemaByPool.set(pool, ready);
  }
  return ready;
};

export type Feedback = { turnId: string; rating: number; note?: string };

/** Persist one feedback row (auto-creates the table). */
export const insertFeedback = async (pool: DbPool, { turnId, rating, note }: Feedback): Promise<void> => {
  await ensureSchema(pool);
  await pool.query(INSERT_ROW, [turnId, rating, configVersion(), note ?? null]);
};
