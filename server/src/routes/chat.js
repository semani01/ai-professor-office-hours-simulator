const express = require('express');
const { retrieveChunks } = require('../lib/retrieval');
const { generateResponse } = require('../lib/claude');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');
const { awardXp, XP_PER_MESSAGE } = require('./xp');
const { checkAchievements } = require('./achievements');

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
  if (!courseId) {
    return res.status(400).json({ error: 'courseId is required.' });
  }

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  try {
    // 1. Retrieve relevant chunks (scoped to user)
    const chunks = await retrieveChunks(message, courseId, userId, jwt);

    // 2. Generate Socratic response
    const { response, sources } = await generateResponse(message, history || [], chunks, sessionId, userId, jwt, courseId);

    // 3. Award XP (fire-and-forget) + check achievements (awaited so we can return newBadges)
    awardXp(userId, jwt, XP_PER_MESSAGE).catch((err) =>
      console.error('[chat] XP award error:', err.message)
    );

    let newBadges = [];
    try {
      const db = getAuthClient(jwt);

      const { count: interactionCount } = await db
        .from('interactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      const isFirstQuestion = interactionCount === 1;

      const { data: fileRows } = await db
        .from('chunks')
        .select('source_file')
        .eq('course_fk', courseId)
        .eq('user_id', userId);
      const totalFiles = new Set((fileRows || []).map((r) => r.source_file)).size;

      const { data: sessionInteractions } = await db
        .from('interactions')
        .select('topic_tag, resolved')
        .eq('session_id', sessionId)
        .eq('user_id', userId);
      const demonstratedCount = new Set(
        (sessionInteractions || []).filter((r) => r.resolved).map((r) => r.topic_tag)
      ).size;

      newBadges = await checkAchievements(userId, jwt, {
        firstQuestion: isFirstQuestion,
        totalFiles,
        demonstratedCount,
      });
    } catch (e) {
      console.error('[chat] Achievement check error:', e.message);
    }

    return res.json({ response, sources, newBadges });
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
