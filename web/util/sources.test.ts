import { describe, expect, it } from "vitest";
import { splitSourcesBlock } from "./sources";

describe("splitSourcesBlock", () => {
  it("returns the whole content as body when there is no sources block", () => {
    expect(splitSourcesBlock("Just an answer.")).toEqual({
      body: "Just an answer.",
      sources: [],
    });
  });

  it("extracts a closed sources block and parses its lines", () => {
    const content = [
      "Your card was declined [1].",
      "",
      "```sources",
      "[1] | Why cards get declined | https://payhawk.com/help/declines",
      "[2] | Card limits | https://payhawk.com/help/limits",
      "```",
    ].join("\n");
    expect(splitSourcesBlock(content)).toEqual({
      body: "Your card was declined [1].",
      sources: [
        { index: 1, title: "Why cards get declined", url: "https://payhawk.com/help/declines" },
        { index: 2, title: "Card limits", url: "https://payhawk.com/help/limits" },
      ],
    });
  });

  it("hides an open (still-streaming) block from the body and yields no sources yet", () => {
    const content = "Your card was declined [1].\n\n```sources\n[1] | Why cards";
    expect(splitSourcesBlock(content)).toEqual({
      body: "Your card was declined [1].",
      sources: [],
    });
  });

  it("skips malformed source lines", () => {
    const content = "Answer.\n```sources\nnot a source line\n[1] | Good | https://x.com\n```";
    expect(splitSourcesBlock(content).sources).toEqual([
      { index: 1, title: "Good", url: "https://x.com" },
    ]);
  });
});
