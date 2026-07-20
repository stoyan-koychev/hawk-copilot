import { cn } from "@/util/cn";

type PromptCardProps = {
  text: string;
  onClick: () => void;
  disabled?: boolean;
};

/** A clickable example-prompt box shown on the empty state. */
export function PromptCard({ text, onClick, disabled }: PromptCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl border text-center border-secondary/15 bg-white p-3 text-sm text-secondary transition",
        "cursor-pointer disabled:opacity-50",
      )}
    >
      {text}
    </button>
  );
}
