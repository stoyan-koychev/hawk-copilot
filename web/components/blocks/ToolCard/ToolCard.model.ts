import { type CurrencyConversion, parseCurrencyResult } from "@/util/currency";

/**
 * Interprets a tool output for display. Currency conversions become a rich
 * animated card; everything else falls back to a generic mono card.
 */
export function useToolCard(output: string): CurrencyConversion | null {
  return parseCurrencyResult(output);
}
