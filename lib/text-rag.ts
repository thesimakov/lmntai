/**
 * Lightweight BM25-style retrieval — no external API needed.
 * Chunks a raw text document and ranks chunks by keyword relevance to a query.
 */

const CHUNK_SIZE = 600;   // ~600 chars ≈ 120 tokens
const CHUNK_OVERLAP = 100; // overlap to avoid cutting mid-sentence
const TOP_K = 4;
const K1 = 1.5;
const B = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zа-я0-9%.$€£¥₽\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    let boundary = end;
    if (end < text.length) {
      const searchFrom = Math.max(start, end - 50);
      const nextNewline = text.indexOf("\n", searchFrom);
      if (nextNewline !== -1 && nextNewline < end + 100) boundary = nextNewline + 1;
    }
    const chunk = text.slice(start, boundary).trim();
    if (chunk.length > 20) chunks.push(chunk);
    const next = boundary - overlap;
    if (next <= start) break; // prevent infinite loop on short text
    start = next;
  }
  return chunks;
}

function buildIdf(corpus: string[][]): Map<string, number> {
  const docFreq = new Map<string, number>();
  for (const doc of corpus) {
    const uniq = new Set(doc);
    for (const term of uniq) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }
  const N = corpus.length;
  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }
  return idf;
}

function bm25Score(
  queryTerms: string[],
  docTerms: string[],
  idf: Map<string, number>,
  avgDocLen: number
): number {
  const termFreq = new Map<string, number>();
  for (const t of docTerms) termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
  const dl = docTerms.length;

  let score = 0;
  for (const term of queryTerms) {
    const tf = termFreq.get(term) ?? 0;
    if (tf === 0) continue;
    const idfVal = idf.get(term) ?? 0;
    const numerator = tf * (K1 + 1);
    const denominator = tf + K1 * (1 - B + B * (dl / avgDocLen));
    score += idfVal * (numerator / denominator);
  }
  return score;
}

export function retrieveRelevantChunks(
  rawText: string,
  query: string,
  topK = TOP_K
): string[] {
  const chunks = chunkText(rawText);
  if (chunks.length === 0) return [];
  if (chunks.length <= topK) return chunks;

  const corpus = chunks.map(tokenize);
  const idf = buildIdf(corpus);
  const avgLen = corpus.reduce((s, d) => s + d.length, 0) / corpus.length;
  const queryTerms = tokenize(query);

  const scored = chunks.map((chunk, i) => ({
    chunk,
    score: bm25Score(queryTerms, corpus[i]!, idf, avgLen),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Return top-K, preserving original order for readability
  const topIndices = new Set(
    scored.slice(0, topK).map((s) => chunks.indexOf(s.chunk))
  );
  return chunks.filter((_, i) => topIndices.has(i));
}
