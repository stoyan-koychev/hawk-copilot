import type { ReactNode } from "react";

type ChatLayoutProps = {
  chat: ReactNode;
  harness: ReactNode;
};

/** Page-level grid: main chat column on the left, harness console on the right. */
export function ChatLayout({ chat, harness }: ChatLayoutProps) {
  return (
    <main className="mx-auto grid h-screen max-w-5xl grid-cols-[1fr_300px] gap-4 p-4">
      {chat}
      {harness}
    </main>
  );
}
