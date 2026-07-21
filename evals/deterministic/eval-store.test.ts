// DETERMINISTIC EVAL — eval-store writes create-then-insert and reads are resilient.

import { describe, expect, it, vi } from "vitest";
import {
  fetchLatestGate,
  recordAbRun,
  recordGateRun,
} from "../../src/ops/eval-store.js";
import type { DbPool } from "../../src/retrieval/db.js";

describe("recordGateRun", () => {
  it("ensures eval_runs then inserts the verdict", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await recordGateRun({ query } as unknown as DbPool, {
      config: "abc",
      deterministic: "pass",
      judge: "pass",
      suites: { deterministic: { passed: 18, failed: 0 } },
    });
    expect(query.mock.calls[0]?.[0]).toContain("CREATE TABLE IF NOT EXISTS eval_runs");
    const insert = query.mock.calls.find(([sql]) => String(sql).startsWith("INSERT"));
    expect(insert?.[1]).toEqual([null, "abc", "pass", "pass", JSON.stringify({ deterministic: { passed: 18, failed: 0 } })]);
  });
});

describe("recordAbRun", () => {
  it("ensures ab_runs then inserts the results blob", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const results = { hybrid: { overall: { recall: 0.93, mrr: 0.82, n: 15 } } };
    await recordAbRun({ query } as unknown as DbPool, { config: "abc", k: 8, cases: 15, results });
    expect(query.mock.calls[0]?.[0]).toContain("CREATE TABLE IF NOT EXISTS ab_runs");
    const insert = query.mock.calls.find(([sql]) => String(sql).startsWith("INSERT"));
    expect(insert?.[1]).toEqual(["abc", 8, 15, JSON.stringify(results)]);
  });
});

describe("fetchLatestGate", () => {
  it("returns null when the table is missing", async () => {
    const pool = {
      query: vi.fn().mockRejectedValue(new Error('relation "eval_runs" does not exist')),
    } as unknown as DbPool;
    expect(await fetchLatestGate(pool)).toBeNull();
  });
});
