const express = require('express');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');

const router = express.Router();

/**
 * GET /api/courses
 * Returns all courses for the authenticated user.
 * Response: { courses: [{ id, name, created_at }] }
 */
router.get('/courses', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const db = getAuthClient(jwt);
  const { data, error } = await db
    .from('courses')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[courses] fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch courses' });
  }

  return res.json({ courses: data || [] });
});

/**
 * POST /api/courses
 * Creates a new course for the authenticated user.
 * Body: { name }
 * Response: { course: { id, name, created_at } }
 */
router.post('/courses', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Course name is required' });
  }

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);
  const { data, error } = await db
    .from('courses')
    .insert({ name: name.trim(), user_id: userId })
    .select('id, name, created_at')
    .single();

  if (error) {
    console.error('[courses] create error:', error.message);
    return res.status(500).json({ error: 'Failed to create course' });
  }

  console.log(`[courses] created "${data.name}" for user ${userId}`);
  return res.status(201).json({ course: data });
});

/**
 * PATCH /api/courses/:courseId
 * Renames a course.
 * Body: { name }
 * Response: { course: { id, name, created_at } }
 */
router.patch('/courses/:courseId', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const { courseId } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Course name is required' });
  }

  const db = getAuthClient(jwt);
  const { data, error } = await db
    .from('courses')
    .update({ name: name.trim() })
    .eq('id', courseId)
    .select('id, name, created_at')
    .single();

  if (error) {
    console.error('[courses] rename error:', error.message);
    return res.status(500).json({ error: 'Failed to rename course' });
  }

  return res.json({ course: data });
});

/**
 * DELETE /api/courses/:courseId
 * Deletes a course (cascades to all chunks, interactions, topics via FK).
 */
router.delete('/courses/:courseId', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const { courseId } = req.params;
  const db = getAuthClient(jwt);

  const { error } = await db.from('courses').delete().eq('id', courseId);
  if (error) {
    console.error('[courses] delete error:', error.message);
    return res.status(500).json({ error: 'Failed to delete course' });
  }

  return res.json({ success: true });
});

module.exports = router;
