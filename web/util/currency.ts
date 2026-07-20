// Pure parser for the convert_currency tool output. The agent emits a fixed
// string like "100 EUR = 195.58 BGN (rate 1.95583, open.er-api.com)"; the UI
// turns a successful parse into an animated exchange-rate card.

export type CurrencyConversion = {
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  rate: string;
  source: string;
};

const CONVERSION_PATTERN =
  /^([\d.]+) ([A-Z]{3}) = ([\d.]+) ([A-Z]{3}) \(rate ([\d.]+), (.+)\)$/;

/** Parse a currency-conversion tool output, or return null if it doesn't match. */
export function parseCurrencyResult(output: string): CurrencyConversion | null {
  const match = output.match(CONVERSION_PATTERN);
  if (!match) return null;
  const [, fromAmount, fromCurrency, toAmount, toCurrency, rate, source] = match;
  return {
    fromAmount: fromAmount!,
    fromCurrency: fromCurrency!,
    toAmount: toAmount!,
    toCurrency: toCurrency!,
    rate: rate!,
    source: source!,
  };
}
