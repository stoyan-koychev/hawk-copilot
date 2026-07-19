/**
 * Throwaway smoke test â one grounded turn through the loop.
 * Replaced by a real CLI gateway later.
 */

import { loadSettings } from "./config.js";
import { runLoop } from "./loop/agent.js";
import { getClient, resolveSettings } from "./loop/client.js";
import { makePool } from "./retrieval/db.js";
import { makeRegistry } from "./tools/registry.js";
import { makeSearchDocsTool } from "./tools/search-docs.js";
import type { Message } from "./types.js";

const SYSTEM = `You are Hawk Copilot, an assistant for Payhawk users, grounded in Payhawk's official documentation.

Rules:
- For any question about Payhawk (features, cards, expenses, reimbursements, approvals, billing, integrations), ALWAYS call search_docs first â never answer from memory.
- Answer ONLY from the returned passages. Cite sources inline as [1], [2] matching the passage numbers, and list the cited URLs at the end under "Sources:".
- If the passages don't answer the question, say so plainly and suggest contacting Payhawk support â never invent product behavior.
- Be concise and practical: steps first, caveats after.`;

const main = async (): Promise<void> => {
  let settings: ReturnType<typeof loadSettings>;
  try {
    settings = resolveSettings(loadSettings());
  } catch (exc) {
    console.error(exc instanceof Error ? exc.message : String(exc));
    process.exit(1);
  }

  const client = getClient(settings);
  const pool = makePool(settings.databaseUrl);
  const tools = makeRegistry([makeSearchDocsTool(pool, settings.apiKey)]);

  const question =
    process.argv[2] ??
    "How do I get reimbursed for a lunch I paid for with my own money?";
  const messages: Message[] = [{ role: "user", content: question }];

  const result = await runLoop({
    client,
    model: settings.model,
    system: SYSTEM,
    messages,
    tools,
    maxIterations: settings.maxIterations,
    maxTokens: settings.maxTokens,
  });

  console.log(
    "tool calls:",
    result.toolCalls.map((c) => `${c.tool}(${JSON.stringify(c.args)})`),
  );
  console.log("iterations:", result.iterations);
  console.log(`\n${result.reply}`);

  await pool.end();
};

main();
