/**
 * search_docs - the agent's window into the Payhawk knowledge base.
 *
 * Formats hybrid-retrieval results as a NUMBERED list: the numbers become
 * the citation vocabulary ("...request a refund [1]"), resolvable back to
 * URLs - grounded answers made mechanical.
 */

import type { DbPool } from "../retrieval/db.js";
import { hybridSearch } from "../retrieval/search.js";
import type { Tool } from "./registry.js";

const MAX_CHUNK_CHARS = 800; // six full chunks would dilute attention and cost tokens

export const makeSearchDocsTool = (pool: DbPool, apiKey: string): Tool => ({
  name: "search_docs",
  description:
    "Search Payhawk's official documentation (help center and product docs) and get back " +
    "the most relevant passages with their source URLs. Use for ANY question about Payhawk " +
    "features, cards, expenses, reimbursements, approvals, billing, or integrations " +
    "always search before answering from memory.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "what to look up in the Payhawk knowledge base - include every distinguishing detail from the user's message in the query - especially contradictions or surprising conditions (e.g. 'declined despite sufficient balance')",
      },
    },
    required: ["query"],
  },
  run: async (args, notify) => {
    const query = String(args.query ?? "").trim();
    if (!query)
      return "search_docs needs a query. Please call it again with the user's question.";

    const startedAt = Date.now();
    const chunks = await hybridSearch(pool, apiKey, query, 6);
    // Structured retrieval event for the trace layer: which chunks + scores, how
    // slow — the observability material that pairs with the evals.
    notify?.("retrieval", {
      query,
      mode: "hybrid",
      latency_ms: Date.now() - startedAt,
      count: chunks.length,
      results: chunks.map((c) => ({ id: c.id, url: c.url, score: c.score })),
    });
    if (chunks.length === 0) {
      return "No relevant documentation found for that query.";
    }

    const blocks = chunks.map((c, i) => {
      const heading = c.section || c.title || "Untitled";
      const text =
        c.text.length > MAX_CHUNK_CHARS
          ? `${c.text.slice(0, MAX_CHUNK_CHARS)}...`
          : c.text;
      return `[${i + 1}] ${heading}\n    ${c.url}\n    ${text.replaceAll("\n", "\n    ")}`;
    });
    return `Documentation passages (cite by number):\n\n${blocks.join("\n\n")}`;
  },
});
