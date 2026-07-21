// Server-only helpers for the /ops dashboard: a memoized read pool to the traces
// DB, and a simple token gate. Never import this from a client component (it
// pulls in pg and reads OPS_TOKEN).

import { loadSettings } from "@agent/config";
import { makePool } from "@agent/retrieval/db";
import type { DbPool } from "@agent/retrieval/db";
import { fetchDashboard, purgeTraces } from "@agent/ops/trace-queries";
import type { Dashboard } from "@agent/ops/trace-queries";
import { insertFeedback } from "@agent/ops/feedback";
import type { Feedback } from "@agent/ops/feedback";

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
