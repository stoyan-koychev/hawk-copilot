import type { ChatItem } from "@/util/types";
import { ChatHeader } from "@/blocks/ChatHeader/ChatHeader";
import { Composer } from "@/blocks/Composer/Composer";
import { EmptyState } from "@/blocks/EmptyState/EmptyState";
import { MessageTimeline } from "@/blocks/MessageTimeline/MessageTimeline";

type ChatWindowProps = {
  items: ChatItem[];
  draft: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
};

/** The left panel: header, scrollable timeline (or hero), and the composer. */
export function ChatWindow({ items, draft, busy, onDraftChange, onSubmit }: ChatWindowProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-secondary/10 bg-white shadow-lg shadow-secondary/5">
      <ChatHeader />
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {items.length === 0 ? <EmptyState /> : <MessageTimeline items={items} />}
      </div>
      <Composer draft={draft} busy={busy} onDraftChange={onDraftChange} onSubmit={onSubmit} />
    </div>
  );
}
