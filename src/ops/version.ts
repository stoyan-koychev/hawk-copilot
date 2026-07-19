import { createHash } from "node:crypto";
import { SYSTEM } from "../agent.js";
import { RETRIEVAL_CONFIG } from "../retrieval/config.js";

export const configVersion = (): string =>
  createHash("sha256")
    .update(SYSTEM)
    .update(JSON.stringify(RETRIEVAL_CONFIG))
    .digest("hex")
    .slice(0, 8);
