import { CurrencyConverter } from "@/components/blocks/CurrencyConverter/CurrencyConverter";
import { useToolCard } from "./ToolCard.model";

type ToolCardProps = {
  tool: string;
  output: string;
};

/** A tool result in the timeline: an FX converter for conversions, else a mono card. */
export function ToolCard({ tool, output }: ToolCardProps) {
  const conversion = useToolCard(output);

  if (tool === "convert_currency" && conversion) {
    return <CurrencyConverter conversion={conversion} />;
  }

  return (
    <div className="tool-card my-2 rounded-lg border border-secondary/15 bg-white px-3 py-2 font-mono text-xs text-secondary">
      <span className="font-semibold text-primary">{tool}</span> &middot; {output}
    </div>
  );
}
