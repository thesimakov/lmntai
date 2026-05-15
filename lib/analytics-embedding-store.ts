/**
 * Hybrid BM25 + vector search for analytics chunk retrieval.
 * Embeddings are stored in AnalyticsChunkEmbedding (vector as Json array).
 * At query time: BM25 score + cosine similarity are linearly combined.
 */

import { prisma } from "@/lib/prisma";
import { embedText, embedBatch, cosineSimilarity } from "@/lib/embeddings";
import { retrieveRelevantChunks } from "@/lib/text-rag";

const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 100;
const ALPHA = 0.5; // weight for semantic score (1-ALPHA for BM25)
const TOP_K = 4;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    let boundary = end;
    if (end < text.length) {
      const searchFrom = Math.max(start, end - 50);
      const nextNewline = text.indexOf("\n", searchFrom);
      if (nextNewline !== -1 && nextNewline < end + 100) boundary = nextNewline + 1;
    }
    const chunk = text.slice(start, boundary).trim();
    if (chunk.length > 20) chunks.push(chunk);
    const next = boundary - CHUNK_OVERLAP;
    if (next <= start) break;
    start = next;
  }
  return chunks;
}

export async function upsertChunks(projectId: string, rawText: string): Promise<void> {
  const chunks = chunkText(rawText);
  if (chunks.length === 0) return;

  const vectors = await embedBatch(chunks);

  // Delete old embeddings for this project, then insert fresh
  await prisma.analyticsChunkEmbedding.deleteMany({ where: { projectId } });
  await prisma.analyticsChunkEmbedding.createMany({
    data: chunks.map((chunk, i) => ({
      projectId,
      position: i,
      chunkText: chunk,
      vector: vectors[i] as number[],
    })),
  });
}

export async function hybridSearch(
  projectId: string,
  rawText: string,
  query: string,
  topK = TOP_K
): Promise<string[]> {
  const rows = await prisma.analyticsChunkEmbedding.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
  });

  // Fall back to pure BM25 if no embeddings stored
  if (rows.length === 0) {
    return retrieveRelevantChunks(rawText, query, topK);
  }

  let queryVec: number[];
  try {
    queryVec = await embedText(query);
  } catch {
    // If embedding fails, fall back to BM25
    return retrieveRelevantChunks(rawText, query, topK);
  }

  // BM25 scores via existing implementation
  const bm25Chunks = retrieveRelevantChunks(rawText, query, rows.length);
  const bm25Rank = new Map<string, number>();
  bm25Chunks.forEach((chunk, rank) => {
    bm25Rank.set(chunk.slice(0, 60), rows.length - rank);
  });

  const maxBm25 = rows.length;

  const scored = rows.map((row) => {
    const vec = row.vector as number[];
    const semantic = cosineSimilarity(queryVec, vec);
    const bm25Key = row.chunkText.slice(0, 60);
    const bm25Normalized = (bm25Rank.get(bm25Key) ?? 0) / maxBm25;
    const combined = ALPHA * semantic + (1 - ALPHA) * bm25Normalized;
    return { chunk: row.chunkText, score: combined };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK).map((s) => s.chunk);

  // Restore original document order for readability
  const topSet = new Set(top);
  return rows
    .filter((r) => topSet.has(r.chunkText))
    .map((r) => r.chunkText);
}
