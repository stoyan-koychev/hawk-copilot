/**
 * THE LOOP — observe → reason → act → repeat. This file is the whole trick.
 *
 * Every agent framework is ultimately this while-loop with more indirection:
 *
 *     while not done:
 *         response = llm(messages, tools)          # reason
 *         if response asks for tools:
 *             results = run(tool_calls)            # act
 *             messages += results                  # observe
 *         else:
 *             done                                 # reply to the human
 *
 * End-loop guardrails (the exit conditions):
 *   1. the model stops asking for tools  → natural end of turn
 *   2. maxIterations reached             → hard stop, never spin forever
 */

import { executeTool, schemasOf } from "../tools/registry.js";
import type { ToolRegistry } from "../tools/registry.js";
import type {
  LlmClient,
  LoopEvent,
  Message,
  Observer,
  ToolResultBlock,
} from "../types.js";

export type ToolCallEvent = LoopEvent & {
  readonly tool: string;
  readonly args: Record<string, unknown>;
  readonly output: string;
};

export type LoopResult = {
  reply: string;
  toolCalls: ToolCallEvent[];
  iterations: number;
};

export const runLoop = async (opts: {
  client: LlmClient;
  model: string;
  system: string;
  /** Mutated in place — after the call it contains the full working memory of
   * the turn (assistant thoughts, tool calls, tool results), which is exactly
   * what gets traced. */
  messages: Message[];
  tools: ToolRegistry;
  maxIterations?: number;
  maxTokens?: number;
  observer?: Observer;
  /** stream=true emits the assistant's text as it's generated
   * (notify("text", {delta})) so a gateway can show it token by token.
   * Falls back to a single call for clients without streaming. */
  stream?: boolean;
}): Promise<LoopResult> => {
  const { client, messages, tools } = opts;
  const maxIterations = opts.maxIterations ?? 10;
  const notify: Observer = opts.observer ?? (() => {});
  const result: LoopResult = { reply: "", toolCalls: [], iterations: 0 };
  const canStream = Boolean(opts.stream && client.stream);

  const params = {
    model: opts.model,
    system: opts.system,
    tools: schemasOf(tools),
    maxTokens: opts.maxTokens ?? 2048,
  };

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    result.iterations = iteration;

    // ---- reason: one LLM call with the current working memory
    let response = null;
    if (canStream && client.stream) {
      try {
        response = await client.stream({ ...params, messages }, (delta) =>
          notify("text", { delta }),
        );
      } catch {
        response = null; // any streaming hiccup → fall back to one call
      }
    }
    if (response === null) {
      response = await client.create({ ...params, messages });
    }
    notify("llm", {
      iteration,
      stop_reason: response.stopReason,
      usage: { in: response.usage.input, out: response.usage.output },
    });

    // the assistant's turn (text and/or tool requests) joins working memory
    messages.push({ role: "assistant", content: [...response.content] });

    const toolUses = response.content.filter((b) => b.type === "tool_use");

    // ---- guardrail 1: no tool calls → the model is talking to the human
    if (toolUses.length === 0) {
      result.reply = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      return result;
    }

    // ---- act: execute each requested tool; observe: feed results back
    const toolResults: ToolResultBlock[] = [];
    for (const call of toolUses) {
      // fired BEFORE the tool runs so a gateway can show "using X…" during the
      // wait; the "tool" event below fires after, carrying the result.
      notify("tool_start", { tool: call.name, args: call.input });
      const output = await executeTool(tools, call.name, call.input);
      const event: ToolCallEvent = {
        tool: call.name,
        args: call.input,
        output,
      };
      result.toolCalls.push(event);
      notify("tool", event);
      toolResults.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: output,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  // ---- guardrail 2: ran out of iterations
  result.reply =
    "(I hit my iteration limit before finishing — try breaking the request into smaller steps.)";
  return result;
};
