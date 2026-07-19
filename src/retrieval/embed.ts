/**
 * Query-time embeddings — the other half of the contract with ingestion:
 * the SAME model that embedded the chunks must embed the question, or the
 * cosine geometry is meaningless.
 */

import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims, matches vector(1536)

export const embedQuery = async (
  apiKey: string,
  text: string,
): Promise<number[]> => {
  const client = new OpenAI({ apiKey });
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0]?.embedding ?? [];
};
