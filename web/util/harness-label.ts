// Formatting for the harness side panel. Both functions are pure so the exact
// label text stays testable and out of the streaming hook.

export type TokenUsage = { in: number; out: number };

/** Label for a tool call, e.g. `search_docs({"query":"per diem"})`. */
export function formatToolLabel(tool: string, args: unknown): string {
  return `${tool}(${JSON.stringify(args)})`;
}

/** Label for an LLM call, e.g. `llm call - in 1200 / out 340 tokens`. */
export function formatUsageLabel(usage: TokenUsage): string {
  return `llm call - in ${usage.in} / out ${usage.out} tokens`;
}
