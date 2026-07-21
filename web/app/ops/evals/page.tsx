import type { AbResults, EvalRun } from "@agent/ops/eval-store";
import { getEvals, opsConfigured } from "@/lib/traces";
import { cn } from "@/util/cn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = ["sparse", "dense", "hybrid"] as const;
const BUCKETS = ["overall", "jargon", "paraphrase", "mixed"] as const;

const pct = (value: number): string => `${Math.round(value * 100)}%`;
const suiteCount = (run: EvalRun, suite: string): string => {
  const s = run.suites?.[suite];
  return s ? `${s.passed}/${s.passed + s.failed}` : "—";
};

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-h1 font-semibold text-primary">{title}</h1>
      <p className="mt-2 text-sm text-secondary/70">{body}</p>
    </main>
  );
}

export default async function EvalsPage() {
  if (!opsConfigured()) {
    return (
      <Notice
        title="Traces DB not configured"
        body="Set HAWK_TRACE_DATABASE_URL and run `pnpm gate` / `pnpm ab` to populate this page."
      />
    );
  }

  const data = await getEvals();
  const { latestGate, gateHistory, latestAb } = data!;

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <h1 className="font-heading text-2xl font-bold text-primary">Evals &mdash; quality</h1>

      {/* Release gate */}
      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-secondary">Release gate</h2>
        {latestGate == null ? (
          <Empty text="No gate run yet — run `pnpm gate`." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Verdict label="Deterministic" verdict={latestGate.deterministic} note={suiteCount(latestGate, "deterministic")} />
              <Verdict label="Judge" verdict={latestGate.judge} note={suiteCount(latestGate, "judge")} />
              <Stat label="Config" value={latestGate.config ?? "—"} mono />
              <Stat label="Ran" value={new Date(latestGate.ran_at).toLocaleString()} />
            </div>
            {gateHistory.length > 1 && (
              <div className="overflow-hidden rounded-xl border border-secondary/10 bg-white">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-secondary/10 text-left text-secondary">
                      <th className="px-3 py-2 font-semibold">Ran</th>
                      <th className="px-3 py-2 font-semibold">Config</th>
                      <th className="px-3 py-2 font-semibold">Deterministic</th>
                      <th className="px-3 py-2 font-semibold">Judge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateHistory.map((run, index) => (
                      <tr key={index} className="border-t border-secondary/10">
                        <td className="px-3 py-2 text-secondary/70 tabular-nums">
                          {new Date(run.ran_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-ink">{run.config}</td>
                        <td className="px-3 py-2"><Dot verdict={run.deterministic} /> {suiteCount(run, "deterministic")}</td>
                        <td className="px-3 py-2"><Dot verdict={run.judge} /> {suiteCount(run, "judge")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* Retrieval A/B */}
      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold text-secondary">Retrieval A/B</h2>
        {latestAb == null ? (
          <Empty text="No A/B run yet — run `pnpm ab`." />
        ) : (
          <>
            <p className="text-xs text-secondary/50">
              {latestAb.cases} cases · k={latestAb.k} · config {latestAb.config} ·{" "}
              {new Date(latestAb.ran_at).toLocaleString()} — sparse wins jargon, dense wins
              paraphrase, hybrid wins overall.
            </p>
            <AbTable results={latestAb.results} />
          </>
        )}
      </section>
    </main>
  );
}

function AbTable({ results }: { results: AbResults }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-secondary/10 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-secondary/10 text-left text-secondary">
            <th className="px-3 py-2 font-semibold">Style</th>
            {MODES.map((mode) => (
              <th
                key={mode}
                className={cn("px-3 py-2 font-semibold capitalize", mode === "hybrid" && "text-primary")}
              >
                {mode}
                {mode === "hybrid" && " ★"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BUCKETS.map((bucket) => (
            <tr key={bucket} className="border-t border-secondary/10">
              <td className="px-3 py-2 font-medium capitalize text-secondary">{bucket}</td>
              {MODES.map((mode) => {
                const cell = results[mode]?.[bucket] ?? null;
                return (
                  <td key={mode} className={cn("px-3 py-2", mode === "hybrid" && "bg-accent/5")}>
                    {cell == null ? (
                      <span className="text-secondary/30">—</span>
                    ) : (
                      <div>
                        <div className="tabular-nums text-ink">
                          recall {pct(cell.recall)} · mrr {cell.mrr.toFixed(2)}
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-secondary/10">
                          <div
                            className={cn("h-1.5 rounded-full", mode === "hybrid" ? "bg-primary" : "bg-secondary")}
                            style={{ width: pct(cell.recall) }}
                          />
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isPass(verdict: string | null): boolean {
  return verdict === "pass";
}

function Dot({ verdict }: { verdict: string | null }) {
  const neutral = verdict === "skipped" || verdict === "not run";
  return (
    <span
      className={cn(
        "mr-1 inline-block h-2 w-2 rounded-full",
        neutral ? "bg-secondary/30" : isPass(verdict) ? "bg-accent" : "bg-red-500",
      )}
    />
  );
}

function Verdict({ label, verdict, note }: { label: string; verdict: string | null; note: string }) {
  return (
    <div className="rounded-xl border border-secondary/10 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-secondary/50">{label}</div>
      <div className="mt-1 flex items-center text-lg font-bold text-primary">
        <Dot verdict={verdict} />
        <span className="capitalize">{verdict ?? "—"}</span>
      </div>
      <div className="text-xs text-secondary/50">{note}</div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-secondary/10 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-secondary/50">{label}</div>
      <div className={cn("mt-1 text-lg font-bold text-primary", mono && "font-mono text-base")}>
        {value}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-secondary/10 bg-white p-4 text-secondary/50">{text}</p>;
}
