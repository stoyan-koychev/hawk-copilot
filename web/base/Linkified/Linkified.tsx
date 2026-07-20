import { splitTextAndLinks } from "@/util/linkify";

type LinkifiedProps = {
  text: string;
};

/** Renders text with any URLs turned into links. Splitting logic lives in util. */
export function Linkified({ text }: LinkifiedProps) {
  return (
    <>
      {splitTextAndLinks(text).map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={index}
            href={segment.value}
            target="_blank"
            className="text-link font-medium underline break-all"
          >
            {segment.value}
          </a>
        ) : (
          segment.value
        ),
      )}
    </>
  );
}
