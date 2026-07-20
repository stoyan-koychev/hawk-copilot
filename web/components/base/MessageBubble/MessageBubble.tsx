import type { ReactNode } from "react";
import type { ChatRole } from "@/util/types";
import { Avatar } from "@/components/base/Avatar/Avatar";
import { cn } from "@/util/cn";

type MessageBubbleProps = {
  role: ChatRole;
  children: ReactNode;
};

/** A single chat row: an author avatar next to the bubble; the variant is
 *  chosen from the message role and the user's row is mirrored to the right. */
export function MessageBubble({ role, children }: MessageBubbleProps) {
  const isUser = role === "user";
  return (
    <div className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}>
      <Avatar role={role} />
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-base",
          // User text is plain (preserve newlines); assistant is Markdown-rendered.
          isUser
            ? "whitespace-pre-wrap rounded-br-sm bg-secondary text-background"
            : "rounded-bl-sm bg-white text-ink",
        )}
      >
        {children}
      </div>
    </div>
  );
}
