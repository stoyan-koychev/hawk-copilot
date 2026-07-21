/**
 * One shared connection pool for the org knowledge base (Supabase Postgres).
 * Passed explicitly into the search functions — no module-level singleton,
 * so tests can point a pool anywhere.
 */

import pg from "pg";

export type DbPool = pg.Pool;

export const makePool = (databaseUrl: string): DbPool => {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set — retrieval needs the Supabase connection string (see .env.example).",
    );
  }
  // Keep the per-instance cap small: on serverless, many function instances each
  // hold a pool, so a low max avoids exhausting Postgres. Point DATABASE_URL at a
  // pooler (e.g. Supabase pgBouncer, port 6543) in production.
  return new pg.Pool({ connectionString: databaseUrl, max: 3 });
};
