import { CountUp } from "@/components/base/CountUp/CountUp";
import { useToolCard } from "./ToolCard.model";

type ToolCardProps = {
  tool: string;
  output: string;
};

/** A tool result in the timeline: an FX card for conversions, else a mono card. */
export function ToolCard({ tool, output }: ToolCardProps) {
  const conversion = useToolCard(output);

  if (tool === "convert_currency" && conversion) {
    return (
      <div className="tool-card my-2 inline-block rounded-xl border-2 border-accent bg-white px-4 py-3 shadow-sm">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
          live exchange rate
        </div>
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-secondary/70">
            {conversion.fromAmount} {conversion.fromCurrency}
          </span>
          <span className="text-accent">&rarr;</span>
          <span className="text-primary">
            <CountUp value={Number.parseFloat(conversion.toAmount)} suffix={conversion.toCurrency} />
          </span>
        </div>
        <div className="text-[10px] text-secondary/50">
          rate {conversion.rate} &middot; {conversion.source}
        </div>
      </div>
    );
  }

  return (
    <div className="tool-card my-2 rounded-lg border border-secondary/15 bg-white px-3 py-2 font-mono text-xs text-secondary">
      <span className="font-semibold text-primary">{tool}</span> &middot; {output}
    </div>
  );
}
