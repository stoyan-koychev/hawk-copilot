/**
 * Model access — nine providers, one loop, zero framework.
 *
 * The loop speaks one dialect: Anthropic's Messages shape (system/messages/
 * tools in, content blocks out). Providers plug in two ways:
 *
 *   anthropic wire format (native)     → Anthropic, Kimi/Moonshot, GLM/Z.ai, MiniMax
 *   openai wire format (thin adapter)  → OpenAI, Google Gemini, DeepSeek, OpenRouter, xAI
 *
 * Pick with HAWK_PROVIDER and set that provider's API key in .env. Override
 * the model ids with HAWK_MODEL / HAWK_SMALL_MODEL if the defaults age out —
 * they're just strings.
 */

export type ProviderSpec = {
  readonly kind: "anthropic" | "openai"; // the wire format
  readonly keyEnv: string; // which env var holds the key
  readonly baseUrl: string | null;
  readonly model: string; // default main model (the loop)
  readonly smallModel: string; // default cheap model (gate + consolidation)
  // Where to LIST this provider's models (the Settings picker). openai-wire
  // providers get {baseUrl}/models automatically; set this for providers
  // whose chat endpoint and catalog endpoint differ.
  readonly catalogUrl?: string;
  // The two models the chat switcher pins by default: a flagship (top
  // quality) and a fast one (cheap/low-latency). Blank falls back to
  // model/smallModel.
  readonly flagship?: string;
  readonly fast?: string;
};

export const PROVIDERS: Readonly<Record<string, ProviderSpec>> = Object.freeze({
  anthropic: {
    kind: "anthropic",
    keyEnv: "ANTHROPIC_API_KEY",
    baseUrl: null,
    model: "claude-sonnet-5",
    smallModel: "claude-haiku-4-5-20251001",
    catalogUrl: "https://api.anthropic.com/v1/models",
    flagship: "claude-opus-4-8",
    fast: "claude-sonnet-5",
  },
  // The gpt-5.6 REASONING models can't use function tools on
  // /v1/chat/completions (they need /v1/responses); the non-reasoning "chat"
  // line DOES call tools fine. gpt-4.1-mini is a cheap tool-capable gate.
  openai: {
    kind: "openai",
    keyEnv: "OPENAI_API_KEY",
    baseUrl: null,
    model: "gpt-4.1-mini",
    smallModel: "gpt-4.1-mini",
    catalogUrl: "https://api.openai.com/v1/models",
  },
  // one key, every lab's models, and a $0 tier: the default models below are
  // free ids (":free" suffix). Rate-limited (~50 req/day without credits).
  openrouter: {
    kind: "openai",
    keyEnv: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "nvidia/nemotron-3-super-120b-a12b:free",
    smallModel: "google/gemma-4-26b-a4b-it:free",
  },
  gemini: {
    kind: "openai",
    keyEnv: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-3.5-flash",
    smallModel: "gemini-3.1-flash-lite",
    // Google's Pro tier isn't "gemini-3.5-pro" (that id 404s); the current
    // Pro is gemini-3.1-pro-preview.
    flagship: "gemini-3.1-pro-preview",
    fast: "gemini-3.5-flash",
  },
});

/** [flagship, fast], deduped — the switcher's default picks. */
export const defaultPair = (p: ProviderSpec): string[] => [
  ...new Set([p.flagship || p.model, p.fast || p.smallModel].filter(Boolean)),
];
