/** CLI entry: one grounded question per invocation, fully traced. */

import { makeAgent } from "./agent.js";
import { loadSettings } from "./config.js";
import { resolveSettings } from "./loop/client.js";
import { makeTracer } from "./ops/tracing.js";

const main = async (): Promise<void> => {
  let agent: ReturnType<typeof makeAgent>;
  let settings: ReturnType<typeof loadSettings>;
  try {
    settings = resolveSettings(loadSettings());
    agent = makeAgent(settings);
  } catch (exc) {
    console.error(exc instanceof Error ? exc.message : String(exc));
    process.exit(1);
  }

  const tracer = makeTracer(settings);
  const question =
    process.argv[2] ??
    "How do I get reimbursed for a lunch I paid for with my own money?";

  tracer.turnStart(question);
  const result = await agent.ask(question, { observer: tracer.event });
  tracer.turnEnd(result.reply, result.iterations);
  await tracer.flush?.();

  console.log(
    "tool calls:",
    result.toolCalls.map((c) => `${c.tool}(${JSON.stringify(c.args)})`),
  );
  console.log("iterations:", result.iterations);
  console.log(`\n${result.reply}`);

  await agent.end();
  await tracer.close?.();
};

main();
