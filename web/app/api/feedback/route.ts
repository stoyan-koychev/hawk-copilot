import { opsConfigured, recordFeedback } from "@/lib/traces";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Thumbs up/down from the chat UI: { turn_id, rating: 1 | -1, note? }. */
export const POST = async (req: Request): Promise<Response> => {
  const body = (await req.json().catch(() => null)) as {
    turn_id?: unknown;
    rating?: unknown;
    note?: unknown;
  } | null;

  const turnId = body?.turn_id;
  const rating = body?.rating;
  if (typeof turnId !== "string" || !UUID.test(turnId) || (rating !== 1 && rating !== -1)) {
    return Response.json({ error: "expected { turn_id: uuid, rating: 1 | -1 }" }, { status: 400 });
  }
  if (!opsConfigured()) {
    return Response.json({ error: "traces DB not configured" }, { status: 503 });
  }

  await recordFeedback({
    turnId,
    rating,
    note: typeof body?.note === "string" ? body.note : undefined,
  });
  return Response.json({ ok: true });
};
