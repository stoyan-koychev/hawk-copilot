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
  return new pg.Pool({ connectionString: databaseUrl, max: 5 });
};
