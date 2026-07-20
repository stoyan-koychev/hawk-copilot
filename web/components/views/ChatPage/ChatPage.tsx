"use client";

import { ChatWindow } from "@/components/blocks/ChatWindow/ChatWindow";
import { HarnessPanel } from "@/components/blocks/HarnessPanel/HarnessPanel";
import { useChatPage } from "./ChatPage.model";

/** The chat page: wires the interaction hook into the layout and its panels. */
export default function ChatPage() {
  const { items, events, draft, busy, status, setDraft, send } = useChatPage();

  return (
    <main className="mx-auto grid h-screen max-w-3xl w-full gap-4 px-4">
      <ChatWindow
        items={items}
        draft={draft}
        busy={busy}
        status={status}
        onDraftChange={setDraft}
        onSubmit={send}
      />
      {/* <HarnessPanel events={events} /> */}
    </main>
  );
}
