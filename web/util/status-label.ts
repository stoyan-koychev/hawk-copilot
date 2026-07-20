import type { AgentStatus } from "@/util/types";

// Human-readable phrasing for each tool the agent can run. Keys are the tool
// names from the registry; unknown tools fall back to a generic phrase.
const TOOL_LABELS: Record<string, string> = {
  search_docs: "Searching the documents",
  read_full_doc: "Reading the document",
  convert_currency: "Calculating the exchange rate",
};

/** The status phrase to show while the agent works (no trailing ellipsis). */
export function statusLabel(status: AgentStatus): string {
  if (status.kind === "thinking") return "Thinking";
  return TOOL_LABELS[status.tool] ?? `Using ${status.tool}`;
}
