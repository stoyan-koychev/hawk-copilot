"use client";

import type { ReactNode } from "react";
import { MenuIcon } from "@/components/base/MenuIcon/MenuIcon";
import { Sidebar } from "@/components/blocks/Sidebar/Sidebar";
import { cn } from "@/util/cn";
import { useSidebar } from "./ChatLayout.model";

type ChatLayoutProps = {
  chat: ReactNode;
  sidebar: ReactNode;
};

/** App shell: the centered chat column plus an in-flow, toggleable sidebar that
 *  resizes the chat when it opens. */
export function ChatLayout({ chat, sidebar }: ChatLayoutProps) {
  const { open, toggle, close } = useSidebar();

  return (
    <main className="flex h-dvh w-full">
      <section className="relative flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4">{chat}</div>
        <button
          type="button"
          onClick={toggle}
          aria-label="Open panel"
          className={cn(
            "absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-secondary/15 bg-white text-secondary shadow-sm transition hover:border-accent hover:text-primary",
            open && "pointer-events-none opacity-0",
          )}
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </section>
      <Sidebar open={open} onClose={close}>
        {sidebar}
      </Sidebar>
    </main>
  );
}
