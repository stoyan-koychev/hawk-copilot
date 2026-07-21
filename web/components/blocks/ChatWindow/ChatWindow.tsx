"use client";

import type { AgentStatus, ChatItem } from "@/util/types";

import { Composer } from "@/components/blocks/Composer/Composer";
import { LandingScreen } from "@/components/blocks/LandingScreen/LandingScreen";
import { MessageTimeline } from "@/components/blocks/MessageTimeline/MessageTimeline";
import { useAutoScroll } from "./ChatWindow.model";

type ChatWindowProps = {
  items: ChatItem[];
  draft: string;
  busy: boolean;
  status: AgentStatus | null;
  onDraftChange: (value: string) => void;
  onSubmit: (text?: string) => void;
};

/** The left panel: welcome/landing state, or scrollable timeline + bottom composer. */
export function ChatWindow({
  items,
  draft,
  busy,
  status,
  onDraftChange,
  onSubmit,
}: ChatWindowProps) {
  const scrollRef = useAutoScroll(items);

  if (items.length === 0) {
    // Landing state: welcome text, starter prompts, and composer, animated in.
    return (
      <LandingScreen
        draft={draft}
        busy={busy}
        onDraftChange={onDraftChange}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-5">
        <MessageTimeline items={items} status={status} />
      </div>
      <Composer draft={draft} busy={busy} onDraftChange={onDraftChange} onSubmit={onSubmit} />
    </div>
  );
}
