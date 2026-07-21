// Shared UI types for the chat surface. These describe the client-side view of
// the conversation, which is intentionally distinct from the agent wire format.

export type ChatRole = "user" | "assistant";

// ONE timeline: bubbles and tool cards are peers in the flow, so a card
// permanently belongs to the turn that produced it.
export type ChatItem =
  | { kind: "user"; content: string }
  // turnId (from the SSE `done` event) correlates this reply to its trace row,
  // so feedback can be attached to it later.
  | { kind: "assistant"; content: string; turnId?: string }
  | { kind: "card"; tool: string; output: string };

export type HarnessEvent = { turn: number; label: string };

// What the agent is doing right now, shown as a live status while it works:
// reasoning ("thinking") or running a specific tool.
export type AgentStatus = { kind: "thinking" } | { kind: "tool"; tool: string };
