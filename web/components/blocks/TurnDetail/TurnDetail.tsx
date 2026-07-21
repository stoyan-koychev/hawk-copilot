import type { TurnRow } from "@hawk/agent/ops/trace-queries";
import { formatMs, waterfallSteps } from "@/util/trace-format";
import { cn } from "@/util/cn";

const STEP_COLOR: Record<string, string> = {
  llm: "bg-secondary",
  retrieval: "bg-accent",
  tool: "bg-primary",
};

/** The expanded view of a turn: a waterfall of its steps, then a raw chat preview. */
export function TurnDetail({ turn }: { turn: TurnRow }) {
  const steps = waterfallSteps(turn.events);
  const stepTotal = steps.reduce((sum, step) => sum + (step.latencyMs ?? 0), 0);

  return (
    <div className="space-y-4 bg-background/60 p-4 text-sm">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary/50">
          Steps
        </div>
        {steps.length === 0 ? (
          <p className="text-secondary/50">No step events recorded for this turn.</p>
        ) : (
          <div className="space-y-1.5">
            {steps.map((step, index) => (
              <div key={index} className="grid grid-cols-[9rem_1fr_5rem] items-center gap-3">
                <span className="truncate font-medium text-primary">{step.label}</span>
                <div className="min-w-0">
                  <div className="truncate text-secondary">{step.detail}</div>
                  {/* Waterfall: the bar starts where the previous step finished. */}
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
                <span className="text-right tabular-nums text-secondary/70">
                  {formatMs(step.latencyMs)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-xs text-secondary/50">
          Steps total {formatMs(stepTotal)} · turn duration {formatMs(turn.duration_ms)}
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
