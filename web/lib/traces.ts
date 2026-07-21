// Server-only helpers for the /ops dashboard: a memoized read pool to the traces
// DB, and a simple token gate. Never import this from a client component (it
// pulls in pg and reads OPS_TOKEN).

import { loadSettings } from "@hawk/agent/config";
import { makePool } from "@hawk/agent/retrieval/db";
import type { DbPool } from "@hawk/agent/retrieval/db";
import { fetchDashboard, purgeTraces } from "@hawk/agent/ops/trace-queries";
import type { Dashboard } from "@hawk/agent/ops/trace-queries";
import { insertFeedback } from "@hawk/agent/ops/feedback";
import type { Feedback } from "@hawk/agent/ops/feedback";
import { fetchGateHistory, fetchLatestAb, fetchLatestGate } from "@hawk/agent/ops/eval-store";
import type { AbRun, EvalRun } from "@hawk/agent/ops/eval-store";

const settings = loadSettings();

let readPool: DbPool | null = null;

const pool = (): DbPool => (readPool ??= makePool(settings.traceDatabaseUrl));

/** True only when a traces DB is configured (HAWK_TRACE_DATABASE_URL). */
export const opsConfigured = (): boolean => Boolean(settings.traceDatabaseUrl);

/** The dashboard data, or null if no traces DB is configured. */
export const getDashboard = async (): Promise<Dashboard | null> => {
  if (!settings.traceDatabaseUrl) return null;
  return fetchDashboard(pool());
};

/** Persist thumbs up/down for a turn (writes to the traces DB). */
export const recordFeedback = async (feedback: Feedback): Promise<void> => {
  if (!settings.traceDatabaseUrl) throw new Error("traces DB not configured");
  await insertFeedback(pool(), feedback);
};

/** Delete every trace row (the /ops purge button). */
export const purgeAllTraces = async (): Promise<void> => {
  if (!settings.traceDatabaseUrl) throw new Error("traces DB not configured");
  await purgeTraces(pool());
};

export type EvalsData = {
  latestGate: EvalRun | null;
  gateHistory: EvalRun[];
  latestAb: AbRun | null;
};

/** Offline-quality data for /ops/evals (gate verdict + history, latest A/B). */
export const getEvals = async (): Promise<EvalsData | null> => {
  if (!settings.traceDatabaseUrl) return null;
  const p = pool();
  const [latestGate, gateHistory, latestAb] = await Promise.all([
    fetchLatestGate(p),
    fetchGateHistory(p, 20),
    fetchLatestAb(p),
  ]);
  return { latestGate, gateHistory, latestAb };
};
