// Pure text-to-segments splitter used by the Linkified atom. Keeping this free
// of JSX makes it unit-testable and reusable; rendering lives in the component.

export type TextSegment = { type: "text" | "link"; value: string };

const URL_PATTERN = /(https?:\/\/\S+)/g;

/** Split a string into ordered text and link segments, preserving order. */
export function splitTextAndLinks(text: string): TextSegment[] {
  return text
    .split(URL_PATTERN)
    .filter((part) => part.length > 0)
    .map((part) => ({
      type: part.startsWith("http") ? "link" : "text",
      value: part,
    }));
}
