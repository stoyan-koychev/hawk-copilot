import { describe, expect, it } from "vitest";
import { groupEventsByTurn } from "./harness-group";

describe("groupEventsByTurn", () => {
  it("returns nothing for no events", () => {
    expect(groupEventsByTurn([])).toEqual([]);
  });

  it("collects one turn's events into a single group", () => {
    expect(
      groupEventsByTurn([
        { turn: 1, label: "llm call" },
        { turn: 1, label: "search_docs(...)" },
        { turn: 1, label: "llm call" },
      ]),
    ).toEqual([{ turn: 1, labels: ["llm call", "search_docs(...)", "llm call"] }]);
  });

  it("splits consecutive turns into separate groups in order", () => {
    expect(
      groupEventsByTurn([
        { turn: 1, label: "a" },
        { turn: 1, label: "b" },
        { turn: 2, label: "c" },
      ]),
    ).toEqual([
      { turn: 1, labels: ["a", "b"] },
      { turn: 2, labels: ["c"] },
    ]);
  });
});
