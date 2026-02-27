const express = require('express');
const { retrieveChunks } = require('../lib/retrieval');
const { generateResponse } = require('../lib/claude');
const { extractJwt, getUserId } = require('../db/supabaseWithAuth');

const router = express.Router();

/**
 * POST /api/chat
 *
 * Body: { message, history, sessionId, courseId }
 * Response: { response, sources[] }
 */
router.post('/chat', async (req, res) => {
  const { message, history, sessionId, courseId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required.' });
  }
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const course = courseId || 'default';
  try {
    // 1. Retrieve relevant chunks (scoped to user)
    const chunks = await retrieveChunks(message, course, userId, jwt);

    // 2. Generate Socratic response
    const { response, sources } = await generateResponse(message, history || [], chunks, sessionId, userId, jwt);

    return res.json({ response, sources });
  } catch (err) {
    console.error('Chat error:', err.message);

    if (err.message.includes('Retrieval failed')) {
      return res.status(500).json({ error: 'Could not search your course materials. Please try again.' });
    }
    if (err.message.includes('anthropic') || err.message.includes('claude')) {
      return res.status(500).json({ error: 'AI service error. Please try again in a moment.' });
    }

    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
