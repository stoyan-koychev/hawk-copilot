import { makeAgent } from "@agent/agent";
import { loadSettings } from "@agent/config";
import { resolveSettings } from "@agent/loop/client";
import { makeTracer } from "@agent/ops/tracing";
import { composeObservers } from "@agent/types";
import type { LoopEvent, Message } from "@agent/types";

export const runtime = "nodejs";
// A multi-tool turn (retrieval + FX + streaming) can run well past the default
// serverless limit; give it headroom (Vercel Hobby caps at 60s, Pro at 300s).
export const maxDuration = 60;

// Module-level singletons: Next keeps this module warm across requests, so one
// pool serves the whole dev session. The tracer, however, is built PER REQUEST
// (below) so each turn gets its own turn_id without a shared-singleton race.
const settings = resolveSettings(loadSettings());
const agent = makeAgent(settings);

export const POST = async (req: Request): Promise<Response> => {
  const { message, history = [] } = (await req.json()) as {
    message?: string;
    history?: Message[];
  };
  if (!message?.trim())
    return Response.json({ error: "empty message" }, { status: 400 });

  const tracer = makeTracer(settings);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (kind: string, ev: LoopEvent): void => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ kind, ...ev })}\n\n`),
        );
      };
      tracer.turnStart(message);
      try {
        const result = await agent.ask(message, {
          history,
          stream: true,
          observer: composeObservers(tracer.event, (kind, ev) => {
            if (kind === "tool_start") {
              emit("tool_start", { tool: ev.tool });
            } else if (kind === "tool") {
              const output = String(ev.output ?? "");
              emit("tool", {
                tool: ev.tool,
                args: ev.args,
                // Only currency results render as an in-chat card (the converter and
                // the same-currency guard). search_docs / read_full_doc outputs —
                // including guard messages like an empty-query retry — stay backstage
                // in the harness, never as a card.
                ...(ev.tool === "convert_currency" && output.length <= 300 ? { output } : {}),
              });
            } else if (kind === "llm") emit("llm", { usage: ev.usage });
            else if (kind === "text") emit("text", { delta: ev.delta });
          }),
        });
        tracer.turnEnd(result.reply, result.iterations);
        // turnId lets the browser correlate feedback to this turn (db backend only).
        emit("done", {
          reply: result.reply,
          iterations: result.iterations,
          ...(tracer.turnId ? { turnId: tracer.turnId } : {}),
        });
      } catch (exc) {
        emit("done", {
          error: exc instanceof Error ? exc.message : String(exc),
          ...(tracer.turnId ? { turnId: tracer.turnId } : {}),
        });
      } finally {
        // Ensure buffered trace writes (db backend) land before the function freezes.
        await tracer.flush?.();
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
};
