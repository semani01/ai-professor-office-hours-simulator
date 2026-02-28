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

    // 3. Award XP + check achievements (fire-and-forget — doesn't delay response)
    awardXp(userId, jwt, XP_PER_MESSAGE).then(async (xpResult) => {
      try {
        const db = getAuthClient(jwt);

        // Determine if this is the user's first-ever question (check DB, not client history)
        const { count: interactionCount } = await db
          .from('interactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        const isFirstQuestion = interactionCount === 1;

        // Count distinct files uploaded for this course
        const { data: fileRows } = await db
          .from('chunks')
          .select('source_file')
          .eq('course_fk', courseId)
          .eq('user_id', userId);
        const totalFiles = new Set((fileRows || []).map((r) => r.source_file)).size;

        // Count demonstrated topics in the current session
        const { data: sessionInteractions } = await db
          .from('interactions')
          .select('topic_tag, resolved')
          .eq('session_id', sessionId)
          .eq('user_id', userId);
        const demonstratedTopics = new Set(
          (sessionInteractions || []).filter((r) => r.resolved).map((r) => r.topic_tag)
        );
        const demonstratedCount = demonstratedTopics.size;

        checkAchievements(userId, jwt, {
          firstQuestion: isFirstQuestion,
          streak: xpResult?.streak,
          totalFiles,
          demonstratedCount,
        }).catch(() => {});
      } catch (e) {
        console.error('[chat] Achievement context error:', e.message);
      }
    }).catch((err) => console.error('[chat] XP/achievement error:', err.message));

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
