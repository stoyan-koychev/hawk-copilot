import type { HarnessEvent } from "@/util/types";

export type TurnGroup = { turn: number; labels: string[] };

/**
 * Fold the ordered harness events into per-turn groups: a turn's events are
 * contiguous, so start a new group when the turn changes and append otherwise.
 */
export function groupEventsByTurn(events: HarnessEvent[]): TurnGroup[] {
  const groups: TurnGroup[] = [];
  for (const event of events) {
    const current = groups[groups.length - 1];
    if (current && current.turn === event.turn) {
      current.labels.push(event.label);
    } else {
      groups.push({ turn: event.turn, labels: [event.label] });
    }
  }
  return groups;
}
