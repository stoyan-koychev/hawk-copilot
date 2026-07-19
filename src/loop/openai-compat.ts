/**
 * Speaks the Anthropic Messages shape the loop expects, backed by an
 * OpenAI-style chat.completions API. This file is the entire difference
 * between the two wire formats — worth reading once.
 */

import OpenAI from "openai";
import type {
  ContentBlock,
  CreateParams,
  LlmClient,
  LlmResponse,
  ToolUseBlock,
} from "../types.js";

type OaiMessage = Record<string, unknown>;
type OaiRequest = {
  model: string;
  messages: OaiMessage[];
  max_completion_tokens?: number;
  max_tokens?: number;
  tools?: unknown[];
};

/** Pure converter: Anthropic-shaped params → chat.completions request body.
 * Exported so the wire-format bridge is unit-testable without a network. */
export const toOpenAI = (params: CreateParams): OaiRequest => {
  const oaiMessages: OaiMessage[] = [];
  if (params.system) {
    oaiMessages.push({ role: "system", content: params.system });
  }
  for (const message of params.messages) {
    const content = message.content;
    if (typeof content === "string") {
      oaiMessages.push({ role: message.role, content });
    } else if (message.role === "assistant") {
      // anthropic content blocks → assistant text + tool_calls
      const text = content
        .filter(
          (b): b is Extract<ContentBlock, { type: "text" }> =>
            b.type === "text",
        )
        .map((b) => b.text)
        .join("");
      const calls: Record<string, unknown>[] = [];
      for (const b of content) {
        if (b.type !== "tool_use") continue;
        const call: Record<string, unknown> = {
          id: b.id,
          type: "function",
          function: { name: b.name, arguments: JSON.stringify(b.input) },
        };
        if (b.extra) call.extra_content = b.extra; // Gemini thought_signature
        calls.push(call);
      }
      const entry: OaiMessage = { role: "assistant", content: text || null };
      if (calls.length) entry.tool_calls = calls;
      oaiMessages.push(entry);
    } else {
      // anthropic tool_result blocks → one 'tool' message each
      for (const block of content) {
        if (block.type === "tool_result") {
          oaiMessages.push({
            role: "tool",
            tool_call_id: block.tool_use_id,
            content: block.content,
          });
        }
      }
    }
  }

  const request: OaiRequest = {
    model: params.model,
    messages: oaiMessages,
    max_completion_tokens: params.maxTokens,
  };
  if (params.tools?.length) {
    request.tools = params.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));
  }
  return request;
};

const toToolUseBlock = (call: {
  id: string;
  function: { name: string; arguments: string | null };
}): ToolUseBlock => ({
  type: "tool_use",
  id: call.id,
  name: call.function.name,
  input: JSON.parse(call.function.arguments || "{}"),
  // Gemini's thinking models attach a thought_signature here and REQUIRE it
  // echoed back with the tool call next turn, else the follow-up 400s.
  // Untyped on the SDK response; carry it so toOpenAI can put it back.
  extra: (call as Record<string, unknown>).extra_content,
});

export const makeOpenAICompatClient = (options: {
  apiKey: string;
  baseUrl?: string | null;
  timeoutMs?: number;
}): LlmClient => {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseUrl ?? undefined,
    timeout: options.timeoutMs ?? 120_000,
  });

  /** Run chat.completions.create with the max_tokens key-name fallback
   * (older OpenAI-compatible endpoints only know max_tokens, not the newer
   * max_completion_tokens). Only retry when the error is ABOUT that param —
   * retrying on any error masks the real failure. */
  const call = async (
    request: OaiRequest,
    extra: Record<string, unknown> = {},
  ): Promise<any> => {
    try {
      return await client.chat.completions.create({
        ...request,
        ...extra,
      } as any);
    } catch (exc) {
      const m = String(exc).toLowerCase();
      if (!m.includes("max_completion_tokens") && !m.includes("max_tokens"))
        throw exc;
      const retry: OaiRequest = {
        ...request,
        max_tokens: request.max_completion_tokens,
      };
      delete retry.max_completion_tokens;
      return await client.chat.completions.create({
        ...retry,
        ...extra,
      } as any);
    }
  };

  const create = async (params: CreateParams): Promise<LlmResponse> => {
    const response = await call(toOpenAI(params));
    if (!response.choices?.length) {
      // some OpenAI-compatible endpoints (e.g. OpenRouter on a rate limit)
      // return 200 with an error body and no choices: surface that message
      const errBody =
        (response as Record<string, unknown>).error ??
        "endpoint returned no choices";
      throw new Error(`${params.model}: ${JSON.stringify(errBody)}`);
    }
    const choice = response.choices[0].message;
    const blocks: ContentBlock[] = [];
    if (choice.content) blocks.push({ type: "text", text: choice.content });
    for (const c of choice.tool_calls ?? []) blocks.push(toToolUseBlock(c));
    return {
      stopReason: choice.tool_calls?.length ? "tool_use" : "end_turn",
      usage: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
      content: blocks,
    };
  };

  /** Anthropic-shaped streaming over an OpenAI chat.completions stream —
   * same bridge as create, but emitting text as it arrives and reassembling
   * tool calls chunk by chunk (id/name/args accumulate per index). */
  const stream = async (
    params: CreateParams,
    onText: (delta: string) => void,
  ): Promise<LlmResponse> => {
    const s = await call(toOpenAI(params), {
      stream: true,
      stream_options: { include_usage: true },
    });
    const text: string[] = [];
    const tools = new Map<
      number,
      { id: string; name: string; args: string; extra?: unknown }
    >();
    let usage:
      | { prompt_tokens?: number; completion_tokens?: number }
      | undefined;

    for await (const chunk of s) {
      if (chunk.usage) usage = chunk.usage;
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        text.push(delta.content);
        onText(delta.content);
      }
      for (const tc of delta.tool_calls ?? []) {
        let slot = tools.get(tc.index);
        if (!slot) {
          slot = { id: "", name: "", args: "" };
          tools.set(tc.index, slot);
        }
        if (tc.id) slot.id = tc.id;
        if (tc.function?.name) slot.name = tc.function.name;
        if (tc.function?.arguments) slot.args += tc.function.arguments;
        const extra = (tc as Record<string, unknown>).extra_content;
        if (extra) slot.extra = extra;
      }
    }

    const blocks: ContentBlock[] = [];
    const joined = text.join("");
    if (joined) blocks.push({ type: "text", text: joined });
    for (const slot of tools.values()) {
      blocks.push({
        type: "tool_use",
        id: slot.id,
        name: slot.name,
        input: JSON.parse(slot.args || "{}"),
        extra: slot.extra,
      });
    }
    return {
      stopReason: tools.size ? "tool_use" : "end_turn",
      usage: {
        input: usage?.prompt_tokens ?? 0,
        output: usage?.completion_tokens ?? 0,
      },
      content: blocks,
    };
  };

  return Object.freeze({ create, stream });
};
