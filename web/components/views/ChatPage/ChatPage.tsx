"use client";

import { ChatWindow } from "@/components/blocks/ChatWindow/ChatWindow";
import { ChatLayout } from "@/components/layouts/ChatLayout/ChatLayout";
import { useChatPage } from "./ChatPage.model";

/** The chat page: wires the interaction hook into the layout. */
export default function ChatPage() {
  const { items, draft, busy, status, setDraft, send } = useChatPage();

  return (
    <ChatLayout
      chat={
        <ChatWindow
          items={items}
          draft={draft}
          busy={busy}
          status={status}
          onDraftChange={setDraft}
          onSubmit={send}
        />
      }
    />
  );
}
