import type { DbPool } from "../retrieval/db.js";
import type { Tool } from "./registry.js";

const MAX_DOC_CHARS = 8000; // a whole help page fits; a monster page gets cut honestly

export const makeReadFullDocTool = (pool: DbPool): Tool => ({
  name: "read_full_doc",
  description:
    "Read the COMPLETE content of one documentation page from the Payhawk knowledge base, " +
    "given its URL (as returned by search_docs). Use when the search passages look relevant " +
    "but are missing details, steps, or context you need to answer fully.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "the exact source URL from a search_docs result",
      },
    },
    required: ["url"],
  },
  run: async (args) => {
    const url = String(args.url ?? "").trim();
    if (!url)
      return "read_full_doc needs a url from a previous search_docs result.";

    const { rows } = await pool.query(
      `SELECT d.title, c.section, c.text
       FROM chunks c JOIN documents d ON d.id = c.document_id
       WHERE d.url = $1 ORDER BY c.chunk_index`,
      [url],
    );
    if (rows.length === 0) {
      return `No document found at ${url} — use a url exactly as search_docs returned it.`;
    }

    const body = (rows as { title: string; section: string; text: string }[])
      .map((r) => r.text)
      .join("\n\n");
    const trimmed =
      body.length > MAX_DOC_CHARS
        ? `${body.slice(0, MAX_DOC_CHARS)}\n\n[…document truncated at ${MAX_DOC_CHARS} chars]`
        : body;
    return `Full document: ${rows[0].title}\nSource: ${url}\n\n${trimmed}`;
  },
});
