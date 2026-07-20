// Shared UI types for the chat surface. These describe the client-side view of
// the conversation, which is intentionally distinct from the agent wire format.

export type ChatRole = "user" | "assistant";

// ONE timeline: bubbles and tool cards are peers in the flow, so a card
// permanently belongs to the turn that produced it.
export type ChatItem =
  | { kind: "user"; content: string }
  | { kind: "assistant"; content: string }
  | { kind: "card"; tool: string; output: string };

export type HarnessEvent = { turn: number; label: string };
