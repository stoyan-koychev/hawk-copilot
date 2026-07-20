import type { ChatItem } from "@/util/types";

import { Composer } from "@/components/blocks/Composer/Composer";
import { EmptyState } from "@/components/blocks/EmptyState/EmptyState";
import { ExamplePrompts } from "@/components/blocks/ExamplePrompts/ExamplePrompts";
import { MessageTimeline } from "@/components/blocks/MessageTimeline/MessageTimeline";

type ChatWindowProps = {
  items: ChatItem[];
  draft: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (text?: string) => void;
};

/** The left panel: welcome/landing state, or scrollable timeline + bottom composer. */
export function ChatWindow({ items, draft, busy, onDraftChange, onSubmit }: ChatWindowProps) {


  if (items.length === 0) {
    // Landing state: welcome text, a centered composer, and starter prompts.
    return (
      <div className="flex w-full flex-col overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-10 ">
          <EmptyState />
          <ExamplePrompts onSelect={onSubmit} disabled={busy} />
          <Composer draft={draft} busy={busy} onDraftChange={onDraftChange} onSubmit={onSubmit} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-5">
        <MessageTimeline items={items} />
      </div>
      <Composer draft={draft} busy={busy} onDraftChange={onDraftChange} onSubmit={onSubmit} />
    </div>
  );
}
