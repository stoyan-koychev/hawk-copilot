import { describe, expect, it } from "vitest";
import { splitTextAndLinks } from "./linkify";

describe("splitTextAndLinks", () => {
  it("returns a single text segment when there is no link", () => {
    expect(splitTextAndLinks("just words")).toEqual([{ type: "text", value: "just words" }]);
  });

  it("splits a link out from surrounding text, preserving order", () => {
    expect(splitTextAndLinks("see https://payhawk.com/docs now")).toEqual([
      { type: "text", value: "see " },
      { type: "link", value: "https://payhawk.com/docs" },
      { type: "text", value: " now" },
    ]);
  });

  it("handles a string that is only a link", () => {
    expect(splitTextAndLinks("https://payhawk.com")).toEqual([
      { type: "link", value: "https://payhawk.com" },
    ]);
  });

  it("returns nothing for an empty string", () => {
    expect(splitTextAndLinks("")).toEqual([]);
  });
});
