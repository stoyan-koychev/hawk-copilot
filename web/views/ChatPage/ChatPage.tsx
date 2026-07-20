"use client";

import { ChatWindow } from "@/blocks/ChatWindow/ChatWindow";
import { HarnessPanel } from "@/blocks/HarnessPanel/HarnessPanel";
import { ChatLayout } from "@/layouts/ChatLayout/ChatLayout";
import { useChatPage } from "./ChatPage.model";

/** The chat page: wires the interaction hook into the layout and its panels. */
export default function ChatPage() {
  const { items, events, draft, busy, setDraft, send } = useChatPage();

  return (
    <ChatLayout
      chat={
        <ChatWindow
          items={items}
          draft={draft}
          busy={busy}
          onDraftChange={setDraft}
          onSubmit={send}
        />
      }
      harness={<HarnessPanel events={events} />}
    />
  );
}
