// DETERMINISTIC EVAL — provider table shape and the OpenAI-compat wire bridge
// as a pure function (no network).

import { describe, expect, it } from "vitest";
import { toOpenAI } from "../../src/loop/openai-compat.js";
import { PROVIDERS, defaultPair } from "../../src/loop/providers.js";
import type { Message } from "../../src/types.js";

describe("PROVIDERS", () => {
  it("has all four providers with a wire kind, key env, and default models", () => {
    expect(Object.keys(PROVIDERS).sort()).toEqual(["anthropic", "gemini", "openai", "openrouter"]);
    for (const [name, p] of Object.entries(PROVIDERS)) {
      expect(["anthropic", "openai"], name).toContain(p.kind);
      expect(p.keyEnv, name).toMatch(/_API_KEY$/);
      expect(p.model, name).toBeTruthy();
      expect(p.smallModel, name).toBeTruthy();
    }
  });

  it("defaultPair dedupes flagship/fast with model fallbacks", () => {
    expect(defaultPair(PROVIDERS.openai!)).toEqual(["gpt-4.1-mini"]);
    expect(defaultPair(PROVIDERS.anthropic!)).toEqual(["claude-opus-4-8", "claude-sonnet-5"]);
  });
});

describe("toOpenAI (the wire-format bridge)", () => {
  it("converts system + string messages", () => {
    const request = toOpenAI({
      model: "m",
      system: "be nice",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 100,
    });
    expect(request).toEqual({
      model: "m",
      messages: [
        { role: "system", content: "be nice" },
        { role: "user", content: "hi" },
      ],
      max_completion_tokens: 100,
    });
  });

  it("converts assistant blocks to text + tool_calls and tool_results to tool messages", () => {
    const messages: Message[] = [
      { role: "user", content: "book it" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "on it" },
          {
            type: "tool_use",
            id: "tu_9",
            name: "create_event",
            input: { title: "x" },
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "tu_9", content: "done" }],
      },
    ];
    const request = toOpenAI({ model: "m", messages, maxTokens: 50 });
    expect(request.messages[1]).toEqual({
      role: "assistant",
      content: "on it",
      tool_calls: [
        {
          id: "tu_9",
          type: "function",
          function: { name: "create_event", arguments: '{"title":"x"}' },
        },
      ],
    });
    expect(request.messages[2]).toEqual({
      role: "tool",
      tool_call_id: "tu_9",
      content: "done",
    });
  });

  it("echoes Gemini's thought_signature back as extra_content", () => {
    const messages: Message[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "t1",
            name: "f",
            input: {},
            extra: { sig: "abc" },
          },
        ],
      },
    ];
    const request = toOpenAI({ model: "m", messages, maxTokens: 10 });
    const call = (request.messages[0] as { tool_calls: Record<string, unknown>[] }).tool_calls[0];
    expect(call?.extra_content).toEqual({ sig: "abc" });
  });

  it("maps tool schemas into function declarations", () => {
    const request = toOpenAI({
      model: "m",
      messages: [{ role: "user", content: "q" }],
      tools: [{ name: "t", description: "d", input_schema: { type: "object" } }],
      maxTokens: 10,
    });
    expect(request.tools).toEqual([
      {
        type: "function",
        function: {
          name: "t",
          description: "d",
          parameters: { type: "object" },
        },
      },
    ]);
  });

  it("nulls out empty assistant text (some endpoints reject empty strings)", () => {
    const messages: Message[] = [
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "t1", name: "f", input: {} }],
      },
    ];
    const request = toOpenAI({ model: "m", messages, maxTokens: 10 });
    expect((request.messages[0] as { content: unknown }).content).toBeNull();
  });
});
