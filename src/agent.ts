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
import { makeRegistry } from "./tools/registry.js";
import { makeSearchDocsTool } from "./tools/search-docs.js";
import type { LlmClient, Message, Observer } from "./types.js";

export const SYSTEM = `You are Hawk Copilot, an assistant for Payhawk users, grounded in Payhawk's official documentation.

Rules:
- For any question about Payhawk (features, cards, expenses, reimbursements, approvals, billing, integrations), ALWAYS call search_docs first — never answer from memory.
- Answer ONLY from the returned passages. Cite sources inline as [1], [2] matching the passage numbers, and list the cited URLs at the end under "Sources:".
- If the passages don't answer the question, say so plainly and suggest contacting Payhawk support — never invent product behavior.
- Be concise and practical: steps first, caveats after.`;

export type Agent = {
  readonly client: LlmClient;
  readonly ask: (question: string, observer?: Observer) => Promise<LoopResult>;
  readonly end: () => Promise<void>;
};

/** settings must already be resolved (resolveSettings) — the factory does no
 * validation of its own. */
export const makeAgent = (settings: Settings): Agent => {
  const client = getClient(settings);
  const pool = makePool(settings.databaseUrl);
  const tools = makeRegistry([makeSearchDocsTool(pool, settings.apiKey)]);

  return Object.freeze({
    client,

    ask: (question, observer) => {
      // fresh array per call — runLoop mutates it, and each question is its
      // own turn (no conversation memory yet, by design)
      const messages: Message[] = [{ role: "user", content: question }];
      return runLoop({
        client,
        model: settings.model,
        system: SYSTEM,
        messages,
        tools,
        maxIterations: settings.maxIterations,
        maxTokens: settings.maxTokens,
        observer,
      });
    },

    end: async () => {
      await pool.end();
    },
  });
};
