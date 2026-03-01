const express = require('express');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');

const router = express.Router();

// GET /api/side-quests?courseId=
router.get('/', async (req, res) => {
  const { courseId } = req.query;
  if (!courseId) {
    return res.status(400).json({ error: 'courseId is required' });
  }

  try {
    const jwt = extractJwt(req);
    const supabase = getAuthClient(jwt);

    const { data, error } = await supabase
      .from('side_quests')
      .select('*')
      .eq('course_fk', courseId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    return res.json({ sideQuests: data });
  } catch (error) {
    console.error('[quests] error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch side quests' });
  }
});

// POST /api/side-quests
router.post('/', async (req, res) => {
  const { courseId, title } = req.body;

  if (!courseId) {
    return res.status(400).json({ error: 'courseId is required' });
  }
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required and must be non-empty' });
  }

  try {
    const jwt = extractJwt(req);
    const supabase = getAuthClient(jwt);
    const user_id = await getUserId(jwt);

    const { data: maxData, error: maxError } = await supabase
      .from('side_quests')
      .select('position')
      .eq('course_fk', courseId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) throw maxError;

    const nextPosition = (maxData?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from('side_quests')
      .insert({
        user_id,
        course_fk: courseId,
        title: title.trim(),
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ sideQuest: data });
  } catch (error) {
    console.error('[quests] error:', error.message);
    return res.status(500).json({ error: 'Failed to create side quest' });
  }
});

// PATCH /api/side-quests/:id
router.patch('/:id', async (req, res) => {
  const sideQuestId = req.params.id;
  const { completed } = req.body;

  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed must be a boolean' });
  }

  try {
    const jwt = extractJwt(req);
    const supabase = getAuthClient(jwt);

    const { data, error } = await supabase
      .from('side_quests')
      .update({ completed })
      .eq('id', sideQuestId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ sideQuest: data });
  } catch (error) {
    console.error('[quests] error:', error.message);
    return res.status(500).json({ error: 'Failed to update side quest' });
  }
});

// DELETE /api/side-quests/:id
router.delete('/:id', async (req, res) => {
  const sideQuestId = req.params.id;

  try {
    const jwt = extractJwt(req);
    const supabase = getAuthClient(jwt);

    const { error } = await supabase
      .from('side_quests')
      .delete()
      .eq('id', sideQuestId);

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    console.error('[quests] error:', error.message);
    return res.status(500).json({ error: 'Failed to delete side quest' });
  }
});

module.exports = router;
