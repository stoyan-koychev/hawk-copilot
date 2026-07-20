import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins plain class strings", () => {
    expect(cn("rounded", "border")).toBe("rounded border");
  });

  it("drops falsy conditional classes", () => {
    const busy = false;
    const active = true;
    expect(cn("base", busy && "opacity-50", active && "bg-accent")).toBe("base bg-accent");
  });

  it("flattens arrays and objects", () => {
    expect(cn(["rounded", "border"], { "bg-accent": true, hidden: false })).toBe(
      "rounded border bg-accent",
    );
  });

  it("resolves conflicting Tailwind utilities so the last one wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
