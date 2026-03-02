const express = require('express');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');

const router = express.Router();

// GET /api/quests?courseId=
router.get('/', async (req, res) => {
  const { courseId } = req.query;
  if (!courseId) {
    return res.status(400).json({ error: 'courseId is required' });
  }

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const supabase = getAuthClient(jwt);

    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('course_fk', courseId)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ quests: data });
  } catch (error) {
    console.error('[quests] error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

// POST /api/quests
router.post('/', async (req, res) => {
  const { courseId, quests } = req.body;

  if (!courseId) {
    return res.status(400).json({ error: 'courseId is required' });
  }
  if (!quests || !Array.isArray(quests) || quests.length === 0) {
    return res.status(400).json({ error: 'quests array is required and must be non-empty' });
  }

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const supabase = getAuthClient(jwt);
    const user_id = await getUserId(jwt);
    if (!user_id) return res.status(401).json({ error: 'Could not identify user' });

    const insertArray = quests.map((q) => ({
      user_id,
      course_fk: courseId,
      title: q.title,
      description: q.description || null,
      quest_type: q.questType || 'review',
      target_data: q.targetData || {},
      status: 'pending',
    }));

    const { data, error } = await supabase
      .from('quests')
      .insert(insertArray)
      .select();

    if (error) throw error;

    return res.status(201).json({ quests: data });
  } catch (error) {
    console.error('[quests] error:', error.message);
    return res.status(500).json({ error: 'Failed to create quests' });
  }
});

// PATCH /api/quests/:id
router.patch('/:id', async (req, res) => {
  const questId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const supabase = getAuthClient(jwt);

    const updateObj = { status };
    if (status === 'completed') {
      updateObj.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('quests')
      .update(updateObj)
      .eq('id', questId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ quest: data });
  } catch (error) {
    console.error('[quests] error:', error.message);
    return res.status(500).json({ error: 'Failed to update quest' });
  }
});

// DELETE /api/quests/:id
router.delete('/:id', async (req, res) => {
  const questId = req.params.id;

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const supabase = getAuthClient(jwt);

    const { error } = await supabase
      .from('quests')
      .delete()
      .eq('id', questId);

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    console.error('[quests] error:', error.message);
    return res.status(500).json({ error: 'Failed to delete quest' });
  }
});

module.exports = router;
