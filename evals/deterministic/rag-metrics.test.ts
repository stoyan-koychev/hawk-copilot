// DETERMINISTIC EVAL — the retrieval scorers themselves. If the ruler is
// wrong, every measurement lies; so the ruler gets tests.

import { describe, expect, it } from "vitest";
import { loadRagCases, mrr, recallAtK } from "../../src/ops/rag-metrics.js";

const results = (...urls: string[]) => urls.map((url) => ({ url }));

describe("recallAtK", () => {
  it("hits when the expected url is within k", () => {
    expect(recallAtK("b", results("a", "b", "c"), 3)).toBe(1);
    expect(recallAtK("c", results("a", "b", "c"), 2)).toBe(0); // present but below the cutoff
    expect(recallAtK("x", results("a", "b"), 5)).toBe(0);
  });

  it("dedupes chunks of the same page before applying k", () => {
    // three chunks of page a, then page b: b is the SECOND page, inside k=2
    expect(recallAtK("b", results("a", "a", "a", "b"), 2)).toBe(1);
  });
});

describe("mrr", () => {
  it("is 1/rank of the first hit, 0 when absent", () => {
    expect(mrr("a", results("a", "b"))).toBe(1);
    expect(mrr("b", results("a", "b"))).toBe(0.5);
    expect(mrr("c", results("a", "b", "c"))).toBeCloseTo(1 / 3);
    expect(mrr("x", results("a", "b"))).toBe(0);
  });

  it("ranks pages, not chunks", () => {
    expect(mrr("b", results("a", "a", "b"))).toBe(0.5); // b is page #2, not #3
  });
});

describe("dataset", () => {
  it("loads 15 well-formed cases", () => {
    const cases = loadRagCases();
    expect(cases.length).toBeGreaterThanOrEqual(15);
    for (const c of cases) {
      expect(c.id).toBeTruthy();
      expect(["paraphrase", "jargon", "mixed"]).toContain(c.style);
      expect(c.question).toBeTruthy();
      expect(c.expect_url).toMatch(/^https:\/\//);
    }
  });
});
