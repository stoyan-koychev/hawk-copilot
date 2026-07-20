"use client";

import { Button } from "@/base/Button/Button";
import { TextInput } from "@/base/TextInput/TextInput";

type ComposerProps = {
  draft: string;
  busy: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
};

/** The message input row: text field + send button. */
export function Composer({ draft, busy, onDraftChange, onSubmit }: ComposerProps) {
  return (
    <form
      className="flex gap-2 border-t border-secondary/10 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <TextInput
        className="flex-1"
        value={draft}
        onChange={onDraftChange}
        placeholder="Ask anything about Payhawk"
        disabled={busy}
      />
      <Button disabled={busy}>Send</Button>
    </form>
  );
}
