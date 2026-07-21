// DETERMINISTIC EVAL — feedback insert creates its table and stamps configVersion.

import { describe, expect, it, vi } from "vitest";
import { insertFeedback } from "../../src/ops/feedback.js";
import type { DbPool } from "../../src/retrieval/db.js";

describe("insertFeedback", () => {
  it("ensures the table then inserts turn_id + rating + config version", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as DbPool;

    await insertFeedback(pool, { turnId: "11111111-1111-1111-1111-111111111111", rating: 1 });

    expect(query.mock.calls[0]?.[0]).toContain("CREATE TABLE IF NOT EXISTS agent_feedback");
    const insert = query.mock.calls.find(([sql]) => String(sql).startsWith("INSERT"));
    expect(insert?.[1][0]).toBe("11111111-1111-1111-1111-111111111111");
    expect(insert?.[1][1]).toBe(1);
    expect(typeof insert?.[1][2]).toBe("string"); // config_version
    expect(insert?.[1][3]).toBeNull(); // no note
  });
});
