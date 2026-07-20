/**
 * convert_currency — live exchange rates via open.er-api.com (free, keyless,
 * ~166 currencies). Payhawk is multi-currency spend; per diems, reimbursements
 * and card transactions cross currencies constantly. The model must NEVER
 * compute FX from memory — training-data rates are stale by definition.
 */

import type { Tool } from "./registry.js";

export const makeConvertCurrencyTool = (): Tool => ({
  name: "convert_currency",
  description:
    "Convert an amount between currencies using today's live exchange rates. " +
    "Use for ANY currency conversion (per diems, expenses, reimbursements) — never " +
    "estimate exchange rates yourself.",
  inputSchema: {
    type: "object",
    properties: {
      amount: { type: "number", description: "the amount to convert" },
      from: { type: "string", description: "ISO code, e.g. EUR" },
      to: { type: "string", description: "ISO code, e.g. BGN" },
    },
    required: ["amount", "from", "to"],
  },
  run: async (args) => {
    const amount = Number(args.amount);
    const from = String(args.from ?? "").toUpperCase();
    const to = String(args.to ?? "").toUpperCase();
    if (
      !Number.isFinite(amount) ||
      !/^[A-Z]{3}$/.test(from) ||
      !/^[A-Z]{3}$/.test(to)
    ) {
      return "convert_currency needs a numeric amount and two 3-letter ISO currency codes.";
    }
    if (from === to) return `${amount} ${from} is already in ${to}.`;

    const resp = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) {
      return `Currency service error (${resp.status}) — try again shortly.`;
    }
    const data = (await resp.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };
    const rate = data.rates?.[to];
    if (data.result !== "success" || rate === undefined) {
      return `No rate available for ${from}→${to} (unknown currency code?).`;
    }
    const converted = Math.round(amount * rate * 100) / 100;
    return `${amount} ${from} = ${converted} ${to} (rate ${rate}, ${data.time_last_update_utc ?? "latest"})`;
  },
});
