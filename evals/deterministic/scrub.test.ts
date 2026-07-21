// DETERMINISTIC EVAL — PII scrub redacts emails, IBANs and card numbers.

import { describe, expect, it } from "vitest";
import { scrub } from "../../src/ops/scrub.js";

describe("scrub", () => {
  it("redacts an email", () => {
    expect(scrub("contact me at jane.doe+x@example.co.uk please")).toBe(
      "contact me at [email] please",
    );
  });

  it("redacts an IBAN", () => {
    expect(scrub("IBAN DE89370400440532013000 ok")).toBe("IBAN [iban] ok");
  });

  it("redacts a card-like number run", () => {
    expect(scrub("card 4111 1111 1111 1111 end")).toBe("card [card] end");
  });

  it("leaves clean text untouched", () => {
    expect(scrub("what is the per diem for Germany?")).toBe("what is the per diem for Germany?");
  });
});
