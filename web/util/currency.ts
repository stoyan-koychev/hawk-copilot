// Pure parser for the convert_currency tool output. The agent emits a fixed
// string like "100 EUR = 195.58 BGN (rate 1.95583, Sun, 20 Jul 2026 00:00:01 +0000)";
// the UI turns a successful parse into an interactive exchange-rate card.

export type CurrencyConversion = {
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  rate: string;
  date: string;
};

const CONVERSION_PATTERN =
  /^([\d.]+) ([A-Z]{3}) = ([\d.]+) ([A-Z]{3}) \(rate ([\d.]+), (.+)\)$/;

/** Parse a currency-conversion tool output, or return null if it doesn't match. */
export function parseCurrencyResult(output: string): CurrencyConversion | null {
  const match = output.match(CONVERSION_PATTERN);
  if (!match) return null;
  const [, fromAmount, fromCurrency, toAmount, toCurrency, rate, date] = match;
  return {
    fromAmount: fromAmount!,
    fromCurrency: fromCurrency!,
    toAmount: toAmount!,
    toCurrency: toCurrency!,
    rate: rate!,
    date: date!,
  };
}

/** Money amount for display: 2 decimals with trailing zeros stripped (79.94, 65). */
export function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return "";
  return Number(n.toFixed(2)).toString();
}

/** Exchange rate for display: up to 6 significant digits, trimmed (1.95583, 1.2302). */
export function formatRate(n: number): string {
  if (!Number.isFinite(n)) return "";
  return Number(n.toPrecision(6)).toString();
}

/** The rate date in a compact readable form (e.g. "20 Jul 2026"); raw if unparseable. */
export function formatRateDate(raw: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
