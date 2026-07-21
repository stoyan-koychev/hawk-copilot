"use client";

import type { ReactNode } from "react";
import { CloseIcon } from "@/components/base/CloseIcon/CloseIcon";
import { cn } from "@/util/cn";
import { useIsResizing } from "./Sidebar.model";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

/**
 * The harness sidebar. On desktop (md+) it's in-flow and animates its width so
 * the chat beside it resizes. On mobile it becomes a slide-over drawer with a
 * tap-to-close backdrop, overlaying the chat instead of squeezing it.
 */
export function Sidebar({ open, onClose, children }: SidebarProps) {
  const resizing = useIsResizing();

  return (
    <>
      {/* Backdrop — mobile only; tap to close. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-primary/40 transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
          resizing && "transition-none",
        )}
      />
      <aside
        aria-hidden={!open}
        className={cn(
          // Mobile: fixed drawer sliding in from the right, over the content.
          "fixed inset-y-0 right-0 z-40 w-[85%] max-w-[340px] translate-x-full transition-transform duration-300 ease-out motion-reduce:transition-none",
          open && "translate-x-0",
          // Desktop: in-flow, width-animated, resizes the chat beside it.
          "md:static md:h-full md:w-0 md:max-w-none md:shrink-0 md:translate-x-0 md:overflow-hidden md:transition-[width]",
          open && "md:w-[340px]",
          // Suppress transitions during resize so the breakpoint swap doesn't flash.
          resizing && "transition-none md:transition-none",
        )}
      >
        <div className="flex h-full w-full flex-col bg-white shadow-[-8px_0_24px_rgba(4,24,24,0.08)] md:w-[340px]">
          <div className="flex items-center justify-between border-b border-secondary/10 px-4 py-3">
            <h2 className="font-heading text-sm font-semibold text-primary">
              Harness &mdash; full session
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition hover:bg-secondary/10 hover:text-primary"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      </aside>
    </>
  );
}
