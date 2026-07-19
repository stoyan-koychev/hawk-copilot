/**
 * Tool registry — the 'Agentic Tools' box on the whiteboard.
 *
 * A tool is three things: a name+description the model reads, a JSON schema
 * for its arguments, and a function that runs. That's it. The registry is a
 * plain ReadonlyMap plus free functions — no class, no state beyond the map.
 */

import type { ToolApiSchema } from "../types.js";

export type Tool = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  // tools return a string the model observes
  readonly run: (args: Record<string, unknown>) => Promise<string> | string;
};

export type ToolRegistry = ReadonlyMap<string, Tool>;

export const makeRegistry = (tools: readonly Tool[]): ToolRegistry =>
  new Map(tools.map((t) => [t.name, t]));

/** The shape the Messages API expects in its `tools=` parameter. */
export const schemasOf = (registry: ToolRegistry): ToolApiSchema[] =>
  [...registry.values()].map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

/** Run one tool call safely: the model observes errors as text instead of
 * crashing the loop (execute_tool_safely pattern). */
export const executeTool = async (
  registry: ToolRegistry,
  name: string,
  args: Record<string, unknown>,
): Promise<string> => {
  const tool = registry.get(name);
  if (!tool) return `Error: unknown tool '${name}'`;
  try {
    return await tool.run(args);
  } catch (exc) {
    // surface, don't crash — the model can retry
    return `Error running ${name}: ${exc instanceof Error ? exc.message : exc}`;
  }
};
