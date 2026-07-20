import { defineConfig } from "vitest/config";

// Web-local config so Vitest scopes to this workspace's util tests instead of
// inheriting the root config (which targets evals/). These are pure functions,
// so the default node environment is all we need.
export default defineConfig({
  test: {
    include: ["util/**/*.test.ts"],
  },
});
