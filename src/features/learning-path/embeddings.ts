/**
 * Embedding utilities for RAG — server-only.
 * Uses Gemini text-embedding-001 (768 dimensions).
 */

import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "@/shared/core/env";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 768;

function getClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getGeminiApiKey() });
}

export interface EmbeddingResult {
  values: number[];
}

/**
 * Generate a single embedding for the given text.
 * Returns 768-dimensional vector for pgvector storage.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text?.trim()) {
    throw new Error("Cannot embed empty text");
  }
  const client = getClient();
  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text.trim(),
    config: {
      outputDimensionality: EMBEDDING_DIMS,
    },
  });

  const embeddings = (response as { embeddings?: { values?: number[] }[] }).embeddings;
  if (!Array.isArray(embeddings) || embeddings.length === 0 || !embeddings[0]) {
    throw new Error("Empty embedding response");
  }
  const values = (embeddings[0] as { values?: number[] }).values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) {
    throw new Error(`Expected ${EMBEDDING_DIMS}-dim embedding, got ${values?.length ?? 0}`);
  }
  return values;
}

/**
 * Generate embeddings for multiple texts in one call (batch).
 * Returns array of 768-dim vectors in same order as input.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const trimmed = texts.filter((t) => t?.trim()).map((t) => t.trim());
  if (trimmed.length === 0) {
    return [];
  }

  const client = getClient();
  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: trimmed,
    config: {
      outputDimensionality: EMBEDDING_DIMS,
    },
  });

  const embeddings = (response as { embeddings?: { values?: number[] }[] }).embeddings;
  if (!Array.isArray(embeddings) || embeddings.length !== trimmed.length) {
    throw new Error(`Expected ${trimmed.length} embeddings, got ${embeddings?.length ?? 0}`);
  }

  return embeddings.map((e) => {
    const values = (e as { values?: number[] }).values;
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMS) {
      throw new Error(`Invalid embedding dimension: ${values?.length ?? 0}`);
    }
    return values;
  });
}
