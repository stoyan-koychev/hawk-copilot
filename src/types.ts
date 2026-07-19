/**
 * Shared wire types. Both clients (Anthropic native and the OpenAI-compat
 * bridge) speak the Anthropic Messages shape, so the loop stays wire-agnostic
 * and evals can inject a plain-object scripted client.
 */

export type TextBlock = { readonly type: "text"; readonly text: string };

export type ToolUseBlock = {
  readonly type: "tool_use";
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
  // Gemini attaches a thought_signature to tool calls that must be echoed
  // back on the next request or it 400s. Opaque passthrough.
  readonly extra?: unknown;
};

export type ContentBlock = TextBlock | ToolUseBlock;

export type ToolResultBlock = {
  readonly type: "tool_result";
  readonly tool_use_id: string;
  readonly content: string;
};

export type Message =
  | { readonly role: "user"; readonly content: string | ToolResultBlock[] }
  | { readonly role: "assistant"; readonly content: string | ContentBlock[] };

export type Usage = { readonly input: number; readonly output: number };

export type LlmResponse = {
  readonly stopReason: string; // "end_turn" | "tool_use" | provider-specific
  readonly usage: Usage;
  readonly content: ContentBlock[];
};

/** Tool schema as it goes on the wire (snake_case input_schema stays). */
export type ToolApiSchema = {
  readonly name: string;
  readonly description: string;
  readonly input_schema: Record<string, unknown>;
};

export type CreateParams = {
  readonly model: string;
  readonly system?: string;
  readonly messages: Message[];
  readonly tools?: ToolApiSchema[];
  readonly maxTokens: number;
};

/**
 * One client interface for both wire formats. `stream` is optional (mirrors
 * the Python hasattr check); when present it must resolve to the same final
 * response a non-streaming call would return.
 */
export type LlmClient = {
  readonly create: (params: CreateParams) => Promise<LlmResponse>;
  readonly stream?: (
    params: CreateParams,
    onText: (delta: string) => void,
  ) => Promise<LlmResponse>;
};

export type LoopEvent = Record<string, unknown>;

/** Every interesting moment (llm call, tool run, gate decision, streamed text)
 * flows through observers — the CLI prints them, the tracer records them. */
export type Observer = (kind: string, event: LoopEvent) => void;

export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = <T>(error: string): Result<T> => ({ ok: false, error });

/** Fan one event out to several observers (tracer + UI + capture). */
export const composeObservers =
  (...observers: readonly (Observer | undefined)[]): Observer =>
  (kind, event) => {
    for (const o of observers) o?.(kind, event);
  };
