import { describe, expect, it } from "vitest";
import type { TraceEvent } from "@hawk/agent/ops/trace-queries";
import { summarizeEvent, turnSteps, waterfallSteps } from "./trace-format";

const event = (type: string, data: Record<string, unknown>, model = ""): TraceEvent => ({
  type,
  ts: "2026-07-21T00:00:00Z",
  provider: "openai",
  model,
  data,
});

describe("summarizeEvent", () => {
  it("summarizes an llm step with tokens, model, and latency", () => {
    expect(summarizeEvent(event("llm", { usage: { in: 100, out: 20 }, latency_ms: 900 }, "gpt-x"))).toEqual(
      { kind: "llm", label: "LLM", detail: "in 100 / out 20 · gpt-x", latencyMs: 900 },
    );
  });

  it("summarizes a retrieval step with mode, count and query", () => {
    const step = summarizeEvent(event("retrieval", { mode: "hybrid", count: 6, query: "per diem", latency_ms: 120 }));
    expect(step).toEqual({
      kind: "retrieval",
      label: "Retrieval",
      detail: 'hybrid · 6 results · "per diem"',
      latencyMs: 120,
    });
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
});
