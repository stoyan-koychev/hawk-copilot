import type { TraceEvent } from "@hawk/agent/ops/trace-queries";

export type StepSummary = {
  kind: "llm" | "retrieval" | "tool";
  label: string;
  detail: string;
  latencyMs: number | null;
};

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const formatMs = (ms: number | null): string => (ms == null ? "—" : `${Math.round(ms)} ms`);

const truncate = (text: string, max = 80): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

/**
 * One-line display for a trace event, or null for events shown elsewhere
 * (turn_start/turn_end in the header, tool_start is paired with tool).
 */
export const summarizeEvent = (event: TraceEvent): StepSummary | null => {
  const data = event.data ?? {};
  const latencyMs = num(data.latency_ms);

  if (event.type === "llm") {
    const usage = (data.usage ?? {}) as { in?: number; out?: number };
    const model = event.model || "";
    return {
      kind: "llm",
      label: "LLM",
      detail: `in ${usage.in ?? 0} / out ${usage.out ?? 0}${model ? ` · ${model}` : ""}`,
      latencyMs,
    };
  }

  if (event.type === "retrieval") {
    const count = num(data.count) ?? 0;
    const query = typeof data.query === "string" ? ` · "${truncate(data.query, 48)}"` : "";
    return {
      kind: "retrieval",
      label: "Retrieval",
      detail: `${String(data.mode ?? "hybrid")} · ${count} results${query}`,
      latencyMs,
    };
  }

  if (event.type === "tool") {
    const name = String(data.tool ?? "tool");
    const args = data.args ? truncate(JSON.stringify(data.args), 60) : "";
    return { kind: "tool", label: `Tool: ${name}`, detail: args, latencyMs };
  }

  return null; // turn_start / turn_end / tool_start
};

/** The visible timeline steps for a turn, in order. */
export const turnSteps = (events: TraceEvent[]): StepSummary[] =>
  events.map(summarizeEvent).filter((step): step is StepSummary => step !== null);

export type WaterfallStep = StepSummary & { offsetPct: number; widthPct: number };

/**
 * Steps laid out as a waterfall: each bar is offset by the cumulative time of
 * the steps before it and sized by its own duration, scaled so they tile the
 * full track edge-to-edge (each row continues where the previous finished).
 */
export const waterfallSteps = (events: TraceEvent[]): WaterfallStep[] => {
  const steps = turnSteps(events);
  const total = steps.reduce((sum, step) => sum + (step.latencyMs ?? 0), 0) || 1;
  let elapsed = 0;
  return steps.map((step) => {
    const duration = step.latencyMs ?? 0;
    const laidOut = { ...step, offsetPct: (elapsed / total) * 100, widthPct: (duration / total) * 100 };
    elapsed += duration;
    return laidOut;
  });
};
