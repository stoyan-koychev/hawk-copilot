"use client";


import { type CurrencyConversion, formatRateDate } from "@/util/currency";
import { useCurrencyConverter } from "./CurrencyConverter.model";

type CurrencyConverterProps = {
  conversion: CurrencyConversion;
};

/** One editable currency row: code on the left, amount input on the right. */
function ConverterRow({
  code,
  value,
  onChange,
}: {
  code: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-xl">
      <span className="text-lg  text-primary opacity-70">{code}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        className="bg-secondary/5  w-32 rounded-xl border border-secondary/5 px-3 py-2 text-right text-2xl font-bold text-primary outline-none placeholder:text-secondary/30"
      />
    </div>
  );
}

/** Interactive live-rate converter shown for a convert_currency tool result. */
export function CurrencyConverter({ conversion }: CurrencyConverterProps) {
  const { fromCode, toCode, fromValue, toValue, onFromChange, onToChange } =
    useCurrencyConverter(conversion);

  return (
    <div className="tool-card my-1 w-[320px] rounded-2xl  bg-white p-2">
      <div className="flex items-center justify-between px-2 pt-2">
        <span className="text-[12px] text-secondary/50">{formatRateDate(conversion.date)}</span>
        <span className="text-[12px] font-semibold uppercase tracking-wide text-secondary">
          live exchange rate
        </span>
      </div>

      <div className="mt-2">
        <ConverterRow code={fromCode} value={fromValue} onChange={onFromChange} />

        {/* Swap button on the left with the rate pill centered between the rows. */}


        <ConverterRow code={toCode} value={toValue} onChange={onToChange} />
      </div>
    </div>
  );
}
