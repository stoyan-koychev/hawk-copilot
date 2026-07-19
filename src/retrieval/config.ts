import { EMBEDDING_MODEL } from "./embed.js";

export const RETRIEVAL_CONFIG = {
  k: 6, // chunks handed to the model (search_docs)
  abK: 8, // k used by the A/B eval
  rrfK: 60, // RRF dampening constant
  embeddingModel: EMBEDDING_MODEL,
} as const;
