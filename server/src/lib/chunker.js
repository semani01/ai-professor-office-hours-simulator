const CHUNK_SIZE = 2000;   // ~500 tokens at ~4 chars/token
const CHUNK_OVERLAP = 200; // overlap to preserve context across chunk boundaries

/**
 * Split text into overlapping chunks of ~500 tokens.
 * Tries to break on paragraph boundaries first, falls back to character slicing.
 *
 * @param {string} text - raw extracted text
 * @param {{ courseId: string, sourceFile: string, sourceType: string, weekNumber: number|null }} metadata
 * @returns {{ content: string, metadata: object }[]}
 */
function chunkText(text, metadata) {
  if (!text || !text.trim()) return [];

  // Normalize whitespace: collapse 3+ newlines to 2
  const normalized = text.replace(/\n{3,}/g, '\n\n').trim();

  // Split on double-newline paragraph boundaries
  const paragraphs = normalized.split(/\n\n+/);

  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para;

    if (candidate.length <= CHUNK_SIZE) {
      current = candidate;
    } else {
      // Current chunk is full — save it if non-empty
      if (current.trim()) {
        chunks.push(current.trim());
      }

      // If a single paragraph is larger than chunk size, hard-split it
      if (para.length > CHUNK_SIZE) {
        const subChunks = hardSplit(para);
        // All but the last sub-chunk are saved directly
        for (let i = 0; i < subChunks.length - 1; i++) {
          chunks.push(subChunks[i]);
        }
        // Carry the last sub-chunk as the new current
        current = subChunks[subChunks.length - 1];
      } else {
        // Start fresh with overlap: take the tail of the previous chunk
        const overlap = current ? current.slice(-CHUNK_OVERLAP) : '';
        current = overlap ? overlap + '\n\n' + para : para;
      }
    }
  }

  // Push the last chunk
  if (current.trim()) {
    chunks.push(current.trim());
  }

  // Attach metadata to each chunk
  return chunks.map((content) => ({ content, metadata: { ...metadata } }));
}

/**
 * Hard-split a single oversized string into CHUNK_SIZE pieces with overlap.
 */
function hardSplit(text) {
  const result = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    result.push(text.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
    if (start >= text.length) break;
  }
  return result.filter(Boolean);
}

module.exports = { chunkText };
