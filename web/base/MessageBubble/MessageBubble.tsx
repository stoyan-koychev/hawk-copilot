import type { ReactNode } from "react";
import type { ChatRole } from "@/util/types";
import { cn } from "@/util/cn";

type MessageBubbleProps = {
  role: ChatRole;
  children: ReactNode;
};

/** A single chat bubble; the variant is chosen from the message role. */
export function MessageBubble({ role, children }: MessageBubbleProps) {
  const isUser = role === "user";
  return (
    <div className={cn(isUser && "text-right")}>
      <div
        className={cn(
          "inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-base",
          isUser
            ? "rounded-br-sm bg-secondary text-background"
            : "rounded-bl-sm border border-secondary/10 bg-background text-ink",
        )}
      >
        {children}
      </div>
    </div>
  );
}
