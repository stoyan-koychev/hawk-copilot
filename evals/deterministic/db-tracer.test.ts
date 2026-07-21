// DETERMINISTIC EVAL — the DB tracer's write/flush behaviour with a fake pool
// (no real Postgres). Verifies it creates the table, inserts a row per event,
// stamps provider/model on llm rows, and that flush() awaits the writes.

import { describe, expect, it, vi } from "vitest";
import { loadSettings } from "../../src/config.js";
import { makeDbTracer } from "../../src/ops/db-tracer.js";
import type { DbPool } from "../../src/retrieval/db.js";

const fakePool = () => {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const end = vi.fn().mockResolvedValue(undefined);
  return { pool: { query, end } as unknown as DbPool, query, end };
};

const settings = loadSettings({ provider: "openai", model: "gpt-x" });

describe("makeDbTracer", () => {
  it("creates the table and inserts a row per event", async () => {
    const { pool, query } = fakePool();
    const tracer = makeDbTracer("postgres://x", settings, pool);

    tracer.turnStart("hello");
    tracer.event("tool", { tool: "search_docs", args: { query: "q" } });
    tracer.event("text", { delta: "ignored" }); // text is never persisted
    tracer.event("llm", { usage: { in: 10, out: 5 } });
    tracer.turnEnd("done", 2);
    await tracer.flush?.();

    // one CREATE TABLE + one INSERT each for turn_start, tool, llm, turn_end (text skipped)
    const inserts = query.mock.calls.filter(([sql]) => String(sql).startsWith("INSERT"));
    expect(query.mock.calls.some(([sql]) => String(sql).includes("CREATE TABLE"))).toBe(true);
    expect(inserts).toHaveLength(4);
    expect(inserts.map((call) => call[1][0])).toEqual(["turn_start", "tool", "llm", "turn_end"]);

    // all of a turn's rows share one turn_id (params: type, provider, model, turn_id, data)
    const turnIds = inserts.map((call) => call[1][3]);
    expect(new Set(turnIds).size).toBe(1);
    expect(turnIds[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(tracer.turnId).toBe(turnIds[0]);
  });

  it("stamps provider/model on llm rows and leaves them null otherwise", async () => {
    const { pool, query } = fakePool();
    const tracer = makeDbTracer("postgres://x", settings, pool);

    tracer.event("llm", { usage: { in: 1, out: 2 } });
    tracer.event("tool", { tool: "convert_currency" });
    await tracer.flush?.();

    const inserts = query.mock.calls.filter(([sql]) => String(sql).startsWith("INSERT"));
    const llm = inserts.find((call) => call[1][0] === "llm");
    const tool = inserts.find((call) => call[1][0] === "tool");
    expect(llm?.[1].slice(1, 3)).toEqual(["openai", "gpt-x"]); // provider, model
    expect(tool?.[1].slice(1, 3)).toEqual([null, null]);
  });

  it("close() releases the pool", async () => {
    const { pool, end } = fakePool();
    const tracer = makeDbTracer("postgres://x", settings, pool);
    await tracer.close?.();
    expect(end).toHaveBeenCalledOnce();
  });
});
