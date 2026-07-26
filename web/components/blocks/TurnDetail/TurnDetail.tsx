import type { TurnRow } from "@hawk/agent/ops/trace-queries";
import { citedRanks, formatMs, formatUsd, waterfallSteps } from "@/util/trace-format";
import { cn } from "@/util/cn";

const STEP_COLOR: Record<string, string> = {
  llm: "bg-secondary",
  retrieval: "bg-accent",
  tool: "bg-primary",
};

const LEGEND: { kind: string; label: string }[] = [
  { kind: "llm", label: "LLM" },
  { kind: "tool", label: "Tool" },
  { kind: "retrieval", label: "Retrieval" },
];

/** The readable tail of a doc URL for the retrieved-chunk list (host is noise here). */
const shortUrl = (url: string): string => {
  if (!url) return "—";
  try {
    const { pathname } = new URL(url);
    const tail = pathname.split("/").filter(Boolean).pop();
    return tail ? decodeURIComponent(tail) : url;
  } catch {
    return url.length > 48 ? `${url.slice(0, 48)}…` : url;
  }
};

/** The expanded view of a turn: a waterfall of its steps, then a raw chat preview. */
export function TurnDetail({ turn }: { turn: TurnRow }) {
  const steps = waterfallSteps(turn.events, turn.duration_ms);
  // Top-level only — a retrieval child rides inside its tool, so it's not summed here.
  const stepTotal = steps.reduce((sum, step) => sum + (step.latencyMs ?? 0), 0);
  const duration = turn.duration_ms;
  // Wall-clock time not attributed to any measured step (mostly LLM provider /
  // network). Our bars cascade from 0, so it sits at the tail of the track.
  const overhead = duration && duration > 0 ? duration - stepTotal : 0;
  const overheadPct = duration && duration > 0 ? (overhead / duration) * 100 : 0;
  // Which retrieved chunks the answer cited (best-effort — see citedRanks).
  const cited = citedRanks(turn.reply);

  return (
    <div className="space-y-4 bg-background/60 p-4 text-sm">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-secondary/50">
            Steps
          </span>
          {/* Color key so the bar colors are readable. */}
          <div className="flex items-center gap-3 text-xs text-secondary/60">
            {LEGEND.map(({ kind, label }) => (
              <span key={kind} className="flex items-center gap-1">
                <span className={cn("inline-block h-2 w-2 rounded-full", STEP_COLOR[kind])} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Time axis: 0 → turn duration, so bar widths read as absolute time. */}
        {duration && duration > 0 ? (
          <div className="mb-1 grid grid-cols-[9rem_1fr_5rem] gap-3">
            <span />
            <div className="flex justify-between text-[0.65rem] tabular-nums text-secondary/40">
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                <span key={frac}>{formatMs(duration * frac)}</span>
              ))}
            </div>
            <span />
          </div>
        ) : null}

        {steps.length === 0 ? (
          <p className="text-secondary/50">No step events recorded for this turn.</p>
        ) : (
          <div className="space-y-1.5">
            {steps.map((step, index) => (
              <div key={index} className="space-y-1.5">
                <div className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3">
                  <span className="truncate font-medium text-primary">{step.label}</span>
                  <div className="min-w-0">
                    <div className="truncate text-secondary">{step.detail}</div>
                    {/* Waterfall bar, positioned on the real turn-duration track. */}
                    <div className="relative mt-0.5 h-1.5 w-full rounded-full bg-secondary/10">
                      <div
                        className={cn(
                          "absolute h-1.5 rounded-full",
                          STEP_COLOR[step.kind] ?? "bg-secondary",
                        )}
                        style={{ left: `${step.offsetPct}%`, width: `${step.widthPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right tabular-nums text-secondary/70">
                    {formatMs(step.latencyMs)}
                    {/* Per-LLM cost ties latency to spend at the step level. */}
                    {step.costUsd != null && (
                      <div className="text-[0.65rem] text-secondary/40">{formatUsd(step.costUsd)}</div>
                    )}
                  </div>
                </div>
                {/* Nested child (retrieval runs INSIDE its search_docs tool): an
                    indented sub-row whose bar sits within the parent's span. */}
                {step.child && (
                  <>
                    <div className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3">
                      <span className="truncate pl-3 text-secondary/70">└ {step.child.label}</span>
                      <div className="min-w-0">
                        <div className="truncate text-secondary/70">{step.child.detail}</div>
                        <div className="relative mt-0.5 h-1.5 w-full rounded-full bg-secondary/10">
                          <div
                            className={cn(
                              "absolute h-1.5 rounded-full",
                              STEP_COLOR[step.child.kind] ?? "bg-secondary",
                            )}
                            style={{ left: `${step.child.offsetPct}%`, width: `${step.child.widthPct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-right tabular-nums text-secondary/50">
                        {formatMs(step.child.latencyMs)}
                      </span>
                    </div>
                    {/* The ranked passages the search returned, with fusion scores.
                        Shares the parent's 3-col grid (empty first cell) so rank/url
                        starts exactly where the bars start, not under the label. */}
                    {step.child.results && step.child.results.length > 0 && (
                      <div className="space-y-0.5 text-xs">
                        {step.child.results.map((chunk) => (
                          <div
                            key={chunk.rank}
                            className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3"
                          >
                            <span />
                            <div className="flex min-w-0 items-center gap-1.5 text-secondary/60">
                              <span className="tabular-nums text-secondary/40">{chunk.rank}.</span>
                              <span className="truncate">{shortUrl(chunk.url)}</span>
                              {cited.has(chunk.rank) && (
                                <span className="shrink-0 text-primary">✓ cited</span>
                              )}
                            </div>
                            <span className="text-right tabular-nums text-secondary/40">
                              {chunk.score == null ? "—" : chunk.score.toFixed(3)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Unaccounted wall-clock time as an explicit segment, not blank track. */}
            {overhead > 0 && (
              <div className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3">
                <span className="truncate text-secondary/40">· overhead</span>
                <div className="min-w-0">
                  <div className="truncate text-secondary/40">uninstrumented (LLM / network)</div>
                  <div className="relative mt-0.5 h-1.5 w-full rounded-full bg-secondary/10">
                    <div
                      className="absolute h-1.5 rounded-full bg-secondary/25"
                      style={{ left: `${100 - overheadPct}%`, width: `${overheadPct}%` }}
                    />
                  </div>
                </div>
                <span className="text-right tabular-nums text-secondary/40">
                  ~{formatMs(overhead)}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="mt-2 text-xs text-secondary/50">
          Accounted {formatMs(stepTotal)} · turn duration {formatMs(turn.duration_ms)}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary/50">
          Conversation
        </div>
        {/* Raw preview (no Markdown, no avatars): question right, reply left.
            Fixed height so long conversations scroll inside the box. */}
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-secondary/10 bg-white p-3">
          <div className="flex justify-end">
            <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-secondary px-3 py-2 text-background">
              {turn.question || "—"}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm border border-secondary/10 bg-background px-3 py-2 text-ink">
              {turn.reply || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
