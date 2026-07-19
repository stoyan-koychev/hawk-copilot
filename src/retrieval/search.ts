/**
 * Hybrid retrieval over the org knowledge base.
 *
 *   sparse  — ts_rank_cd over the generated tsvector (BM25-family: exact
 *             terms, product names, error codes)
 *   dense   — pgvector cosine over embeddings (paraphrase and meaning)
 *   hybrid  — both in parallel, fused by Reciprocal Rank Fusion (RRF)
 *
 * All three return the same ScoredChunk shape, so callers (the search_docs
 * tool, the A/B runner) can swap strategies with one function reference.
 */

import type { DbPool } from "./db.js";
import { embedQuery } from "./embed.js";

export type ScoredChunk = {
  readonly id: number;
  readonly url: string;
  readonly title: string;
  readonly section: string;
  readonly text: string;
  readonly score: number;
};

const CHUNK_COLUMNS = "c.id, d.url, d.title, c.section, c.text";

export const sparseSearch = async (
  pool: DbPool,
  query: string,
  k = 8,
): Promise<ScoredChunk[]> => {
  const { rows } = await pool.query(
    `SELECT ${CHUNK_COLUMNS},
            ts_rank_cd(c.tsv, websearch_to_tsquery('english', $1)) AS score
     FROM chunks c JOIN documents d ON d.id = c.document_id
     WHERE c.tsv @@ websearch_to_tsquery('english', $1)
     ORDER BY score DESC LIMIT $2`,
    [query, k],
  );
  return rows as ScoredChunk[];
};

export const denseSearch = async (
  pool: DbPool,
  embedding: number[],
  k = 8,
): Promise<ScoredChunk[]> => {
  const vector = JSON.stringify(embedding); // '[0.1,0.2,...]' is valid pgvector literal syntax
  const { rows } = await pool.query(
    `SELECT ${CHUNK_COLUMNS},
            1 - (c.embedding <=> $1::vector) AS score
     FROM chunks c JOIN documents d ON d.id = c.document_id
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    [vector, k],
  );
  return rows as ScoredChunk[];
};

/** Reciprocal Rank Fusion: a chunk at rank r in any list contributes
 * 1/(K + r); consensus across lists beats a high rank in one. Pure —
 * unit-testable with hand-made lists, no DB. K=60 per the original paper. */
export const rrf = (lists: ScoredChunk[][], k = 8, K = 60): ScoredChunk[] => {
  const fused = new Map<number, { chunk: ScoredChunk; score: number }>();
  for (const list of lists) {
    list.forEach((chunk, index) => {
      const entry = fused.get(chunk.id) ?? { chunk, score: 0 };
      entry.score += 1 / (K + index + 1);
      fused.set(chunk.id, entry);
    });
  }
  return [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ chunk, score }) => ({ ...chunk, score }));
};

export const hybridSearch = async (
  pool: DbPool,
  apiKey: string,
  query: string,
  k = 8,
): Promise<ScoredChunk[]> => {
  const embedding = await embedQuery(apiKey, query);
  // over-fetch each signal so fusion has real material to disagree about
  const [sparse, dense] = await Promise.all([
    sparseSearch(pool, query, k * 3),
    denseSearch(pool, embedding, k * 3),
  ]);
  return rrf([sparse, dense], k);
};
