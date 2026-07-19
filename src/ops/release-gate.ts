/**
 * Release gate - the diamond before "ship".
 *
 * Changed the prompt? Swapped a model? Tuned retrieval? Run the gate:
 *
 *     pnpm gate
 *
 * Deterministic evals must pass 100% - they are unit tests; one failure
 * blocks. Judge evals run when a key is present and must clear threshold.
 * Exit code 0 = ship. Writes eval_report.json (+ history) with the config
 * version, so every verdict is attributable to an exact prompt+knobs state.
 */

import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { ensureHome, loadSettings } from "../config.js";
import { PROVIDERS } from "../loop/providers.js";
import { configVersion } from "./version.js";

const REPO = path.resolve(import.meta.dirname, "../..");

type Counts = { passed: number; failed: number };

/** Run a vitest suite; counts come from the JSON reporter (exact, never a
 * stdout regex). */
const run = (suite: string): [number, Counts] => {
  console.log(`\n=== ${suite} ===`);
  const outputFile = path.join(REPO, `.vitest-${suite}.json`);
  const proc = spawnSync(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      `evals/${suite}`,
      "--reporter=default",
      "--reporter=json",
      `--outputFile=${outputFile}`,
    ],
    { cwd: REPO, stdio: ["ignore", "inherit", "inherit"] },
  );
  let counts: Counts = { passed: 0, failed: 0 };
  if (existsSync(outputFile)) {
    try {
      const report = JSON.parse(readFileSync(outputFile, "utf-8")) as {
        numPassedTests?: number;
        numFailedTests?: number;
      };
      counts = {
        passed: report.numPassedTests ?? 0,
        failed: report.numFailedTests ?? 0,
      };
    } catch {
      // 0/0 on a parse miss is honest
    }
    unlinkSync(outputFile);
  }
  return [proc.status ?? 1, counts];
};

/** Persist the verdict AND append it to the run history. */
const report = (
  deterministic: string,
  judge: string,
  suites: Record<string, Counts>,
): void => {
  const settings = loadSettings();
  ensureHome(settings.home);
  const record = {
    deterministic,
    judge,
    suites,
    config: configVersion(),
    ran_at: new Date().toISOString(),
  };
  writeFileSync(
    path.join(settings.home, "eval_report.json"),
    JSON.stringify(record),
    "utf-8",
  );
  appendFileSync(
    path.join(settings.home, "eval_runs.jsonl"),
    `${JSON.stringify(record)}\n`,
    "utf-8",
  );
};

const main = (): void => {
  const suites: Record<string, Counts> = {};
  const [detCode, detCounts] = run("deterministic");
  suites.deterministic = detCounts;
  if (detCode !== 0) {
    report("fail", "not run", suites);
    console.log(
      "\nGATE CLOSED - deterministic evals failed. Fix before releasing.",
    );
    process.exit(1);
  }

  // judge needs the ACTIVE provider's key - same rule as HAS_KEY
  const settings = loadSettings();
  const provider = PROVIDERS[settings.provider];
  if (settings.apiKey || (provider && process.env[provider.keyEnv])) {
    const [judgeCode, judgeCounts] = run("judge");
    suites.judge = judgeCounts;
    if (judgeCode !== 0) {
      report("pass", "fail", suites);
      console.log("\nGATE CLOSED - judge scores below threshold.");
      process.exit(1);
    }
    report("pass", "pass", suites);
  } else {
    report("pass", "skipped", suites);
    console.log(
      `\n(judge suite skipped: no API key for provider '${settings.provider}')`,
    );
  }

  console.log(`\nGATE OPEN - safe to release.  (config ${configVersion()})`);
};

main();
