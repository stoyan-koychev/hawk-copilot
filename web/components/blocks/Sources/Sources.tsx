import { SourceCard } from "@/components/base/SourceCard/SourceCard";
import type { Source } from "@/util/sources";

type SourcesProps = {
  items: Source[];
};

/** The cited-sources block shown under an assistant answer. */
export function Sources({ items }: SourcesProps) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 pb-1.5 border-t border-secondary/10 pt-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary/50">
        Sources
      </div>
      <div className="flex flex-col gap-2">
        {items.map((source) => (
          <SourceCard key={`${source.index}-${source.url}`} {...source} />
        ))}
      </div>
    </div>
  );
}
