import type { Source } from "@/util/sources";


/** A single clickable source: index badge + title + host. */
export function SourceCard({ index, title, url }: Source) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-start gap-2 rounded-xl border border-secondary/15 bg-white p-2.5 transition hover:border-accent"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
        {index}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{title}</span>
      </span>
    </a>
  );
}
