import { PurgeTracesButton } from "@/components/blocks/PurgeTracesButton/PurgeTracesButton";
import { getDashboard, opsConfigured } from "@/lib/traces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ms = (value: number | null): string => (value == null ? "—" : `${Math.round(value)} ms`);
const usd = (value: number): string => `$${value.toFixed(4)}`;

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-h1 font-semibold text-primary">{title}</h1>
      <p className="mt-2 text-sm text-secondary/70">{body}</p>
    </main>
  );
}

export default async function OpsPage() {
  if (!opsConfigured()) {
    return (
      <Notice
        title="Traces DB not configured"
        body="Set HAWK_TRACE_DATABASE_URL to the traces Supabase project to enable this dashboard."
      />
    );
  }

  const dashboard = await getDashboard();
  const { turns, latency, costByDay } = dashboard!;
  const totalCost = costByDay.reduce((sum, row) => sum + row.cost_usd, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-primary">Ops &mdash; traces</h1>
        <PurgeTracesButton />
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Turns" value={String(turns.length)} />
        <Stat label="Latency p50" value={ms(latency.p50)} />
        <Stat label="Latency p95" value={ms(latency.p95)} />
        <Stat label="Cost (30d)" value={usd(totalCost)} />
      </section>

      <section>
        <h2 className="mb-2 font-heading text-sm font-semibold text-secondary">Cost by day</h2>
        <Table
          head={["Day", "Model", "Tokens in", "Tokens out", "Cost"]}
          rows={costByDay.map((row) => [
            row.day,
            row.model,
            row.tokens_in.toLocaleString(),
            row.tokens_out.toLocaleString(),
            usd(row.cost_usd),
          ])}
        />
      </section>

      <section>
        <h2 className="mb-2 font-heading text-sm font-semibold text-secondary">
          Recent turns ({turns.length})
        </h2>
        <Table
          head={["Started", "Question", "Duration", "Tools", "Tokens (in/out)"]}
          rows={turns.map((turn) => [
            turn.started ? new Date(turn.started).toLocaleString() : "—",
            (turn.question ?? "").slice(0, 80),
            ms(turn.duration_ms),
            String(turn.tool_calls),
            `${turn.tokens_in} / ${turn.tokens_out}`,
          ])}
        />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-secondary/10 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-secondary/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-primary tabular-nums">{value}</div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-secondary/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-background text-left">
            {head.map((cell) => (
              <th key={cell} className="px-3 py-2 font-semibold text-secondary">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-secondary/50" colSpan={head.length}>
                No data yet.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-t border-secondary/10">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 text-ink tabular-nums">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
