/**
 * Trace — one trace per run (the LLM-Ops box, first step).
 *
 * JSONL, always on: every turn appends readable lines to
 * .waku/traces/<date>.jsonl. A trace is just "what happened, in order" —
 * open the file and read your agent's mind. Zero dependencies.
 *
 * (The Python original could also export OpenTelemetry spans; the port keeps
 * the JSONL side only.)
 */

import { appendFileSync } from "node:fs";
import path from "node:path";
import { ensureHome, type Settings } from "../config.js";
import type { LoopEvent, Observer } from "../types.js";
import { makeDbTracer } from "./db-tracer.js";

/** Local calendar date as YYYY-MM-DD. (toISOString() is UTC and would stamp
 * evening chats with tomorrow's date for anyone east of Greenwich.) */
export const localDateISO = (d = new Date()): string => {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const now = (): string =>
  new Date().toISOString().replace(/\.(\d{3})Z$/, ".$1+00:00");

export type Tracer = {
  /** Doubles as a loop Observer: pass `tracer.event` anywhere an observer
   * goes and every loop step lands in the trace. */
  readonly event: Observer;
  readonly turnStart: (userMessage: string) => void;
  readonly turnEnd: (reply: string, iterations: number) => void;
  /** The db backend's id for this turn, so the caller can correlate feedback to
   * it (sent to the browser in the SSE `done` event). Absent for file/no-op. */
  readonly turnId?: string | null;
  /** Async backends (db) buffer writes; callers await this at end of turn so
   * they land before a serverless function freezes. No-op for sync backends. */
  readonly flush?: () => Promise<void>;
  /** Release any owned resources (e.g. a db pool) so a CLI process can exit. */
  readonly close?: () => Promise<void>;
};

/** A tracer that does nothing — used when tracing is disabled or the filesystem
 * isn't writable (serverless). The live UI reads the SSE stream, not these files. */
const noopTracer: Tracer = Object.freeze({
  event: () => {},
  turnStart: () => {},
  turnEnd: () => {},
});

/** Pick a tracer backend from config: off → no-op, db → Postgres, file → JSONL. */
export const makeTracer = (settings: Settings): Tracer => {
  if (settings.traceBackend === "off") return noopTracer;
  if (settings.traceBackend === "db") return makeDbTracer(settings.traceDatabaseUrl, settings);
  return makeFileTracer(settings);
};

const makeFileTracer = (settings: Settings): Tracer => {
  let home: string;
  try {
    home = ensureHome(settings.home);
  } catch {
    return noopTracer;
  }
  const tracePath = path.join(home, "traces", `${localDateISO()}.jsonl`);
  const usagePath = path.join(home, "usage.jsonl");

  // Writes are best-effort: a read-only FS degrades to no-op instead of throwing.
  const write = (record: Record<string, unknown>): void => {
    try {
      appendFileSync(
        tracePath,
        `${JSON.stringify({ ...record, ts: now() })}\n`,
        "utf-8",
      );
    } catch {
      // ignore — tracing must never break a turn
    }
  };

  /** Append one LLM call's token usage to a PERMANENT ledger (usage.jsonl).
   * Unlike traces (which can be reset for a clean demo), this is the running
   * record of what you've actually spent — never wiped. Tokens are the ground
   * truth; dollar cost is derived from them (pricing can change). */
  const recordUsage = (event: LoopEvent): void => {
    const usage = (event.usage ?? {}) as { in?: number; out?: number };
    const record = {
      ts: now(),
      provider: settings.provider,
      model: settings.model || "",
      kind: "loop",
      in: usage.in ?? 0,
      out: usage.out ?? 0,
    };
    try {
      appendFileSync(usagePath, `${JSON.stringify(record)}\n`, "utf-8");
    } catch {
      // ignore — the usage ledger is best-effort
    }
  };

  return Object.freeze({
    // ---- the Observer: called by the loop for every llm/tool/gate/... event
    event: (kind: string, event: LoopEvent) => {
      if (kind === "text") return; // streaming deltas are for the live UI, not the trace
      let enriched = event;
      if (kind === "llm") {
        recordUsage(event);
        // stamp WHICH brain answered — in a multi-model world a trace
        // without the model is half a trace
        enriched = {
          provider: settings.provider,
          model: settings.model || "",
          ...event,
        };
      }
      write({ type: kind, ...enriched });
    },

    // ---- one run = turn_start/turn_end JSONL markers
    turnStart: (userMessage: string) => {
      write({ type: "turn_start", user_message: userMessage });
    },

    turnEnd: (reply: string, iterations: number) => {
      write({ type: "turn_end", reply, iterations });
    },
  });
};
