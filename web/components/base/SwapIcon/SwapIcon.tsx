type SwapIconProps = {
  className?: string;
};

/** Up/down arrows signalling the two currencies can be swapped. */
export function SwapIcon({ className }: SwapIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="m17 4 3 3-3 3" />
      <path d="M20 7H8" />
      <path d="m7 20-3-3 3-3" />
      <path d="M4 17h12" />
    </svg>
  );
}
