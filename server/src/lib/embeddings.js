let pipeline = null;

/**
 * Lazy-load the embedding pipeline on first call.
 * Model is downloaded (~50MB) once and cached in node_modules/.cache.
 */
async function getEmbedder() {
  if (pipeline) return pipeline;

  // Dynamic import — @xenova/transformers is ESM-only but works via import() in CommonJS
  const { pipeline: createPipeline } = await import('@xenova/transformers');
  pipeline = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return pipeline;
}

/**
 * Embed an array of chunk objects. Appends an `embedding` field (number[]) to each.
 *
 * @param {{ content: string, metadata: object }[]} chunks
 * @returns {Promise<{ content: string, metadata: object, embedding: number[] }[]>}
 */
async function embedChunks(chunks) {
  if (!chunks || chunks.length === 0) return [];

  const embedder = await getEmbedder();

  const embedded = [];
  for (const chunk of chunks) {
    const output = await embedder(chunk.content, { pooling: 'mean', normalize: true });
    // output.data is a Float32Array — convert to plain number[] for JSON/Supabase
    const embedding = Array.from(output.data);
    embedded.push({ ...chunk, embedding });
  }

  return embedded;
}

module.exports = { embedChunks };
