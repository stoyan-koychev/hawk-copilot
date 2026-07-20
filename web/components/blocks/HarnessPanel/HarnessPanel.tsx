import type { HarnessEvent } from "@/util/types";

type HarnessPanelProps = {
  events: HarnessEvent[];
};

/** The right-hand console: every tool call and LLM usage line for the session. */
export function HarnessPanel({ events }: HarnessPanelProps) {
  return (
    <aside className="overflow-y-auto rounded-2xl border border-secondary/10 bg-primary p-4 text-xs shadow-lg shadow-secondary/5">
      <h2 className="mb-3 font-heading text-sm font-semibold text-accent">
        Harness &mdash; full session
      </h2>
      {events.length === 0 && (
        <p className="text-background/40">tool calls and model usage appear here as turns run</p>
      )}
      {events.map((event, index) => (
        <div
          key={index}
          className="harness-line mb-1.5 rounded-lg bg-secondary/60 p-2 font-mono text-background/90"
        >
          <span className="mr-1 text-accent">#{event.turn}</span>
          {event.label}
        </div>
      ))}
    </aside>
  );
}
