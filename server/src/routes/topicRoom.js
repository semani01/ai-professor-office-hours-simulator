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

/** Shared helper: retrieve chunks + build context block */
async function getContextBlock(topicTag, courseId, userId, jwt) {
  const chunks = await retrieveChunks(topicTag, courseId, userId, jwt, 6);
  if (!chunks || chunks.length === 0) return null;
  return chunks.map((c) => {
    const week = c.week_number ? ` — Week ${c.week_number}` : '';
    return `[Source: ${c.source_file}${week}]\n${c.content.slice(0, 700)}`;
  }).join('\n\n---\n\n');
}

/**
 * GET /api/topic-room/:courseId?tag=<topicTag>&tier=revisit|inprogress|mastered
 *
 * Generates full Topic Room content (overview, mindmap structure).
 * Flashcards are generated separately via /flashcards endpoint.
 * Response: { concepts, questions, coachingTips, mindMap, tier }
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
    const contextBlock = await getContextBlock(topicTag, courseId, userId, jwt);
    if (!contextBlock) {
      return res.status(404).json({ error: 'No course materials found for this topic. Make sure you have uploaded relevant files.' });
    }

    const toneLine = TIER_TONE[tier] || TIER_TONE.inprogress;

    const systemPrompt = `You are generating a Topic Room for a student studying: "${topicTag}".
Their current mastery level is: ${tier} (revisit = struggling, inprogress = developing, mastered = strong).

Based ONLY on the provided course material chunks, generate:
1. Key Concepts: 3-5 bullet points summarizing the core ideas the student needs to understand
2. Practice Questions: exactly 3 open-ended Socratic questions (no answers — let the student think)
3. Coaching Tips: 2-3 personalized tips for a ${tier} student
4. Mind Map: a 2-level hierarchical breakdown — 3-5 top-level branches, each with 0-3 sub-branches.
   Labels MUST be short keywords or phrases — maximum 4 words each. Do NOT copy full sentences.
   Extract the core concept keyword, e.g. "Stakeholder Analysis" not "Stakeholder analysis synthesizes emotional dimensions"

Tone: ${toneLine}

IMPORTANT:
- Draw ONLY from the provided material — do not invent content
- Practice questions should be genuinely thought-provoking, not trivial recall
- Coaching tips should feel personal, not generic
- Mind map labels: short keywords only (max 4 words), no full sentences

Return ONLY valid JSON with no extra text:
{
  "concepts": ["..."],
  "questions": ["..."],
  "coachingTips": ["..."],
  "mindMap": [
    {"label": "Branch Name", "children": [{"label": "Sub Topic"}, {"label": "Sub Topic"}]},
    {"label": "Branch Name", "children": []}
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
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
      mindMap: parsed.mindMap || [],
      tier,
    });
  } catch (err) {
    console.error('[topicRoom] Error:', err.message);
    return res.status(500).json({ error: 'Failed to generate topic room content. Please try again.' });
  }
});

/**
 * GET /api/topic-room/:courseId/flashcards?tag=<topicTag>&tier=<tier>&count=<n>
 *
 * Generates flashcards on-demand (separate from the main overview fetch).
 * Response: { flashcards: [{ question, answer }] }
 */
router.get('/topic-room/:courseId/flashcards', async (req, res) => {
  const { courseId } = req.params;
  const topicTag = req.query.tag ? decodeURIComponent(req.query.tag) : '';
  const tier = req.query.tier || 'inprogress';
  const count = Math.min(20, Math.max(5, parseInt(req.query.count, 10) || 15));

  if (!courseId || !topicTag) {
    return res.status(400).json({ error: 'courseId and topicTag are required' });
  }

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  try {
    const contextBlock = await getContextBlock(topicTag, courseId, userId, jwt);
    if (!contextBlock) {
      return res.status(404).json({ error: 'No course materials found for this topic.' });
    }

    const tierNote = tier === 'revisit'
      ? 'Focus on foundational definitions and core concepts.'
      : tier === 'mastered'
      ? 'Include deeper application, analysis, and synthesis questions.'
      : 'Mix of recall and application questions.';

    const systemPrompt = `You are generating flashcards for a student studying: "${topicTag}".
Mastery level: ${tier}. ${tierNote}

Generate exactly ${count} flashcard question/answer pairs from the provided course materials.

Rules:
- Questions test UNDERSTANDING, not word-for-word recall
- Answers are concise (1-3 sentences)
- Draw ONLY from the provided material
- Vary difficulty: some foundational, some applied, some analytical
- Each card should test a distinct concept

Return ONLY valid JSON, no extra text:
{"flashcards":[{"question":"...","answer":"..."}]}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Generate ${count} flashcards from these course materials:\n\n${contextBlock}` }],
    });

    const text = response.content[0].text.trim();
    let parsed;
    try {
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[topicRoom/flashcards] Failed to parse:', text);
      return res.status(500).json({ error: 'Failed to generate flashcards. Please try again.' });
    }

    if (!Array.isArray(parsed.flashcards)) {
      return res.status(500).json({ error: 'Unexpected response format.' });
    }

    return res.json({ flashcards: parsed.flashcards });
  } catch (err) {
    console.error('[topicRoom/flashcards] Error:', err.message);
    return res.status(500).json({ error: 'Failed to generate flashcards. Please try again.' });
  }
});

module.exports = router;
