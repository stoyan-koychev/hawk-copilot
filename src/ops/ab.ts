/**
 * A/B the retrieval strategies: every golden case through sparse, dense,
 * and hybrid — recall@8 + MRR overall and per question style.
 *
 *   pnpm ab
 *
 * This is the table that justifies hybrid: each signal should win its home
 * turf (sparse→jargon, dense→paraphrase) and hybrid should win overall.
 */

import { loadSettings } from "../config.js";
import { resolveSettings } from "../loop/client.js";
import { makePool } from "../retrieval/db.js";
import { embedQuery } from "../retrieval/embed.js";
import { denseSearch, rrf, sparseSearch } from "../retrieval/search.js";
import type { ScoredChunk } from "../retrieval/search.js";
import { loadRagCases, mrr, recallAtK } from "./rag-metrics.js";
import { configVersion } from "./version.js";
import { RETRIEVAL_CONFIG } from "../retrieval/config.js";

const K = RETRIEVAL_CONFIG.abK;
const MODES = ["sparse", "dense", "hybrid"] as const;
type Mode = (typeof MODES)[number];

type Score = { recall: number; mrr: number; n: number };
const emptyScore = (): Score => ({ recall: 0, mrr: 0, n: 0 });

const main = async (): Promise<void> => {
  const settings = resolveSettings(loadSettings());
  const pool = makePool(settings.databaseUrl);
  const cases = loadRagCases();

  // scores[mode][style] and scores[mode].overall accumulate across cases
  const scores = new Map<Mode, Map<string, Score>>(
    MODES.map((m) => [m, new Map()]),
  );
  const bump = (mode: Mode, bucket: string, r: 0 | 1, rr: number): void => {
    const byBucket = scores.get(mode)!;
    const s = byBucket.get(bucket) ?? emptyScore();
    s.recall += r;
    s.mrr += rr;
    s.n += 1;
    byBucket.set(bucket, s);
  };

  for (const c of cases) {
    // embed once per case — sparse doesn't need it, dense and hybrid share it
    const embedding = await embedQuery(settings.apiKey, c.question);
    const [sparse, dense] = await Promise.all([
      sparseSearch(pool, c.question, K * 3),
      denseSearch(pool, embedding, K * 3),
    ]);
    const results: Record<Mode, ScoredChunk[]> = {
      sparse: sparse.slice(0, K),
      dense: dense.slice(0, K),
      hybrid: rrf([sparse, dense], K, RETRIEVAL_CONFIG.rrfK),
    };
    for (const mode of MODES) {
      const r = recallAtK(c.expect_url, results[mode], K);
      const rr = mrr(c.expect_url, results[mode]);
      bump(mode, "overall", r, rr);
      bump(mode, c.style, r, rr);
      if (mode === "hybrid" && r === 0) {
        console.log(`  miss (hybrid): ${c.id} — expected ${c.expect_url}`);
      }
    }
  }

  const fmt = (s: Score | undefined): string =>
    s
      ? `recall ${(s.recall / s.n).toFixed(2)}  mrr ${(s.mrr / s.n).toFixed(2)}`
      : "—";
  const buckets = ["overall", "jargon", "paraphrase", "mixed"];
  console.log(`\n${cases.length} cases, k=${K}, config ${configVersion()}\n`);
  console.log(`${"".padEnd(12)}${MODES.map((m) => m.padEnd(24)).join("")}`);
  for (const b of buckets) {
    const row = MODES.map((m) => fmt(scores.get(m)!.get(b)).padEnd(24)).join(
      "",
    );
    console.log(`${b.padEnd(12)}${row}`);
  }
  await pool.end();
};

main();
