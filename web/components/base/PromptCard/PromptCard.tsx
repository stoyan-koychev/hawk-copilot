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
        // Only transition border + shadow (for the hover) — leave transform/opacity
        // to the GSAP entrance so the two don't fight and cause a snap.
        "rounded-xl border text-center border-secondary/15 bg-white p-3 text-sm text-secondary transition-[border-color,box-shadow] duration-200",
        "cursor-pointer hover:border-accent hover:shadow-lg hover:shadow-secondary/10",
        "disabled:cursor-default disabled:opacity-50 disabled:hover:border-secondary/15 disabled:hover:shadow-none",
        className,
      )}
    >
      {text}
    </button>
  );
}
