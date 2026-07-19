// LLM-AS-JUDGE EVAL â does the agent tell the truth from what it retrieved?
//
//   Faithfulness  â every claim supported by the passages (no invented behavior)
//   Groundedness  â the answer is built FROM the passages and cites them
//
// Scored 0-10 by the small model against a rubric, thresholded at 0.6.
// Costs real API calls â gated on HAS_KEY, never part of `pnpm test`.

import { describe, expect, it } from "vitest";
import { makeAgent } from "../../src/agent.js";
import type { Agent } from "../../src/agent.js";
import { loadSettings } from "../../src/config.js";
import { resolveSettings } from "../../src/loop/client.js";
import { gevalScore } from "../../src/ops/judge.js";
import { loadRagCases } from "../../src/ops/rag-metrics.js";
import { HAS_KEY } from "../helpers.js";

const THRESHOLD = 0.6;
const CASE_IDS = ["reimburse-lunch", "netsuite-sync", "team-card-limits"];

describe.skipIf(!HAS_KEY)("RAG answer quality (LLM-as-judge)", () => {
  const settings = resolveSettings(loadSettings());
  const cases = loadRagCases().filter((c) => CASE_IDS.includes(c.id));

  /** One agent turn; retrieval context = what the model ACTUALLY saw. */
  const runCase = async (agent: Agent, question: string) => {
    const result = await agent.ask(question);
    const passages = result.toolCalls
      .filter((c) => c.tool === "search_docs")
      .map((c) => c.output);
    return { reply: result.reply, passages };
  };

  for (const c of cases) {
    it(`${c.id}: faithful and grounded`, async () => {
      const agent = makeAgent(settings);
      try {
        const { reply, passages } = await runCase(agent, c.question);
        expect(
          passages.length,
          "agent never called search_docs",
        ).toBeGreaterThan(0);

        const faithful = await gevalScore(agent.client, settings.smallModel, {
          name: "Faithfulness",
          criteria:
            "Every factual claim about Payhawk in the reply must be supported by the " +
            "provided documentation passages. Penalize any invented features, steps, " +
            "or product behavior not present in the passages.",
          input: c.question,
          actualOutput: reply,
          retrievalContext: passages,
        });
        expect(faithful, "faithfulness judge unreachable").not.toBeNull();
        expect(
          faithful!.score / 10,
          `faithfulness: ${faithful!.reason}`,
        ).toBeGreaterThanOrEqual(THRESHOLD);

        const grounded = await gevalScore(agent.client, settings.smallModel, {
          name: "Groundedness",
          criteria:
            "The reply should be built from the provided passages and cite them inline " +
            "as [1], [2] with a Sources list. Penalize answers that ignore the passages " +
            "or make uncited claims.",
          input: c.question,
          actualOutput: reply,
          retrievalContext: passages,
        });
        expect(grounded, "groundedness judge unreachable").not.toBeNull();
        expect(
          grounded!.score / 10,
          `groundedness: ${grounded!.reason}`,
        ).toBeGreaterThanOrEqual(THRESHOLD);
      } finally {
        await agent.end();
      }
    });
  }
});
