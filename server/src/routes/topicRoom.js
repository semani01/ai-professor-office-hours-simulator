const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { extractJwt, getUserId } = require('../db/supabaseWithAuth');
const { retrieveChunks } = require('../lib/retrieval');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const TIER_TONE = {
  revisit: 'gentle and encouraging, focus on rebuilding foundations step by step',
  inprogress: 'positive and bridging — connect what they already know to what they still need to learn',
  mastered: 'intellectually challenging — push them to think beyond the material and explore advanced implications',
};

/**
 * GET /api/topic-room/:courseId?tag=<topicTag>&tier=revisit|inprogress|mastered
 *
 * Generates Topic Room content from the student's own course materials.
 * Response: { concepts: string[], questions: string[], coachingTips: string[], tier: string }
 */
router.get('/topic-room/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const topicTag = req.query.tag ? decodeURIComponent(req.query.tag) : '';
  const tier = req.query.tier || 'inprogress';

  if (!courseId || !topicTag) {
    return res.status(400).json({ error: 'courseId and topicTag are required' });
  }
  if (!['revisit', 'inprogress', 'mastered'].includes(tier)) {
    return res.status(400).json({ error: 'tier must be revisit, inprogress, or mastered' });
  }

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  try {
    // Retrieve relevant chunks for this topic from the student's materials
    const chunks = await retrieveChunks(topicTag, courseId, userId, jwt, 6);

    if (!chunks || chunks.length === 0) {
      return res.status(404).json({ error: 'No course materials found for this topic. Make sure you have uploaded relevant files.' });
    }

    const contextBlock = chunks.map((c) => {
      const week = c.week_number ? ` — Week ${c.week_number}` : '';
      return `[Source: ${c.source_file}${week}]\n${c.content.slice(0, 700)}`;
    }).join('\n\n---\n\n');

    const toneLine = TIER_TONE[tier] || TIER_TONE.inprogress;

    const systemPrompt = `You are generating a Topic Room for a student studying: "${topicTag}".
Their current mastery level is: ${tier} (revisit = struggling, inprogress = developing, mastered = strong).

Based ONLY on the provided course material chunks, generate:
1. Key Concepts: 3-5 bullet points summarizing the core ideas the student needs to understand
2. Practice Questions: exactly 3 open-ended Socratic questions (no answers — let the student think)
3. Coaching Tips: 2-3 personalized tips for a ${tier} student
4. Flashcards: 5 question/answer pairs that test understanding (not rote recall)

Tone: ${toneLine}

IMPORTANT:
- Draw ONLY from the provided material — do not invent content
- Practice questions should be genuinely thought-provoking, not trivial recall
- Coaching tips should feel personal, not generic
- For mastered students, go deeper — what can they explore beyond the basics?
- Flashcard answers should be concise (1-2 sentences)

Return ONLY valid JSON with no extra text:
{"concepts":["..."],"questions":["..."],"coachingTips":["..."],"flashcards":[{"question":"...","answer":"..."}]}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Generate Topic Room content from these course materials:\n\n${contextBlock}` }],
    });

    const text = response.content[0].text.trim();
    let parsed;
    try {
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[topicRoom] Failed to parse Claude response:', text);
      return res.status(500).json({ error: 'Failed to generate topic content. Please try again.' });
    }

    if (!parsed.concepts || !parsed.questions || !parsed.coachingTips) {
      return res.status(500).json({ error: 'Unexpected response format from AI.' });
    }

    return res.json({
      concepts: parsed.concepts,
      questions: parsed.questions,
      coachingTips: parsed.coachingTips,
      flashcards: parsed.flashcards || [],
      tier,
    });
  } catch (err) {
    console.error('[topicRoom] Error:', err.message);
    return res.status(500).json({ error: 'Failed to generate topic room content. Please try again.' });
  }
});

module.exports = router;
