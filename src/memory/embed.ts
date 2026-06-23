/**
 * Embedding seam.
 *
 * The ONE place embeddings are produced. The production harness scattered this across
 * adapters via a cloud SDK; here it is a single provider-agnostic seam.
 * Point it at a local embedder (nomic-embed-text / bge / MiniLM via Ollama).
 */

// The ONE place embeddings are produced. The production harness scattered this across
// adapters via a cloud SDK; here it is a single provider-agnostic seam.
// Point it at a local embedder (nomic-embed-text / bge / MiniLM via Ollama).
export async function generateEmbedding(text: string): Promise<number[]> {
  // ponytail: skeleton seam — wire to your local embedder. Not executed in the demo.
  throw new Error('generateEmbedding: configure a local embedder (EMBEDDING_MODEL). See docs/08-memory-lifecycle.md');
}
// L2-normalize so cosine stays correct once wired.
export function l2normalize(v: number[]): number[] { const n = Math.hypot(...v) || 1; return v.map(x => x / n); }
