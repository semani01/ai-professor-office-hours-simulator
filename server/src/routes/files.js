const express = require('express');
const { getAuthClient, extractJwt } = require('../db/supabaseWithAuth');

const router = express.Router();

/**
 * GET /api/files/:courseId/chunks?sourceFile=<encoded>
 * Returns all stored chunks for a specific file in a course.
 * Used by the file viewer modal.
 * Response: { chunks: [{ id, content, week_number }] }
 */
router.get('/files/:courseId/chunks', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const { courseId } = req.params;
  const { sourceFile } = req.query;

  if (!sourceFile) {
    return res.status(400).json({ error: 'sourceFile query parameter is required' });
  }

  const db = getAuthClient(jwt);
  const { data, error } = await db
    .from('chunks')
    .select('id, content, week_number, source_type')
    .eq('course_fk', courseId)
    .eq('source_file', sourceFile)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[files] chunks fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch file chunks' });
  }

  return res.json({ chunks: data || [] });
});

module.exports = router;
