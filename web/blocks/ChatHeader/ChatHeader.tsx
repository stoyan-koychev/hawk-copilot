import { StatusDot } from "@/base/StatusDot/StatusDot";

/** Top bar of the chat window: status dot + grounded-in-docs title. */
export function ChatHeader() {
  return (
    <header className="flex items-center gap-2 border-b border-secondary/10 bg-primary px-5 py-3">
      <StatusDot />
      <h1 className="text-h1 font-semibold text-background">
        Hawk Copilot{" "}
        <span className="font-normal text-accent/80">&mdash; grounded in Payhawk docs</span>
      </h1>
    </header>
  );
}
