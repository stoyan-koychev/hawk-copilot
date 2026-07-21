"use client";

import { Fragment, useState } from "react";
import type { TurnRow } from "@agent/ops/trace-queries";
import { TurnDetail } from "@/components/blocks/TurnDetail/TurnDetail";
import { formatMs } from "@/util/trace-format";
import { cn } from "@/util/cn";

/** A thumb glyph for the Liked column; rotated for a down/dislike. */
function Thumb({ down }: { down?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", down && "rotate-180")}
      aria-hidden="true"
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

/** The feedback state for a turn: liked, disliked, or none. */
function Liked({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-secondary/30">—</span>;
  return rating > 0 ? (
    <span className="text-primary" title="Liked">
      <Thumb />
    </span>
  ) : (
    <span className="text-primary" title="Disliked">
      <Thumb down />
    </span>
  );
}

/** Recent turns as an accordion: click rows to expand their per-step timeline;
 *  multiple rows can be open at once. */
export function TurnsTable({ turns }: { turns: TurnRow[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (turnId: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(turnId)) next.delete(turnId);
      else next.add(turnId);
      return next;
    });

  return (
    <div className="w-full overflow-hidden rounded-xl border border-secondary/10 bg-white">
      {/* table-fixed + column widths keep the table a constant 100% wide whether
          a row is collapsed or expanded (auto layout would grow to fit content). */}
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-secondary/10 bg-white text-left text-secondary">
            <th className="w-8 px-3 py-2" />
            <th className="w-44 px-3 py-2 font-semibold">Started</th>
            <th className="px-3 py-2 font-semibold">Question</th>
            <th className="w-24 px-3 py-2 font-semibold">Duration</th>
            <th className="w-16 px-3 py-2 font-semibold">Tools</th>
            <th className="w-28 px-3 py-2 font-semibold">Tokens</th>
            <th className="w-16 px-3 py-2 font-semibold">Liked</th>
          </tr>
        </thead>
        <tbody>
          {turns.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-secondary/50" colSpan={7}>
                No data yet.
              </td>
            </tr>
          ) : (
            turns.map((turn) => {
              const open = openIds.has(turn.turn_id);
              return (
                <Fragment key={turn.turn_id}>
                  <tr
                    onClick={() => toggle(turn.turn_id)}
                    className="cursor-pointer border-t border-secondary/10 hover:bg-background/60"
                  >
                    <td className="px-3 py-2 text-secondary/40">
                      <span className={cn("inline-block transition-transform", open && "rotate-90")}>
                        &rsaquo;
                      </span>
                    </td>
                    <td className="truncate px-3 py-2 text-secondary/70 tabular-nums">
                      {turn.started ? new Date(turn.started).toLocaleString() : "—"}
                    </td>
                    <td className="truncate px-3 py-2 text-ink">{turn.question}</td>
                    <td className="px-3 py-2 tabular-nums text-ink">{formatMs(turn.duration_ms)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink">{turn.tool_calls}</td>
                    <td className="px-3 py-2 tabular-nums text-ink">
                      {turn.tokens_in} / {turn.tokens_out}
                    </td>
                    <td className="px-3 py-2">
                      <Liked rating={turn.rating} />
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-t border-secondary/10">
                      <td colSpan={7} className="p-0">
                        <TurnDetail turn={turn} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
