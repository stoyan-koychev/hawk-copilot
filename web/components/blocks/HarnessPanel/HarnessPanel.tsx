import type { HarnessEvent } from "@/util/types";
import { groupEventsByTurn } from "@/util/harness-group";

type HarnessPanelProps = {
  events: HarnessEvent[];
};

/** The session log rendered inside the sidebar, grouped by turn: each turn is a
 *  box of its tool calls and LLM usage lines, headed by the turn number. */
export function HarnessPanel({ events }: HarnessPanelProps) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-secondary/50">
        tool calls and model usage appear here as turns run
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groupEventsByTurn(events).map((group) => (
        <div key={group.turn}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary/50">
            Turn {group.turn}
          </div>
          <div className="divide-y divide-secondary/10 rounded-lg border border-secondary/10 bg-secondary/5">
            {group.labels.map((label, index) => (
              <div
                key={index}
                className="harness-line break-words px-2 py-1.5 font-mono text-xs text-secondary"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
