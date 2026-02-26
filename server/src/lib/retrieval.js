const { embedChunks } = require('./embeddings');
const supabase = require('../db/supabase');

/**
 * Embed a question and retrieve the top K most relevant chunks from Supabase.
 *
 * @param {string} question - the student's current message
 * @param {string} courseId - course to scope the search to
 * @param {number} topK - number of chunks to return (default 5)
 * @returns {Promise<{ id, content, source_file, source_type, week_number, similarity }[]>}
 */
async function retrieveChunks(question, courseId, topK = 5) {
  // Embed the question using the same model as the stored chunks
  const [embedded] = await embedChunks([{ content: question, metadata: {} }]);
  const queryEmbedding = embedded.embedding;

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_course_id: courseId,
    match_count: topK,
  });

  if (error) throw new Error(`Retrieval failed: ${error.message}`);

  return data || [];
}

module.exports = { retrieveChunks };
