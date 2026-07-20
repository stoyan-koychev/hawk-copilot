import { cn } from "@/util/cn";

type PromptCardProps = {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

/** A clickable example-prompt box shown on the empty state. */
export function PromptCard({ text, onClick, disabled, className }: PromptCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl border text-center border-secondary/15 bg-white p-3 text-sm text-secondary transition duration-200",
        "cursor-pointer hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-secondary/10",
        "disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-secondary/15 disabled:hover:shadow-none",
        className,
      )}
    >
      {text}
    </button>
  );
}
