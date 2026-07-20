import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sources } from "@/components/blocks/Sources/Sources";
import { splitSourcesBlock } from "@/util/sources";

type MarkdownMessageProps = {
  content: string;
};

// Element-by-element theming — these are the "custom components" the answer is
// rendered through, so every tag matches the app's design tokens.
const THEME: Components = {
  h1: ({ children }) => <h1 className="mb-2 mt-3 text-[20px] leading-[22px] font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-3 text-[18px] leading-[20px] font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-2 text-[16px] leading-[18px] font-semibold">{children}</h3>,
  p: ({ children }) => <p className="my-2 text-[15px] ">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc text-[15px]  space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal text-[15px]  space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-link font-medium underline break-words"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-accent pl-3 italic text-secondary/80">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-secondary/15" />,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-primary p-3 text-sm text-background">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) return <code className="font-mono text-sm">{children}</code>;
    return <code className="rounded bg-secondary/10 px-1 py-0.5 font-mono text-sm">{children}</code>;
  },
  table: ({ children }) => (
    <table className="my-2 w-full border-collapse text-sm">{children}</table>
  ),
  th: ({ children }) => (
    <th className="border border-secondary/15 bg-background px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-secondary/15 px-2 py-1">{children}</td>,
};

/** Renders an assistant reply: Markdown body + a parsed-out sources card list. */
export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const { body, sources } = splitSourcesBlock(content);
  return (
    <div className="text-base leading-relaxed [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={THEME}>
        {body}
      </ReactMarkdown>
      <Sources items={sources} />
    </div>
  );
}
