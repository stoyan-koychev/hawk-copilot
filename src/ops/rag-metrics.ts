/**
 * Retrieval quality metrics — pure functions, no DB, no model, no cost.
 *
 *   recall@k — "did the right page make it into the top k at all?"
 *              The retriever's job is to put the answer in front of the
 *              model; recall@k measures exactly that and nothing else.
 *   MRR      — "how high did it rank?" 1/position of the first hit.
 *              Two systems can both have recall 1.0 while one buries the
 *              answer at rank 7 — MRR tells them apart.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

export type RagCase = {
  readonly id: string;
  readonly style: "paraphrase" | "jargon" | "mixed";
  readonly question: string;
  readonly expect_url: string;
};

/** Anything with a url — structurally matches ScoredChunk without importing it. */
export type RankedResult = { readonly url: string };

const DATASET = path.resolve(
  import.meta.dirname,
  "../../evals/rag-dataset.jsonl",
);

export const loadRagCases = (datasetPath: string = DATASET): RagCase[] =>
  readFileSync(datasetPath, "utf-8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as RagCase);

/** 1 if expectedUrl appears in the top k results, else 0.
 * Deduped by url first: three chunks from the same page count as one page. */
export const recallAtK = (
  expectedUrl: string,
  results: RankedResult[],
  k: number,
): 0 | 1 => {
  const urls = [...new Set(results.map((r) => r.url))].slice(0, k);
  return urls.includes(expectedUrl) ? 1 : 0;
};

/** Reciprocal rank of the FIRST result from the expected page: 1st → 1.0,
 * 3rd → 0.333, absent → 0. Averaged over a dataset this is "MRR". */
export const mrr = (expectedUrl: string, results: RankedResult[]): number => {
  const urls = [...new Set(results.map((r) => r.url))];
  const index = urls.indexOf(expectedUrl);
  return index === -1 ? 0 : 1 / (index + 1);
};
