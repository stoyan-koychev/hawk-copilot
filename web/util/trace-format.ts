import { type TraceEvent, estimateCostUsd } from "@hawk/agent/ops/trace-queries";

/** One ranked passage a retrieval returned (the search_docs `results` payload). */
export type RetrievedChunk = { rank: number; url: string; score: number | null };

export type StepSummary = {
  kind: "llm" | "retrieval" | "tool";
  label: string;
  detail: string;
  latencyMs: number | null;
  // llm rows double as the cost ledger.
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  // retrieval rows carry the ranked chunks they returned (with fusion scores).
  results?: RetrievedChunk[];
};

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const formatMs = (ms: number | null): string => (ms == null ? "—" : `${Math.round(ms)} ms`);

/** Cheap USD formatter for per-step cost — enough digits for sub-cent LLM calls. */
export const formatUsd = (usd: number): string => `$${usd.toFixed(4)}`;

const truncate = (text: string, max = 80): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

/**
 * The citation numbers an answer actually used: `[1]`, `[3]` → {1, 3}. Best-effort
 * — search_docs numbers its results per call, so with 2+ searches in a turn the
 * mapping to a specific retrieval is ambiguous; we apply the set to each.
 */
export const citedRanks = (reply: string | null): Set<number> => {
  const ranks = new Set<number>();
  if (!reply) return ranks;
  for (const match of reply.matchAll(/\[(\d+)\]/g)) ranks.add(Number(match[1]));
  return ranks;
};

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
    const tokensIn = usage.in ?? 0;
    const tokensOut = usage.out ?? 0;
    return {
      kind: "llm",
      label: "LLM",
      detail: `in ${tokensIn} / out ${tokensOut}${model ? ` · ${model}` : ""}`,
      latencyMs,
      tokensIn,
      tokensOut,
      costUsd: estimateCostUsd(model, tokensIn, tokensOut),
    };
  }

  if (event.type === "retrieval") {
    const count = num(data.count) ?? 0;
    const query = typeof data.query === "string" ? ` · "${truncate(data.query, 48)}"` : "";
    // The ranked chunks the search returned — {id, url, score} per search_docs.
    const raw = Array.isArray(data.results) ? data.results : [];
    const results: RetrievedChunk[] = raw.map((r, i) => {
      const row = (r ?? {}) as { url?: unknown; score?: unknown };
      return {
        rank: i + 1,
        url: typeof row.url === "string" ? row.url : "",
        score: num(row.score),
      };
    });
    return {
      kind: "retrieval",
      label: "Retrieval",
      detail: `${String(data.mode ?? "hybrid")} · ${count} results${query}`,
      latencyMs,
      results,
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

export type WaterfallStep = StepSummary & {
  offsetPct: number;
  widthPct: number;
  /** A step nested INSIDE this one — retrieval runs inside its search_docs tool,
   * so its latency is a subset of the tool's, not a sibling to be summed. */
  child?: WaterfallStep;
};

/**
 * Fold each `retrieval` step into the `tool` step that follows it: retrieval is
 * emitted mid-execution by search_docs, so it's a CHILD of that tool span, not a
 * sibling. Everything else stays a top-level node. Robust to multiple searches in
 * one turn (retrieval#1→tool#1, retrieval#2→tool#2) and to an orphan retrieval
 * (kept top-level so it's never silently dropped).
 */
const foldRetrievalIntoTools = (steps: StepSummary[]): (StepSummary & { child?: StepSummary })[] => {
  const nodes: (StepSummary & { child?: StepSummary })[] = [];
  let pendingRetrieval: StepSummary | null = null;
  for (const step of steps) {
    if (step.kind === "retrieval") {
      pendingRetrieval = step;
    } else if (step.kind === "tool" && pendingRetrieval) {
      nodes.push({ ...step, child: pendingRetrieval });
      pendingRetrieval = null;
    } else {
      nodes.push(step);
    }
  }
  if (pendingRetrieval) nodes.push(pendingRetrieval);
  return nodes;
};

/**
 * Steps laid out as a waterfall. Top-level steps cascade left-to-right by their
 * own duration; a retrieval child is drawn INSIDE its tool's span (same start,
 * its own width), never as a sibling — so its time isn't double-counted.
 *
 * Bars scale to the real `durationMs` (turn wall-clock) when known, so the
 * unaccounted remainder (LLM provider/network overhead) shows as an honest gap.
 * Falls back to the summed step time when duration is absent (file tracer).
 */
export const waterfallSteps = (events: TraceEvent[], durationMs?: number | null): WaterfallStep[] => {
  const nodes = foldRetrievalIntoTools(turnSteps(events));
  const stepTotal = nodes.reduce((sum, node) => sum + (node.latencyMs ?? 0), 0);
  const track = durationMs && durationMs > 0 ? durationMs : stepTotal || 1;
  let elapsed = 0;
  return nodes.map((node) => {
    const duration = node.latencyMs ?? 0;
    const offsetPct = (elapsed / track) * 100;
    const widthPct = (duration / track) * 100;
    // The child (retrieval) starts with its parent tool — it's the first real
    // work search_docs does — and gets its own width within that span.
    const child = node.child
      ? { ...node.child, offsetPct, widthPct: ((node.child.latencyMs ?? 0) / track) * 100 }
      : undefined;
    elapsed += duration;
    return { ...node, offsetPct, widthPct, child };
  });
};
