import type { ReactNode } from "react";

type ChatLayoutProps = {
  chat: ReactNode;
};

/** App shell: the centered chat column. Global nav lives in the root layout. */
export function ChatLayout({ chat }: ChatLayoutProps) {
  return (
    <main className="flex h-dvh w-full">
      <section className="relative flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4">{chat}</div>
      </section>
    </main>
  );
}
