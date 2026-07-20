import { Linkified } from "@/components/base/Linkified/Linkified";
import { MessageBubble } from "@/components/base/MessageBubble/MessageBubble";
import type { ChatItem } from "@/util/types";
import { ToolCard } from "@/components/blocks/ToolCard/ToolCard";

type MessageTimelineProps = {
  items: ChatItem[];
};

// A placeholder ellipsis is shown while an assistant bubble is still streaming.
const STREAMING_PLACEHOLDER = "…";

/** The single interleaved timeline of message bubbles and tool cards. */
export function MessageTimeline({ items }: MessageTimelineProps) {
  return (
    <>
      {items.map((item, index) =>
        item.kind === "card" ? (
          // Indent by the agent avatar width (w-8) + gap-2 so tool cards line up
          // with the agent's bubble rather than the panel edge.
          <div key={index} className="ml-10">
            <ToolCard tool={item.tool} output={item.output} />
          </div>
        ) : (
          <MessageBubble key={index} role={item.kind}>
            {item.content ? <Linkified text={item.content} /> : STREAMING_PLACEHOLDER}
          </MessageBubble>
        ),
      )}
    </>
  );
}
