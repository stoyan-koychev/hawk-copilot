/**
 * Shared eval plumbing: a scripted fake LLM client for offline tests, and a
 * real-Hawk factory for live ones.
 */

import process from "node:process";
import { loadSettings } from "../src/config.js";
import { PROVIDERS } from "../src/loop/providers.js";
import type {
  ContentBlock,
  LlmClient,
  LlmResponse,
  TextBlock,
  ToolUseBlock,
} from "../src/types.js";

/** True when the ACTIVE provider (HAWK_PROVIDER) has its key set, so live
 * evals run on whatever the user actually configured, not only anthropic. */
export const hasKey = (): boolean => {
  const settings = loadSettings();
  const provider = PROVIDERS[settings.provider];
  return Boolean(settings.apiKey || (provider && process.env[provider.keyEnv]));
};

export const HAS_KEY = hasKey();

export const textBlock = (text: string): TextBlock => ({ type: "text", text });

export const toolBlock = (
  name: string,
  args: Record<string, unknown>,
  callId = "tu_1",
): ToolUseBlock => ({ type: "tool_use", id: callId, name, input: args });

export const response = (
  blocks: ContentBlock[],
  stopReason = "end_turn",
): LlmResponse => ({
  stopReason,
  usage: { input: 0, output: 0 },
  content: blocks,
});

/** Plays back a fixed list of responses — the 'model' for offline tests. */
export const scriptedClient = (script: readonly LlmResponse[]): LlmClient => {
  const remaining = [...script];
  return Object.freeze({
    create: async () => {
      const next = remaining.shift();
      if (!next) throw new Error("ScriptedClient: script exhausted");
      return next;
    },
  });
};
