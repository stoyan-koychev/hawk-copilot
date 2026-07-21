import { FeedbackButtons } from "@/components/base/FeedbackButtons/FeedbackButtons";
import { Linkified } from "@/components/base/Linkified/Linkified";
import { MarkdownMessage } from "@/components/base/MarkdownMessage/MarkdownMessage";
import { MessageBubble } from "@/components/base/MessageBubble/MessageBubble";
import { TypingStatus } from "@/components/base/TypingStatus/TypingStatus";
import type { AgentStatus, ChatItem } from "@/util/types";
import { ToolCard } from "@/components/blocks/ToolCard/ToolCard";

type MessageTimelineProps = {
  items: ChatItem[];
  status: AgentStatus | null;
};

// Shown in an assistant bubble that has no text yet and no active status.
const STREAMING_PLACEHOLDER = "…";

/** The single interleaved timeline of message bubbles and tool cards. */
export function MessageTimeline({ items, status }: MessageTimelineProps) {
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
          <div key={index}>
            <MessageBubble role={item.kind}>
              {item.content ? (
                // Assistant replies are Markdown (+ a sources block); user text is plain.
                item.kind === "assistant" ? (
                  <MarkdownMessage content={item.content} />
                ) : (
                  <Linkified text={item.content} />
                )
              ) : status ? (
                // The empty assistant bubble shows the live "what am I doing" status.
                <TypingStatus status={status} />
              ) : (
                STREAMING_PLACEHOLDER
              )}
            </MessageBubble>
            {/* Feedback appears under a finished assistant reply, indented to the bubble. */}
            {item.kind === "assistant" && item.content && item.turnId && (
              <div className="ml-10 mt-1">
                <FeedbackButtons turnId={item.turnId} />
              </div>
            )}
          </div>
        ),
      )}
    </>
  );
}
