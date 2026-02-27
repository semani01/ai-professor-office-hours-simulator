const express = require('express');
const { getAuthClient, extractJwt } = require('../db/supabaseWithAuth');

const router = express.Router();

/**
 * GET /api/topics/:courseId
 * Returns the list of topics extracted from the syllabus for this course.
 * Response: { topics: string[] }
 */
router.get('/topics/:courseId', async (req, res) => {
  const { courseId } = req.params;

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const db = getAuthClient(jwt);
  const { data, error } = await db
    .from('course_topics')
    .select('topic')
    .eq('course_fk', courseId)
    .order('position', { ascending: true });

  if (error) {
    console.error('[topics] fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch topics' });
  }

  return res.json({ topics: (data || []).map((r) => r.topic) });
});

module.exports = router;
