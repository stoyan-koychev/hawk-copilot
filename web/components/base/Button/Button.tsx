import type { ReactNode } from "react";
import { cn } from "@/util/cn";

type ButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

/** The accent submit button used by the composer. */
export function Button({ children, disabled, className, ariaLabel }: ButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "rounded-xl bg-accent px-5 py-2.5 text-base font-semibold text-primary transition hover:brightness-95 disabled:opacity-50",
        className,
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
