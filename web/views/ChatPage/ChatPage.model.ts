"use client";

import { useState } from "react";
import { formatToolLabel, formatUsageLabel } from "@/util/harness-label";
import type { ChatItem, HarnessEvent } from "@/util/types";

// What the browser sends back as prior conversation. Cards are UI-only and are
// never part of the history, so only user/assistant bubbles qualify.
type HistoryMessage = { role: "user" | "assistant"; content: string };

export type UseChatPage = {
  items: ChatItem[];
  events: HarnessEvent[];
  draft: string;
  busy: boolean;
  setDraft: (value: string) => void;
  send: () => Promise<void>;
};

/**
 * Owns the whole chat interaction: message + harness state, and the streaming
 * request that reads the SSE frames and folds them into the timeline. The server
 * is stateless, so prior bubbles are replayed as history on every turn.
 */
export function useChatPage(): UseChatPage {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [events, setEvents] = useState<HarnessEvent[]>([]);
  const [turn, setTurn] = useState(0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  /** Replace the trailing assistant bubble (the streaming placeholder). */
  const setReply = (content: string) =>
    setItems((list) => {
      const index = list.findLastIndex((item) => item.kind === "assistant");
      return [...list.slice(0, index), { kind: "assistant", content }, ...list.slice(index + 1)];
    });

  /** Insert a card BEFORE the streaming assistant bubble — under its question. */
  const addCard = (tool: string, output: string) =>
    setItems((list) => {
      const index = list.findLastIndex((item) => item.kind === "assistant");
      return [...list.slice(0, index), { kind: "card", tool, output }, ...list.slice(index)];
    });

  const send = async () => {
    const question = draft.trim();
    if (!question || busy) return;
    setDraft("");
    setBusy(true);
    const thisTurn = turn + 1;
    setTurn(thisTurn);

    // history = prior bubbles only (cards are UI, not conversation)
    const history: HistoryMessage[] = items
      .filter((item): item is Exclude<ChatItem, { kind: "card" }> => item.kind !== "card")
      .map((item) => ({ role: item.kind, content: item.content }));

    setItems((list) => [
      ...list,
      { kind: "user", content: question },
      { kind: "assistant", content: "" },
    ]);

    let streamed = "";
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, history }),
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (!frame.startsWith("data: ")) continue;
        const event = JSON.parse(frame.slice(6));
        if (event.kind === "text") {
          streamed += event.delta;
          setReply(streamed);
        } else if (event.kind === "tool") {
          setEvents((list) => [
            ...list,
            { turn: thisTurn, label: formatToolLabel(event.tool, event.args) },
          ]);
          if (event.output) addCard(event.tool, event.output);
        } else if (event.kind === "llm") {
          setEvents((list) => [
            ...list,
            { turn: thisTurn, label: formatUsageLabel(event.usage) },
          ]);
        } else if (event.kind === "done") {
          setReply(event.error ? `Something went wrong: ${event.error}` : event.reply);
        }
      }
    }
    setBusy(false);
  };

  return { items, events, draft, busy, setDraft, send };
}
