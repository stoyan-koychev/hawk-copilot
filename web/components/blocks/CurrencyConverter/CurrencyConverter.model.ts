"use client";

import { useState } from "react";
import { type CurrencyConversion, formatAmount, formatRate } from "@/util/currency";

export type UseCurrencyConverter = {
  fromCode: string;
  toCode: string;
  fromValue: string;
  toValue: string;
  rateLabel: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  swap: () => void;
};

/**
 * Two-way currency field state. The rate is fixed (from the tool result), so
 * editing either side recomputes the other; swap flips the pair and inverts
 * the rate. All local — no refetching.
 */
export function useCurrencyConverter(conversion: CurrencyConversion): UseCurrencyConverter {
  const [fromCode, setFromCode] = useState(conversion.fromCurrency);
  const [toCode, setToCode] = useState(conversion.toCurrency);
  const [rate, setRate] = useState(Number.parseFloat(conversion.rate));
  const [fromValue, setFromValue] = useState(conversion.fromAmount);
  const [toValue, setToValue] = useState(conversion.toAmount);

  // Convert one side into the other's display string; blank/invalid input clears it.
  const convert = (value: string, factor: number): string => {
    if (value.trim() === "") return "";
    const amount = Number(value);
    return Number.isFinite(amount) ? formatAmount(amount * factor) : "";
  };

  const onFromChange = (value: string) => {
    setFromValue(value);
    setToValue(convert(value, rate));
  };

  const onToChange = (value: string) => {
    setToValue(value);
    setFromValue(convert(value, 1 / rate));
  };

  const swap = () => {
    setFromCode(toCode);
    setToCode(fromCode);
    setRate(1 / rate);
    setFromValue(toValue);
    setToValue(fromValue);
  };

  return {
    fromCode,
    toCode,
    fromValue,
    toValue,
    rateLabel: formatRate(rate),
    onFromChange,
    onToChange,
    swap,
  };
}
