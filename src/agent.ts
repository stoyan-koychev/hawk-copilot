/**
 * The assembled agent — one factory wiring settings → client + pool + tools
 * + grounding prompt. Everything that wants a working agent (CLI, judge
 * evals, MCP server) calls makeAgent instead of re-wiring the parts.
 */

import type { Settings } from "./config.js";
import { runLoop } from "./loop/agent.js";
import type { LoopResult } from "./loop/agent.js";
import { getClient } from "./loop/client.js";
import { makePool } from "./retrieval/db.js";
import { makeConvertCurrencyTool } from "./tools/currency.js";
import { makeReadFullDocTool } from "./tools/read-doc.js";
import { makeRegistry } from "./tools/registry.js";
import { makeSearchDocsTool } from "./tools/search-docs.js";
import { SYSTEM } from "./system-prompt.js";
import type { LlmClient, Message, Observer } from "./types.js";

// The prompt now lives in its own module, composed from SOUL + PERSONALITY +
// GUARDRAILS. Re-exported so existing importers (e.g. ops/version.ts) still
// resolve SYSTEM from here.
export { SOUL, PERSONALITY, GUARDRAILS, SYSTEM } from "./system-prompt.js";

export type Agent = {
  readonly client: LlmClient;
  readonly ask: (
    question: string,
    opts?: { observer?: Observer; history?: Message[]; stream?: boolean },
  ) => Promise<LoopResult>;
  readonly end: () => Promise<void>;
};

/** settings must already be resolved (resolveSettings) — the factory does no
 * validation of its own. */
export const makeAgent = (settings: Settings): Agent => {
  const client = getClient(settings);
  const pool = makePool(settings.databaseUrl);
  const tools = makeRegistry([
    makeSearchDocsTool(pool, settings.apiKey),
    makeReadFullDocTool(pool),
    makeConvertCurrencyTool(),
  ]);

  return Object.freeze({
    client,

    ask: (question, opts = {}) => {
      // chat state lives with the CALLER (browser); the agent stays stateless.
      // Window the incoming history so context/cost stay flat on long chats.
      const window = settings.historyTurns * 2;
      const messages: Message[] = [
        ...(opts.history ?? []).slice(-window),
        { role: "user", content: question },
      ];
      return runLoop({
        client,
        model: settings.model,
        system: SYSTEM,
        messages,
        tools,
        maxIterations: settings.maxIterations,
        maxTokens: settings.maxTokens,
        observer: opts.observer,
        stream: opts.stream,
      });
    },

    end: async () => {
      await pool.end();
    },
  });
};
