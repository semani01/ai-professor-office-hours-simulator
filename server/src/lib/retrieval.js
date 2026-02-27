const { embedChunks } = require('./embeddings');
const { getAuthClient } = require('../db/supabaseWithAuth');

/**
 * Embed a question and retrieve the top K most relevant chunks from Supabase.
 * Scoped to the given user via the JWT (RLS) and userId filter in the RPC.
 *
 * @param {string} question - the student's current message
 * @param {string} courseId - course to scope the search to
 * @param {string} userId - user UUID for data isolation
 * @param {string} jwt - Supabase access token
 * @param {number} topK - number of chunks to return (default 5)
 * @returns {Promise<{ id, content, source_file, source_type, week_number, similarity }[]>}
 */
async function retrieveChunks(question, courseId, userId, jwt, topK = 5) {
  // Embed the question using the same model as the stored chunks
  const [embedded] = await embedChunks([{ content: question, metadata: {} }]);
  const queryEmbedding = embedded.embedding;

  // Serialize as pgvector string format — Supabase JS client requires this for vector RPC params
  const embeddingString = `[${queryEmbedding.join(',')}]`;

  const db = getAuthClient(jwt);
  const { data, error } = await db.rpc('match_chunks_text', {
    query_embedding_text: embeddingString,
    match_course_id: courseId,
    match_count: topK,
    match_user_id: userId,
  });

  if (error) {
    console.error('[retrieval] RPC error:', JSON.stringify(error));
    throw new Error(`Retrieval failed: ${error.message}`);
  }

  console.log(`[retrieval] got ${data?.length ?? 0} chunks`, data?.length ? `(top similarity: ${data[0].similarity?.toFixed(3)})` : '');
  return data || [];
}

module.exports = { retrieveChunks };
