/** CLI entry: one grounded question per invocation. */

import { makeAgent } from "./agent.js";
import { loadSettings } from "./config.js";
import { resolveSettings } from "./loop/client.js";

const main = async (): Promise<void> => {
  let agent: ReturnType<typeof makeAgent>;
  try {
    agent = makeAgent(resolveSettings(loadSettings()));
  } catch (exc) {
    console.error(exc instanceof Error ? exc.message : String(exc));
    process.exit(1);
  }

  const question =
    process.argv[2] ??
    "How do I get reimbursed for a lunch I paid for with my own money?";
  const result = await agent.ask(question);

  console.log(
    "tool calls:",
    result.toolCalls.map((c) => `${c.tool}(${JSON.stringify(c.args)})`),
  );
  console.log("iterations:", result.iterations);
  console.log(`\n${result.reply}`);

  await agent.end();
};

main();
