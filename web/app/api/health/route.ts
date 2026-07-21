import { configVersion } from "@hawk/agent/ops/version";

export const runtime = "nodejs";

export const GET = (): Response =>
  Response.json({ ok: true, config: configVersion() });
