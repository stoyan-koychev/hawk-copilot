import type { ChatRole } from "@/util/types";
import { cn } from "@/util/cn";

type AvatarProps = {
  role: ChatRole;
};

// The agent is "P" (Payhawk copilot), the person is "U" (user).
const AVATAR_LETTER: Record<ChatRole, string> = { assistant: "P", user: "U" };

/** A small round avatar showing a single-letter initial for the message author. */
export function Avatar({ role }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase",
        role === "user" ? "bg-secondary text-background" : "bg-accent text-primary",
      )}
    >
      {AVATAR_LETTER[role]}
    </div>
  );
}
