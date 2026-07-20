import { describe, expect, it } from "vitest";
import { parseCurrencyResult } from "./currency";

describe("parseCurrencyResult", () => {
  it("parses a well-formed conversion string", () => {
    expect(parseCurrencyResult("100 EUR = 195.58 BGN (rate 1.95583, open.er-api.com)")).toEqual({
      fromAmount: "100",
      fromCurrency: "EUR",
      toAmount: "195.58",
      toCurrency: "BGN",
      rate: "1.95583",
      source: "open.er-api.com",
    });
  });

  it("returns null for output that is not a conversion", () => {
    expect(parseCurrencyResult("same currency, nothing to convert")).toBeNull();
  });
});
