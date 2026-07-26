import { describe, expect, it } from "vitest";
import type { TraceEvent } from "@hawk/agent/ops/trace-queries";
import { citedRanks, summarizeEvent, turnSteps, waterfallSteps } from "./trace-format";

const event = (type: string, data: Record<string, unknown>, model = ""): TraceEvent => ({
  type,
  ts: "2026-07-21T00:00:00Z",
  provider: "openai",
  model,
  data,
});

describe("summarizeEvent", () => {
  it("summarizes an llm step with tokens, model, latency, and cost", () => {
    const step = summarizeEvent(event("llm", { usage: { in: 100, out: 20 }, latency_ms: 900 }, "gpt-x"));
    expect(step).toMatchObject({
      kind: "llm",
      label: "LLM",
      detail: "in 100 / out 20 · gpt-x",
      latencyMs: 900,
      tokensIn: 100,
      tokensOut: 20,
    });
    // unknown model → DEFAULT_PRICING [1, 3] per 1M: 100*1 + 20*3 = 160 → $0.00016
    expect(step?.costUsd).toBeCloseTo(0.00016, 8);
  });

  it("summarizes a retrieval step with mode, count, query, and ranked results", () => {
    const step = summarizeEvent(
      event("retrieval", {
        mode: "hybrid",
        count: 2,
        query: "per diem",
        latency_ms: 120,
        results: [
          { id: "a", url: "https://x/reimburse", score: 0.031 },
          { id: "b", url: "https://x/approve", score: 0.028 },
        ],
      }),
    );
    expect(step).toMatchObject({
      kind: "retrieval",
      label: "Retrieval",
      detail: 'hybrid · 2 results · "per diem"',
      latencyMs: 120,
    });
    expect(step?.results).toEqual([
      { rank: 1, url: "https://x/reimburse", score: 0.031 },
      { rank: 2, url: "https://x/approve", score: 0.028 },
    ]);
  });

  it("summarizes a tool step with its name and args", () => {
    const step = summarizeEvent(event("tool", { tool: "convert_currency", args: { amount: 5 }, latency_ms: 300 }));
    expect(step?.label).toBe("Tool: convert_currency");
    expect(step?.latencyMs).toBe(300);
  });

  it("skips markers and paired starts", () => {
    expect(summarizeEvent(event("turn_start", { user_message: "hi" }))).toBeNull();
    expect(summarizeEvent(event("turn_end", { reply: "ok" }))).toBeNull();
    expect(summarizeEvent(event("tool_start", { tool: "x" }))).toBeNull();
  });
});

describe("turnSteps", () => {
  it("keeps only visible steps, in order", () => {
    const steps = turnSteps([
      event("turn_start", { user_message: "hi" }),
      event("llm", { usage: { in: 1, out: 2 }, latency_ms: 10 }),
      event("tool_start", { tool: "x" }),
      event("tool", { tool: "x", latency_ms: 5 }),
      event("turn_end", { reply: "done" }),
    ]);
    expect(steps.map((s) => s.kind)).toEqual(["llm", "tool"]);
  });
});

describe("waterfallSteps", () => {
  it("cascades: each step starts where the previous ended and widths fill the track", () => {
    const steps = waterfallSteps([
      event("llm", { usage: {}, latency_ms: 100 }),
      event("tool", { tool: "x", latency_ms: 300 }),
      event("llm", { usage: {}, latency_ms: 100 }),
    ]);
    // total = 500 → 20% / 60% / 20%, offsets 0 / 20 / 80
    expect(steps.map((s) => Math.round(s.offsetPct))).toEqual([0, 20, 80]);
    expect(steps.map((s) => Math.round(s.widthPct))).toEqual([20, 60, 20]);
    const end = steps.at(-1)!;
    expect(end.offsetPct + end.widthPct).toBeCloseTo(100, 6);
  });

  it("nests retrieval inside its tool and scales to the real turn duration", () => {
    const steps = waterfallSteps(
      [
        event("llm", { usage: {}, latency_ms: 900 }),
        event("tool_start", { tool: "search_docs" }),
        event("retrieval", { mode: "hybrid", count: 6, latency_ms: 1458 }),
        event("tool", { tool: "search_docs", latency_ms: 1500 }),
        event("llm", { usage: {}, latency_ms: 8200 }),
      ],
      12000, // turn wall-clock is larger than the summed steps → an overhead gap
    );

    // retrieval is folded into its tool → three TOP-LEVEL steps, not four.
    expect(steps.map((s) => s.kind)).toEqual(["llm", "tool", "llm"]);

    // the tool carries retrieval as a child, starting with the tool's own span.
    const tool = steps[1];
    expect(tool.child?.kind).toBe("retrieval");
    expect(tool.child?.latencyMs).toBe(1458);
    expect(tool.child?.offsetPct).toBeCloseTo(tool.offsetPct, 6);

    // top-level latencies exclude the nested retrieval (no double-count)…
    const stepTotal = steps.reduce((sum, s) => sum + (s.latencyMs ?? 0), 0);
    expect(stepTotal).toBe(900 + 1500 + 8200);

    // …and because we scaled to the real 12000ms, the bars leave an honest gap.
    const filled = steps.reduce((sum, s) => sum + s.widthPct, 0);
    expect(filled).toBeLessThan(100);
    expect(filled).toBeCloseTo((stepTotal / 12000) * 100, 6);
  });
});

describe("citedRanks", () => {
  it("pulls citation numbers out of a reply", () => {
    expect(citedRanks("Request it here [1], approvers sign off [3].")).toEqual(new Set([1, 3]));
  });

  it("is empty for no citations or a null reply", () => {
    expect(citedRanks("no citations here")).toEqual(new Set());
    expect(citedRanks(null)).toEqual(new Set());
  });
});
