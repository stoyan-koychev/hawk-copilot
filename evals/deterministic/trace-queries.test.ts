// DETERMINISTIC EVAL — the trace read side: pure cost math + the dashboard fetch
// (fake pool; no real Postgres), including the empty-table resilience path.

import { describe, expect, it, vi } from "vitest";
import { estimateCostUsd, fetchDashboard, purgeTraces } from "../../src/ops/trace-queries.js";
import type { DbPool } from "../../src/retrieval/db.js";

describe("estimateCostUsd", () => {
  it("prices known models per 1M tokens (input + output)", () => {
    // gpt-4.1-mini = [0.4, 1.6] per 1M
    expect(estimateCostUsd("gpt-4.1-mini", 1_000_000, 1_000_000)).toBeCloseTo(2.0, 6);
  });

  it("falls back to a default rate for unknown models", () => {
    // default [1, 3] per 1M
    expect(estimateCostUsd("mystery-model", 2_000_000, 1_000_000)).toBeCloseTo(5.0, 6);
  });
});

describe("fetchDashboard", () => {
  it("assembles turns + latency + cost + per-turn events, deriving dollars from tokens", async () => {
    const pool = {
      query: vi
        .fn()
        // TURNS, LATENCY, COST run in parallel; the EVENTS query follows.
        .mockResolvedValueOnce({ rows: [{ turn_id: "t1", tokens_in: 10, tokens_out: 5 }] })
        .mockResolvedValueOnce({ rows: [{ p50: 1200, p95: 3400 }] })
        .mockResolvedValueOnce({
          rows: [{ day: "2026-07-21", model: "gpt-4.1-mini", tokens_in: 1_000_000, tokens_out: 0 }],
        })
        .mockResolvedValueOnce({
          rows: [{ turn_id: "t1", type: "llm", ts: "t", provider: "openai", model: "m", data: {} }],
        })
        // FEEDBACK (latest rating per turn)
        .mockResolvedValueOnce({ rows: [{ turn_id: "t1", rating: 1 }] }),
    } as unknown as DbPool;

    const dashboard = await fetchDashboard(pool, 50);
    expect(dashboard.turns).toHaveLength(1);
    expect(dashboard.turns[0]?.events).toHaveLength(1);
    expect(dashboard.turns[0]?.events[0]?.type).toBe("llm");
    expect(dashboard.turns[0]?.rating).toBe(1);
    expect(dashboard.latency).toEqual({ p50: 1200, p95: 3400 });
    expect(dashboard.costByDay[0]?.cost_usd).toBeCloseTo(0.4, 6);
  });

  it("returns an empty dashboard when the table is missing (query throws)", async () => {
    const pool = {
      query: vi.fn().mockRejectedValue(new Error('relation "agent_traces" does not exist')),
    } as unknown as DbPool;

    expect(await fetchDashboard(pool)).toEqual({
      turns: [],
      latency: { p50: null, p95: null },
      costByDay: [],
    });
  });
});

describe("purgeTraces", () => {
  it("deletes all rows and swallows a missing table", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 3 });
    await purgeTraces({ query } as unknown as DbPool);
    expect(query).toHaveBeenCalledWith("DELETE FROM agent_traces");

    const throwing = { query: vi.fn().mockRejectedValue(new Error("no table")) } as unknown as DbPool;
    await expect(purgeTraces(throwing)).resolves.toBeUndefined();
  });
});
