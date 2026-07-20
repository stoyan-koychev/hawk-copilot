import type { AgentStatus } from "@/util/types";
import { statusLabel } from "@/util/status-label";

type TypingStatusProps = {
  status: AgentStatus;
};

/** A live "what the agent is doing" line with a gradient shimmering through it. */
export function TypingStatus({ status }: TypingStatusProps) {
  return <span className="shimmer-text text-sm font-medium">{statusLabel(status)}…</span>;
}
