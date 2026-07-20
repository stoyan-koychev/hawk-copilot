// Pulls the agent's trailing ```sources block out of a reply so the body can be
// rendered as Markdown and the sources as their own component. Kept pure and
// free of JSX so it stays unit-testable; react-markdown never sees the block.

export type Source = { index: number; title: string; url: string };

export type SplitResult = { body: string; sources: Source[] };

const CLOSED_BLOCK = /\n?```sources\s*\n([\s\S]*?)```/;
// An opening fence with no close yet — happens mid-stream before the block lands.
const OPEN_BLOCK = /\n?```sources[\s\S]*$/;
// One source line: "[1] | Title | https://…" (brackets optional).
const SOURCE_LINE = /^\s*\[?(\d+)\]?\s*\|\s*(.+?)\s*\|\s*(\S+)\s*$/;

function parseLines(raw: string): Source[] {
  const sources: Source[] = [];
  for (const line of raw.split("\n")) {
    const match = line.match(SOURCE_LINE);
    if (match) {
      sources.push({ index: Number(match[1]), title: match[2]!, url: match[3]! });
    }
  }
  return sources;
}

/**
 * Split a reply into its Markdown body and parsed sources.
 * - closed ```sources block → removed from body, parsed into sources.
 * - open (still streaming) block → stripped from body, sources empty until it closes.
 * - no block → body unchanged, no sources.
 */
export function splitSourcesBlock(content: string): SplitResult {
  const closed = content.match(CLOSED_BLOCK);
  if (closed) {
    const body = content.slice(0, closed.index).trimEnd();
    return { body, sources: parseLines(closed[1]!) };
  }
  if (OPEN_BLOCK.test(content)) {
    return { body: content.replace(OPEN_BLOCK, "").trimEnd(), sources: [] };
  }
  return { body: content, sources: [] };
}
