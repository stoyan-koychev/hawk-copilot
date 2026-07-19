/**
 * Throwaway smoke test — one live turn through the loop.
 * Replaced by the real CLI gateway in Phase 4.
 */

import { loadSettings } from "./config.js";
import { runLoop } from "./loop/agent.js";
import { getClient, resolveSettings } from "./loop/client.js";
import { makeRegistry } from "./tools/registry.js";
import type { Tool } from "./tools/registry.js";
import type { Message } from "./types.js";

const getTime: Tool = {
  name: "get_time",
  description:
    "Get the current date and time on the user's machine. " +
    "Use whenever the user asks what time or day it is.",
  inputSchema: { type: "object", properties: {}, required: [] },
  run: () => new Date().toString(),
};

const main = async (): Promise<void> => {
  let settings: ReturnType<typeof loadSettings>;
  try {
    settings = resolveSettings(loadSettings());
  } catch (exc) {
    console.error(exc instanceof Error ? exc.message : String(exc));
    process.exit(1);
  }

  const client = getClient(settings);
  const tools = makeRegistry([getTime]);
  const messages: Message[] = [
    { role: "user", content: "what time is it right now?" },
  ];

  const result = await runLoop({
    client,
    model: settings.model,
    system: "You are a helpful assistant.",
    messages,
    tools,
    maxTokens: settings.maxTokens,
  });

  console.log("tool calls:", result.toolCalls);
  console.log("iterations:", result.iterations);
  console.log("reply:", result.reply);
};

main();
