const express = require('express');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');

const router = express.Router();

/**
 * GET /api/conversations?courseId=<id>
 * List all conversations for a course, newest first.
 * Response: { conversations: [{ id, title, created_at, updated_at }] }
 */
router.get('/conversations', async (req, res) => {
  const { courseId } = req.query;
  if (!courseId) return res.status(400).json({ error: 'courseId is required' });

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);
  const query = db
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .eq('course_fk', courseId)
    .order('updated_at', { ascending: false });

  // By default hide internal conversations (topic, session, etc.); pass includeHidden=true to see all
  if (req.query.includeHidden !== 'true') {
    query.not('title', 'like', '__%');  // hides all internal conversations starting with __
  }

  const { data, error } = await query;

  if (error) {
    console.error('[conversations] list error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }

  return res.json({ conversations: data || [] });
});

/**
 * POST /api/conversations
 * Create a new conversation.
 * Body: { courseId, title? }
 * Response: { conversation: { id, title, created_at, updated_at } }
 */
router.post('/conversations', async (req, res) => {
  const { courseId, title } = req.body;
  if (!courseId) return res.status(400).json({ error: 'courseId is required' });

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);
  const { data, error } = await db
    .from('conversations')
    .insert({ user_id: userId, course_fk: courseId, title: title || 'New Conversation' })
    .select('id, title, created_at, updated_at')
    .single();

  if (error) {
    console.error('[conversations] create error:', error.message);
    return res.status(500).json({ error: 'Failed to create conversation' });
  }

  return res.status(201).json({ conversation: data });
});

/**
 * PATCH /api/conversations/:id
 * Rename a conversation.
 * Body: { title }
 * Response: { conversation: { id, title, created_at, updated_at } }
 */
router.patch('/conversations/:id', async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);
  const { data, error } = await db
    .from('conversations')
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, title, created_at, updated_at')
    .single();

  if (error) {
    console.error('[conversations] rename error:', error.message);
    return res.status(500).json({ error: 'Failed to rename conversation' });
  }

  return res.json({ conversation: data });
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation and all its messages (cascade).
 * Response: { success: true }
 */
router.delete('/conversations/:id', async (req, res) => {
  const { id } = req.params;

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);
  const { error } = await db
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[conversations] delete error:', error.message);
    return res.status(500).json({ error: 'Failed to delete conversation' });
  }

  return res.json({ success: true });
});

/**
 * GET /api/conversations/:id/messages
 * Fetch all messages for a conversation.
 * Response: { messages: [{ id, role, content, sources, created_at }] }
 */
router.get('/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);

  // Verify ownership via conversations table (RLS also enforces this)
  const { data: conv, error: convError } = await db
    .from('conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (convError || !conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const { data, error } = await db
    .from('conversation_messages')
    .select('id, role, content, sources, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[conversations] messages fetch error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }

  return res.json({ messages: data || [] });
});

/**
 * POST /api/conversations/:id/messages
 * Append a message to a conversation.
 * Body: { role, content, sources? }
 * Response: { message: { id, role, content, sources, created_at } }
 *
 * Auto-titles the conversation from the first user message.
 */
router.post('/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { role, content, sources } = req.body;

  if (!role || !content) return res.status(400).json({ error: 'role and content are required' });
  if (!['user', 'assistant'].includes(role)) return res.status(400).json({ error: 'role must be user or assistant' });

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);

  // Verify ownership
  const { data: conv, error: convError } = await db
    .from('conversations')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (convError || !conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  // Insert the message
  const { data: msg, error } = await db
    .from('conversation_messages')
    .insert({ conversation_id: id, role, content, sources: sources || null })
    .select('id, role, content, sources, created_at')
    .single();

  if (error) {
    console.error('[conversations] message insert error:', error.message);
    return res.status(500).json({ error: 'Failed to save message' });
  }

  // Update conversation updated_at timestamp
  const updatePayload = { updated_at: new Date().toISOString() };

  // Auto-title from first user message if still default
  if (role === 'user' && conv.title === 'New Conversation') {
    const title = content.length > 50 ? content.slice(0, 50) + '…' : content;
    updatePayload.title = title;
  }

  await db
    .from('conversations')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', userId);

  return res.status(201).json({ message: msg });
});

module.exports = router;
