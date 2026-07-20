"use client";

import { Button } from "@/components/base/Button/Button";
import { SendIcon } from "@/components/base/SendIcon/SendIcon";
import { TextInput } from "@/components/base/TextInput/TextInput";
import { cn } from "@/util/cn";

type ComposerProps = {
  draft: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
};

/** The message input row: text field + send button. */
export function Composer({ draft, busy, onDraftChange, onSubmit, className }: ComposerProps) {
  return (
    <form
      className={cn("py-3 px-5 pb-5 w-full", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {/* The send button lives inside the field as a circular icon button. */}
      <div className="relative">
        <TextInput
          className="w-full rounded-full pr-14 py-3"
          value={draft}
          onChange={onDraftChange}
          placeholder="Ask anything about Payhawk"
          disabled={busy}
        />
        <Button
          disabled={busy}
          ariaLabel="Send message"
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full p-0"
        >
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
