import type { ReactNode } from "react";
import Link from "next/link";

type ChatLayoutProps = {
  chat: ReactNode;
};

/** App shell: the centered chat column with a link out to the traces dashboard. */
export function ChatLayout({ chat }: ChatLayoutProps) {
  return (
    <main className="flex h-dvh w-full">
      <section className="relative flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4">{chat}</div>
        <Link
          href="/ops"
          className="absolute right-4 top-4 rounded-full border border-secondary/15 bg-white px-4 py-2 text-sm font-medium text-secondary shadow-sm transition hover:border-accent hover:text-primary"
        >
          Traces
        </Link>
      </section>
    </main>
  );
}
