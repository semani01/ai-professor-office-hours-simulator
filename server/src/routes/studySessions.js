const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// ---------------------------------------------------------------------------
// Helper: build a human-readable topic summary from raw interaction rows
// ---------------------------------------------------------------------------
function buildTopicSummary(interactions) {
  const map = {};
  for (const row of interactions) {
    const tag = row.topic_tag || 'General';
    if (!map[tag]) {
      map[tag] = { exchanges: 0, maxHints: 0, anyResolved: false };
    }
    map[tag].exchanges += 1;
    if (row.hints_needed > map[tag].maxHints) map[tag].maxHints = row.hints_needed;
    if (row.resolved) map[tag].anyResolved = true;
  }
  return Object.entries(map)
    .map(([tag, s]) => `${tag}: ${s.exchanges} exchanges, ${s.maxHints} hints, resolved: ${s.anyResolved}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Helper: strip markdown code fences and parse JSON from a Claude response
// ---------------------------------------------------------------------------
function parseClaudeJson(text) {
  let cleaned = text.trim();
  // Remove ```json ... ``` or ``` ... ``` wrappers
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// POST /api/study-sessions
// Body: { courseId, intent, selectedTopics, timeGoalMinutes }
// ---------------------------------------------------------------------------
router.post('/study-sessions', async (req, res) => {
  const { courseId, intent, selectedTopics, timeGoalMinutes } = req.body;

  if (!courseId) return res.status(400).json({ error: 'courseId is required.' });
  if (!intent || !intent.trim()) return res.status(400).json({ error: 'intent is required.' });

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);

  try {
    // 1. Create the study_sessions row (plan will be filled in after Claude call)
    const { data: sessionRow, error: insertError } = await db
      .from('study_sessions')
      .insert({
        user_id: userId,
        course_fk: courseId,
        intent,
        selected_topics: selectedTopics || [],
        time_goal_minutes: timeGoalMinutes || null,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[studySessions] insert error:', insertError.message);
      return res.status(500).json({ error: 'Failed to create study session.' });
    }

    // 2. Fetch course-wide interaction history to summarise mastery
    const { data: interactions, error: interactionsError } = await db
      .from('interactions')
      .select('topic_tag, hints_needed, resolved')
      .eq('user_id', userId)
      .eq('course_fk', courseId);

    if (interactionsError) {
      console.error('[studySessions] interactions fetch error:', interactionsError.message);
      // Non-fatal — carry on with empty summary
    }

    const topicSummary = buildTopicSummary(interactions || []);

    // 3. Fetch course topics for ordering context
    const { data: courseTopicsRows, error: topicsError } = await db
      .from('course_topics')
      .select('topic')
      .eq('course_fk', courseId)
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (topicsError) {
      console.error('[studySessions] course_topics fetch error:', topicsError.message);
    }

    // 4. Call Claude to generate a personalised study plan
    const prompt = `You are an expert academic coach. Given a student's intent, selected topics, time goal, and current knowledge state, generate a personalized study plan.

Intent: ${intent}
Selected topics: ${(selectedTopics && selectedTopics.length) ? selectedTopics.join(', ') : 'All course topics'}
Time available: ${timeGoalMinutes ? timeGoalMinutes + ' minutes' : 'No time limit'}
Course topics with current mastery: ${topicSummary || 'No prior interactions recorded.'}

Return ONLY valid JSON (no markdown):
{
  "planTitle": "short title",
  "steps": [{ "order": 1, "action": "...", "reason": "...", "estimatedMinutes": 10 }],
  "totalEstimatedMinutes": 25,
  "encouragement": "1-2 sentence motivational message"
}`;

    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    let studyPlan = null;
    try {
      studyPlan = parseClaudeJson(aiResponse.content[0].text);
    } catch (parseErr) {
      console.error('[studySessions] plan JSON parse error:', parseErr.message);
      // Continue — we'll store null and still return the session
    }

    // 5. Update the session row with the generated plan
    const { data: updatedSession, error: updateError } = await db
      .from('study_sessions')
      .update({ study_plan: studyPlan })
      .eq('id', sessionRow.id)
      .select()
      .single();

    if (updateError) {
      console.error('[studySessions] plan update error:', updateError.message);
      // Non-fatal — return original session row
    }

    const finalSession = updatedSession || sessionRow;

    return res.json({
      session: {
        id: finalSession.id,
        intent: finalSession.intent,
        selected_topics: finalSession.selected_topics,
        time_goal_minutes: finalSession.time_goal_minutes,
        study_plan: finalSession.study_plan,
        started_at: finalSession.created_at,
      },
      studyPlan,
    });
  } catch (error) {
    console.error('[studySessions] create error:', error.message);
    return res.status(500).json({ error: 'Failed to create study session.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/study-sessions/active
// ---------------------------------------------------------------------------
router.get('/study-sessions/active', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);

  try {
    const { data: session, error } = await db
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[studySessions] active fetch error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch active session.' });
    }

    if (!session) {
      return res.json({ session: null });
    }

    // Auto-abandon sessions older than 24 hours
    const startedAt = new Date(session.created_at);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (startedAt < twentyFourHoursAgo) {
      const { error: abandonError } = await db
        .from('study_sessions')
        .update({ status: 'abandoned' })
        .eq('id', session.id);

      if (abandonError) {
        console.error('[studySessions] abandon error:', abandonError.message);
      }

      return res.json({ session: null });
    }

    return res.json({ session });
  } catch (error) {
    console.error('[studySessions] active error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch active session.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/study-sessions/latest-summary?courseId=...
// ---------------------------------------------------------------------------
router.get('/study-sessions/latest-summary', async (req, res) => {
  const { courseId } = req.query;
  if (!courseId) return res.status(400).json({ error: 'courseId query param is required.' });

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);

  try {
    const { data: summary, error } = await db
      .from('session_summaries')
      .select('*, study_sessions(intent, selected_topics, started_at, ended_at)')
      .eq('user_id', userId)
      .eq('course_fk', courseId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[studySessions] latest-summary fetch error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch latest summary.' });
    }

    return res.json({ summary: summary || null });
  } catch (error) {
    console.error('[studySessions] latest-summary error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch latest summary.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/study-sessions/:id/end
// Body: { quizResults: [{ score, total }], portfolioSnapshot: [{ tag, tier }] }
// ---------------------------------------------------------------------------
router.post('/study-sessions/:id/end', async (req, res) => {
  const sessionId = req.params.id;
  const { quizResults = [], portfolioSnapshot = [] } = req.body;

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);

  try {
    // 1. Fetch and verify session ownership
    const { data: session, error: sessionError } = await db
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      console.error('[studySessions] session fetch error:', sessionError?.message);
      return res.status(404).json({ error: 'Study session not found.' });
    }

    const courseId = session.course_fk;

    // 2. Fetch interactions tagged with this study session
    const { data: sessionInteractions, error: interactionsError } = await db
      .from('interactions')
      .select('topic_tag, hints_needed, resolved, question')
      .eq('study_session_id', sessionId)
      .eq('user_id', userId);

    if (interactionsError) {
      console.error('[studySessions] session interactions fetch error:', interactionsError.message);
    }

    const interactions = sessionInteractions || [];

    // 3. Fetch all course topics to identify untouched ones
    const { data: courseTopicsRows, error: topicsError } = await db
      .from('course_topics')
      .select('topic')
      .eq('course_fk', courseId)
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (topicsError) {
      console.error('[studySessions] course_topics fetch error:', topicsError.message);
    }

    const allCourseTopics = (courseTopicsRows || []).map((r) => r.topic);

    // 4. Build per-topic breakdown for topics touched this session
    const topicMap = {};
    for (const row of interactions) {
      const tag = row.topic_tag || 'General';
      if (!topicMap[tag]) {
        topicMap[tag] = { exchanges: 0, maxHints: 0, anyResolved: false };
      }
      topicMap[tag].exchanges += 1;
      if (row.hints_needed > topicMap[tag].maxHints) topicMap[tag].maxHints = row.hints_needed;
      if (row.resolved) topicMap[tag].anyResolved = true;
    }

    const touchedTopics = Object.keys(topicMap);
    const untouchedTopics = allCourseTopics.filter((t) => !touchedTopics.includes(t));

    const topicBreakdown = touchedTopics.length
      ? touchedTopics
          .map((tag) => {
            const s = topicMap[tag];
            return `${tag}: ${s.exchanges} exchanges, ${s.maxHints} hints needed, resolved: ${s.anyResolved}`;
          })
          .join('\n')
      : 'No topic interactions recorded this session.';

    // 5. Compute duration
    const startedAt = new Date(session.created_at);
    const endedAt = new Date();
    const durationMinutes = Math.round((endedAt - startedAt) / 60000);

    // 6. Call Claude to generate the session summary
    const prompt = `You are analyzing a student's study session to generate an insightful learning summary.

Session intent: ${session.intent}
Selected topics: ${session.selected_topics?.join(', ') || 'General'}
Session duration: approximately ${durationMinutes} minutes

Topics covered in this session (from interactions):
${topicBreakdown}

Course topics NOT touched this session: ${untouchedTopics.join(', ') || 'None'}

Quiz results: ${quizResults.length ? quizResults.map((q) => `${q.score}/${q.total}`).join(', ') : 'No quiz taken'}

Current knowledge portfolio tiers: ${portfolioSnapshot.map((t) => `${t.tag}: ${t.tier}`).join(', ') || 'Unknown'}

Return ONLY valid JSON (no markdown):
{
  "demonstrated": ["topic names clearly demonstrated"],
  "notTested": ["topics not tested in this session"],
  "prioritize": ["1-3 specific things to focus on next, with brief reason"],
  "blindspots": ["1-2 gaps or areas the student may not realize they're missing"],
  "recommendedActions": [
    { "title": "action title (max 8 words)", "type": "topic_room|quiz|chat", "targetData": { "topicTag": "..." } }
  ],
  "sessionStats": { "topicsCovered": 0, "questionsAsked": 0, "hintsNeeded": 0, "resolved": 0 },
  "overallAssessment": "2-3 sentence honest assessment"
}

Limit recommendedActions to 4 max. For quiz type, targetData can be empty object.`;

    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    let summaryJson = null;
    try {
      summaryJson = parseClaudeJson(aiResponse.content[0].text);
    } catch (parseErr) {
      console.error('[studySessions] summary JSON parse error:', parseErr.message);
      return res.status(500).json({ error: 'Failed to parse AI session summary.' });
    }

    // 7. Insert into session_summaries
    const { data: summaryRow, error: summaryInsertError } = await db
      .from('session_summaries')
      .insert({
        user_id: userId,
        study_session_id: sessionId,
        course_fk: courseId,
        summary_json: summaryJson,
        recommended_actions: summaryJson.recommendedActions || [],
      })
      .select()
      .single();

    if (summaryInsertError) {
      console.error('[studySessions] summary insert error:', summaryInsertError.message);
      return res.status(500).json({ error: 'Failed to save session summary.' });
    }

    // 8. Mark session as completed
    const { error: completeError } = await db
      .from('study_sessions')
      .update({ status: 'completed', ended_at: endedAt.toISOString() })
      .eq('id', sessionId);

    if (completeError) {
      console.error('[studySessions] complete update error:', completeError.message);
      // Non-fatal — summary was already saved
    }

    return res.json({
      summary: {
        id: summaryRow.id,
        summary_json: summaryRow.summary_json,
        recommended_actions: summaryRow.recommended_actions,
        created_at: summaryRow.created_at,
      },
    });
  } catch (error) {
    console.error('[studySessions] end error:', error.message);
    return res.status(500).json({ error: 'Failed to end study session.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/study-sessions/summaries/:id/dismiss
// ---------------------------------------------------------------------------
router.post('/study-sessions/summaries/:id/dismiss', async (req, res) => {
  const summaryId = req.params.id;

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);

  try {
    const { error } = await db
      .from('session_summaries')
      .update({ dismissed: true })
      .eq('id', summaryId)
      .eq('user_id', userId);

    if (error) {
      console.error('[studySessions] dismiss error:', error.message);
      return res.status(500).json({ error: 'Failed to dismiss summary.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[studySessions] dismiss error:', error.message);
    return res.status(500).json({ error: 'Failed to dismiss summary.' });
  }
});

module.exports = router;
