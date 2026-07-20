import { describe, expect, it } from "vitest";
import { statusLabel } from "./status-label";

describe("statusLabel", () => {
  it("labels the thinking state", () => {
    expect(statusLabel({ kind: "thinking" })).toBe("Thinking");
  });

  it("maps known tools to friendly phrases", () => {
    expect(statusLabel({ kind: "tool", tool: "search_docs" })).toBe("Searching the documents");
    expect(statusLabel({ kind: "tool", tool: "read_full_doc" })).toBe("Reading the document");
    expect(statusLabel({ kind: "tool", tool: "convert_currency" })).toBe(
      "Calculating the exchange rate",
    );
  });

  it("falls back to a generic phrase for unknown tools", () => {
    expect(statusLabel({ kind: "tool", tool: "do_magic" })).toBe("Using do_magic");
  });
});
