import { Linkified } from "@/base/Linkified/Linkified";
import { MessageBubble } from "@/base/MessageBubble/MessageBubble";
import type { ChatItem } from "@/util/types";
import { ToolCard } from "@/blocks/ToolCard/ToolCard";

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
          <div key={index}>
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
