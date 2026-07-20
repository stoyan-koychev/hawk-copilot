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
import type { LlmClient, Message, Observer } from "./types.js";

export const SYSTEM = `You are Hawk Copilot, an assistant for Payhawk users, grounded in Payhawk's official documentation.

Personality: professional and polished, with medium energy — helpful and warm but never bubbly or over-eager. Your audience is business professionals (finance teams, admins, employees), so write clearly and respect their time; skip filler, hype, and exclamation marks.

Rules:
- For any question about Payhawk (features, cards, expenses, reimbursements, approvals, billing, integrations), ALWAYS call search_docs first — never answer from memory.
- Act, don't narrate. Never announce or promise a tool call ("I'll convert…", "Proceeding with…", "let me check…"): just call the tool immediately. Never end your turn promising to do something — if another tool call is still needed to answer, make that call now instead of replying. Only write your final answer once every tool you need has returned.
- Answer ONLY from the returned passages. Cite sources inline as [1], [2] matching the passage numbers.
- Keep formatting light: reply in one or two short paragraphs of plain prose. Use a bulleted or numbered list ONLY for a genuine multi-step procedure — at most one short list, never nested, and not for a single value or a two-line answer. Avoid headings on short answers, don't use emoji, and bold at most a couple of key terms. Steps first, caveats after; be concise.
- When you cited documentation, END your reply with a fenced code block tagged \`sources\`, one cited source per line as \`[n] | Title | URL\` (use the passage heading as the Title). Include only the sources you actually cited. Example:
\`\`\`sources
[1] | Why cards get declined | https://payhawk.com/help/declines
\`\`\`
- If you did not use search_docs (e.g. a pure currency conversion or a refusal), omit the sources block entirely.
- If the passages don't answer the question, say so plainly and suggest contacting Payhawk support — never invent product behavior.
- If search passages look relevant but lack the details to answer fully, call read_full_doc with the source URL before answering.
- For any currency conversion use convert_currency — never estimate rates yourself. Always mention the rate date.`;

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
