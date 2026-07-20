import { cn } from "@/util/cn";

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/** Single-line text field with the app's accent focus ring. */
export function TextInput({ value, onChange, placeholder, disabled, className }: TextInputProps) {
  return (
    <input
      className={cn(
        "rounded-xl bg-white px-4 py-2.5 text-base text-ink outline-none placeholder:text-secondary/40 focus:border-accent focus:ring-2 focus:ring-accent/40",
        className,
      )}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
