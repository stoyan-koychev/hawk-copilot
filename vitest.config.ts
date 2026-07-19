import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["evals/**/*.test.ts"],
    testTimeout: 120_000,
    // Live/judge tests hit real APIs; keep runs sequential so scripted and
    // live tiers never fight over env vars or rate limits.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
