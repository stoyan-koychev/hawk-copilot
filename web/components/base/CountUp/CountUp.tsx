"use client";

import { useCountUp } from "./CountUp.model";

type CountUpProps = {
  value: number;
  suffix: string;
};

/** Displays a number that animates up from zero to `value` on mount. */
export function CountUp({ value, suffix }: CountUpProps) {
  const shown = useCountUp(value);
  return (
    <span className="text-lg font-bold tabular-nums">
      {shown.toFixed(2)} {suffix}
    </span>
  );
}
