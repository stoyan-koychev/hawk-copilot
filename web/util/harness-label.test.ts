import { describe, expect, it } from "vitest";
import { formatToolLabel, formatUsageLabel } from "./harness-label";

describe("formatToolLabel", () => {
  it("renders the tool name with JSON-serialized arguments", () => {
    expect(formatToolLabel("search_docs", { query: "per diem" })).toBe(
      'search_docs({"query":"per diem"})',
    );
  });
});

describe("formatUsageLabel", () => {
  it("renders the token counts for a call", () => {
    expect(formatUsageLabel({ in: 1200, out: 340 })).toBe("llm call - in 1200 / out 340 tokens");
  });
});
