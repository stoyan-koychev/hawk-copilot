import { makeAgent } from "@agent/agent";
import { loadSettings } from "@agent/config";
import { resolveSettings } from "@agent/loop/client";
import { makeTracer } from "@agent/ops/tracing";
import { composeObservers } from "@agent/types";
import type { LoopEvent, Message } from "@agent/types";

export const runtime = "nodejs";

// Module-level singletons: Next keeps this module warm across requests, so
// one pool + one tracer serve the whole dev session.
const settings = resolveSettings(loadSettings());
const agent = makeAgent(settings);
const tracer = makeTracer(settings);

export const POST = async (req: Request): Promise<Response> => {
  const { message, history = [] } = (await req.json()) as {
    message?: string;
    history?: Message[];
  };
  if (!message?.trim())
    return Response.json({ error: "empty message" }, { status: 400 });

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
            if (kind === "tool") {
              const output = String(ev.output ?? "");
              emit("tool", {
                tool: ev.tool,
                args: ev.args,
                // small outputs (FX result, same-currency guard) ride along and become
                // cards; big ones (6-chunk search dumps) stay backstage
                ...(output.length <= 300 ? { output } : {}),
              });
            } else if (kind === "llm") emit("llm", { usage: ev.usage });
            else if (kind === "text") emit("text", { delta: ev.delta });
          }),
        });
        tracer.turnEnd(result.reply, result.iterations);
        emit("done", { reply: result.reply, iterations: result.iterations });
      } catch (exc) {
        emit("done", {
          error: exc instanceof Error ? exc.message : String(exc),
        });
      } finally {
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
