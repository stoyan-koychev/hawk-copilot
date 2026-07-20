// DETERMINISTIC EVAL — the loop's contract: end conditions, tool execution,
// error-as-string, message mutation. All offline via the scripted client.

import { describe, expect, it } from "vitest";
import { runLoop } from "../../src/loop/agent.js";
import {
  executeTool,
  makeRegistry,
  schemasOf,
} from "../../src/tools/registry.js";
import type { Tool } from "../../src/tools/registry.js";
import type { Message } from "../../src/types.js";
import { response, scriptedClient, textBlock, toolBlock } from "../helpers.js";

const echoTool: Tool = {
  name: "echo",
  description: "echoes",
  inputSchema: { type: "object", properties: {}, required: [] },
  run: (args) => `echoed: ${JSON.stringify(args)}`,
};

const failingTool: Tool = {
  name: "boom",
  description: "always throws",
  inputSchema: { type: "object", properties: {}, required: [] },
  run: () => {
    throw new Error("kaput");
  },
};

describe("registry", () => {
  it("exposes wire schemas with snake_case input_schema", () => {
    const schemas = schemasOf(makeRegistry([echoTool]));
    expect(schemas).toEqual([
      {
        name: "echo",
        description: "echoes",
        input_schema: echoTool.inputSchema,
      },
    ]);
  });

  it("surfaces unknown tools and thrown errors as strings, never throws", async () => {
    const registry = makeRegistry([failingTool]);
    expect(await executeTool(registry, "nope", {})).toBe(
      "Error: unknown tool 'nope'",
    );
    expect(await executeTool(registry, "boom", {})).toBe(
      "Error running boom: kaput",
    );
  });
});

describe("runLoop", () => {
  it("ends after one iteration when the model just talks", async () => {
    const client = scriptedClient([response([textBlock("hello there")])]);
    const messages: Message[] = [{ role: "user", content: "hi" }];
    const result = await runLoop({
      client,
      model: "test",
      system: "sys",
      messages,
      tools: makeRegistry([echoTool]),
    });
    expect(result.reply).toBe("hello there");
    expect(result.iterations).toBe(1);
    expect(result.toolCalls).toEqual([]);
    // assistant turn joined working memory
    expect(messages).toHaveLength(2);
  });

  it("executes tools and feeds results back before the final reply", async () => {
    const client = scriptedClient([
      response(
        [textBlock("let me check"), toolBlock("echo", { x: 1 })],
        "tool_use",
      ),
      response([textBlock("done")]),
    ]);
    const messages: Message[] = [{ role: "user", content: "go" }];
    const events: [string, unknown][] = [];
    const result = await runLoop({
      client,
      model: "test",
      system: "sys",
      messages,
      tools: makeRegistry([echoTool]),
      observer: (kind, ev) => events.push([kind, ev]),
    });
    expect(result.reply).toBe("done");
    expect(result.iterations).toBe(2);
    expect(result.toolCalls).toEqual([
      { tool: "echo", args: { x: 1 }, output: 'echoed: {"x":1}' },
    ]);
    // messages: user, assistant(tool_use), user(tool_result), assistant(text)
    expect(messages).toHaveLength(4);
    const toolResultMsg = messages[2];
    expect(toolResultMsg?.role).toBe("user");
    expect(toolResultMsg?.content).toEqual([
      { type: "tool_result", tool_use_id: "tu_1", content: 'echoed: {"x":1}' },
    ]);
    // tool_start fires before the tool runs; tool fires after with its output.
    expect(events.map(([kind]) => kind)).toEqual(["llm", "tool_start", "tool", "llm"]);
  });

  it("stops at the iteration guardrail with the canned message", async () => {
    const spin = () => response([toolBlock("echo", {})], "tool_use");
    const client = scriptedClient([spin(), spin(), spin()]);
    const result = await runLoop({
      client,
      model: "test",
      system: "sys",
      messages: [{ role: "user", content: "loop forever" }],
      tools: makeRegistry([echoTool]),
      maxIterations: 3,
    });
    expect(result.iterations).toBe(3);
    expect(result.reply).toContain("iteration limit");
  });

  it("keeps looping after a tool error (the model observes the error text)", async () => {
    const client = scriptedClient([
      response([toolBlock("boom", {})], "tool_use"),
      response([textBlock("recovered")]),
    ]);
    const result = await runLoop({
      client,
      model: "test",
      system: "sys",
      messages: [{ role: "user", content: "try" }],
      tools: makeRegistry([failingTool]),
    });
    expect(result.reply).toBe("recovered");
    expect(result.toolCalls[0]?.output).toBe("Error running boom: kaput");
  });
});
