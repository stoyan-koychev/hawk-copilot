import { getDashboard, opsConfigured, purgeAllTraces } from "@/lib/traces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notConfigured = () =>
  Response.json({ error: "traces DB not configured — set HAWK_TRACE_DATABASE_URL" }, { status: 503 });

/** JSON dashboard data for the traces DB. Open (no auth). */
export const GET = async (): Promise<Response> => {
  if (!opsConfigured()) return notConfigured();
  return Response.json(await getDashboard());
};

/** Purge all trace rows. Open (no auth). */
export const DELETE = async (): Promise<Response> => {
  if (!opsConfigured()) return notConfigured();
  await purgeAllTraces();
  return Response.json({ ok: true });
};
