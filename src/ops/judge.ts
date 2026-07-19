/**
 * LLM-as-judge scoring — the DeepEval replacement, hand-rolled.
 *
 * Completion (src/ops/scoring.ts) is deterministic — did the right tool fire.
 * Quality is the other half: *how good was the answer*, for the open-ended
 * part a checklist can't see. There's no single right answer, so an LLM
 * grades the transcript against a rubric, 0-10 + a one-line reason.
 *
 * A judge hiccup returns null, never throws — a flaky judge must never fail
 * a run on its own.
 */

import type { LlmClient } from "../types.js";

export type JudgeVerdict = {
  readonly score: number; // 0-10
  readonly reason: string;
  readonly judge: string;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const braceSlice = (text: string): string | null => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start === -1 || end <= start ? null : text.slice(start, end + 1);
};

const askJudge = async (
  client: LlmClient,
  model: string,
  prompt: string,
): Promise<JudgeVerdict | null> => {
  // Bursts of concurrent judge calls may 429; one retry turns most transient
  // failures into a score, a persistent failure still degrades to null.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await client.create({
        model,
        maxTokens: 600, // reasoning models think before the JSON
        messages: [{ role: "user", content: prompt }],
      });
      const text = resp.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      const json = braceSlice(text);
      if (!json) throw new Error("no JSON in judge reply");
      const obj = JSON.parse(json) as { score?: number; reason?: string };
      const score = Math.max(0, Math.min(10, Math.trunc(Number(obj.score))));
      if (!Number.isFinite(score)) throw new Error("no score");
      return {
        score,
        reason: String(obj.reason ?? "").slice(0, 200),
        judge: model,
      };
    } catch {
      if (attempt === 0) await sleep(1500); // brief backoff, then one more try
    }
  }
  return null;
};

/** GEval-style rubric scoring: ONE named metric with free-text criteria,
 * scored 0-10 (normalize /10 against a threshold like 0.6). Mirrors the
 * DeepEval GEval cases in the Python judge suite without the framework. */
export const gevalScore = (
  client: LlmClient,
  model: string,
  testCase: {
    readonly name: string; // "Helpfulness" | "MemoryUse" | ...
    readonly criteria: string;
    readonly input: string;
    readonly actualOutput: string;
    readonly retrievalContext?: readonly string[];
  },
): Promise<JudgeVerdict | null> => {
  const context = testCase.retrievalContext?.length
    ? `\nRetrieval context (the user's stored memories):\n${testCase.retrievalContext.join("\n")}\n`
    : "";
  const prompt = `You are a strict, fair judge evaluating an AI assistant's reply on ONE metric.

Metric: ${testCase.name}
Criteria: ${testCase.criteria}

User input:
${testCase.input.slice(0, 2000)}

Assistant reply:
${testCase.actualOutput.slice(0, 4000)}
${context}
Score the reply against the criteria on a 0-10 scale.
Reply with ONLY this JSON, nothing else:
{"score": <int 0-10>, "reason": "<one short sentence>"}`;
  return askJudge(client, model, prompt);
};

/** The 0-10 arena referee (ports hawk/ops/judge.py judge_reply) — grades how
 * well a reply serves the request, for future Compare use. */
export const judgeReply = (
  client: LlmClient,
  model: string,
  task: string,
  reply: string,
): Promise<JudgeVerdict | null> => {
  if (!reply.trim()) return Promise.resolve(null);
  const prompt = `You are a strict, fair judge scoring an AI assistant's reply.

The user asked:
${task.slice(0, 2000)}

The assistant replied:
${reply.slice(0, 4000)}

Score how well the reply serves the user's request on a 0-10 scale:
- 9-10: fully addresses the request, correct, concise, honest about any limits.
- 5-8: mostly addresses it, minor gaps, padding, or small errors.
- 1-4: partial, vague, or partly wrong.
- 0: ignores the request, hallucinates, or claims actions it didn't take.

Reply with ONLY a JSON object, no prose:
{"score": <int 0-10>, "reason": "<one short sentence>"}`;
  return askJudge(client, model, prompt);
};
