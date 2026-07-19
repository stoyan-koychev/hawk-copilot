/**
 * Build the LlmClient for the configured provider, and resolve provider
 * defaults into settings.
 */

import process from "node:process";
import Anthropic from "@anthropic-ai/sdk";
import type { Settings } from "../config.js";
import type { ContentBlock, CreateParams, LlmClient, LlmResponse } from "../types.js";
import { makeOpenAICompatClient } from "./openai-compat.js";
import { PROVIDERS } from "./providers.js";

/** Fill default model ids and the API key from the provider table. Throws on
 * unknown provider or missing key (callers exit with the message). */
export const resolveSettings = (settings: Settings): Settings => {
  const provider = PROVIDERS[settings.provider];
  if (!provider) {
    throw new Error(
      `Unknown HAWK_PROVIDER '${settings.provider}'. Pick one of: ${Object.keys(PROVIDERS).join(", ")}`,
    );
  }
  const apiKey = settings.apiKey || process.env[provider.keyEnv] || "";
  if (!apiKey) {
    throw new Error(
      `No API key for provider '${settings.provider}'. Set ${provider.keyEnv} in .env (see .env.example).`,
    );
  }
  return Object.freeze({
    ...settings,
    apiKey,
    baseUrl: settings.baseUrl || provider.baseUrl,
    model: settings.model || provider.model,
    smallModel: settings.smallModel || provider.smallModel,
  });
};

const toLlmResponse = (message: Anthropic.Message): LlmResponse => {
  const blocks: ContentBlock[] = [];
  for (const b of message.content) {
    // filter to the block types the loop understands (drops thinking blocks
    if (b.type === "text") blocks.push({ type: "text", text: b.text });
    else if (b.type === "tool_use") {
      blocks.push({
        type: "tool_use",
        id: b.id,
        name: b.name,
        input: b.input as Record<string, unknown>,
      });
    }
  }
  return {
    stopReason: message.stop_reason ?? "end_turn",
    usage: {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
    },
    content: blocks,
  };
};

const makeAnthropicClient = (options: {
  apiKey: string;
  baseUrl?: string | null;
  timeoutMs: number;
}): LlmClient => {
  const client = new Anthropic({
    apiKey: options.apiKey,
    baseURL: options.baseUrl ?? undefined,
    timeout: options.timeoutMs,
  });

  const request = (p: CreateParams): Anthropic.MessageCreateParamsNonStreaming => ({
    model: p.model,
    system: p.system,
    messages: p.messages as unknown as Anthropic.MessageParam[],
    tools: (p.tools ?? []) as unknown as Anthropic.Tool[],
    max_tokens: p.maxTokens,
  });

  return Object.freeze({
    create: async (p: CreateParams) => toLlmResponse(await client.messages.create(request(p))),
    stream: async (p: CreateParams, onText: (delta: string) => void) => {
      const s = client.messages.stream(request(p));
      s.on("text", onText);
      return toLlmResponse(await s.finalMessage());
    },
  });
};

/** Build the client for settings.provider (call resolveSettings first —
 * a hung network call must never freeze a turn silently, so the timeout
 * always applies). */
export const getClient = (settings: Settings): LlmClient => {
  const provider = PROVIDERS[settings.provider];
  if (!provider) {
    throw new Error(`Unknown HAWK_PROVIDER '${settings.provider}'.`);
  }
  if (provider.kind === "anthropic") {
    return makeAnthropicClient({
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      timeoutMs: settings.llmTimeoutMs,
    });
  }
  return makeOpenAICompatClient({
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    timeoutMs: settings.llmTimeoutMs,
  });
};
