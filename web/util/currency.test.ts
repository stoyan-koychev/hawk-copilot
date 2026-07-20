import { describe, expect, it } from "vitest";
import { formatAmount, formatRate, formatRateDate, parseCurrencyResult } from "./currency";

describe("parseCurrencyResult", () => {
  it("parses a well-formed conversion string, capturing the rate date", () => {
    expect(
      parseCurrencyResult("100 EUR = 195.58 BGN (rate 1.95583, Sun, 20 Jul 2026 00:00:01 +0000)"),
    ).toEqual({
      fromAmount: "100",
      fromCurrency: "EUR",
      toAmount: "195.58",
      toCurrency: "BGN",
      rate: "1.95583",
      date: "Sun, 20 Jul 2026 00:00:01 +0000",
    });
  });

  it("returns null for output that is not a conversion", () => {
    expect(parseCurrencyResult("same currency, nothing to convert")).toBeNull();
  });
});

describe("formatAmount", () => {
  it("keeps 2 decimals but strips trailing zeros", () => {
    expect(formatAmount(79.9401)).toBe("79.94");
    expect(formatAmount(65)).toBe("65");
    expect(formatAmount(195.5)).toBe("195.5");
  });

  it("returns empty string for non-finite input", () => {
    expect(formatAmount(Number.NaN)).toBe("");
  });
});

describe("formatRate", () => {
  it("shows up to 6 significant digits, trimmed", () => {
    expect(formatRate(1.95583)).toBe("1.95583");
    expect(formatRate(1.23021234)).toBe("1.23021");
  });
});

describe("formatRateDate", () => {
  it("formats a parseable date compactly", () => {
    expect(formatRateDate("Sun, 20 Jul 2026 00:00:01 +0000")).toBe("20 Jul 2026");
  });

  it("falls back to the raw string when unparseable", () => {
    expect(formatRateDate("latest")).toBe("latest");
  });
});
