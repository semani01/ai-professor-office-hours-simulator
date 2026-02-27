const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');
const { awardXp, XP_PER_CORRECT_QUIZ } = require('./xp');
const { checkAchievements } = require('./achievements');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const QUIZ_PROMPT = `You are generating a quiz from a student's course materials.
Given the following chunks from their lectures and notes, create exactly 4 multiple-choice questions.

Rules:
- Questions MUST test UNDERSTANDING and application — not word-for-word memorization
- Each question has exactly 4 options labeled A, B, C, D
- Exactly one correct answer per question
- Include a brief explanation (1-2 sentences) for why the answer is correct, referencing the relevant material
- Draw directly from the provided material; do not invent content not present in the chunks
- Vary difficulty: 1 easy recall question, 2 comprehension questions, 1 application/analysis question
- Do NOT start questions with "According to the text" — make them feel like real exam questions

Return ONLY valid JSON with no extra text, in this exact format:
[
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct": "B",
    "explanation": "...",
    "sourceHint": "Week N - Lecture Title"
  }
]`;

/**
 * Pick diverse chunks for quiz generation — spread across different weeks/sourceTypes.
 * Fetches from Supabase directly (not via embeddings — we want variety, not relevance).
 */
async function getDiverseChunks(courseId, userId, jwt, count = 12) {
  const db = getAuthClient(jwt);
  const { data, error } = await db
    .from('chunks')
    .select('id, content, source_file, source_type, week_number')
    .eq('course_fk', courseId)
    .eq('user_id', userId)
    .not('content', 'is', null)
    .limit(200); // Get a large pool

  if (error || !data || data.length === 0) return [];

  // Filter out very short chunks (< 100 chars) — likely headers/footers
  const usable = data.filter((c) => c.content.length > 100);
  if (usable.length === 0) return [];

  // Group by week to ensure diversity
  const byWeek = {};
  usable.forEach((c) => {
    const key = c.week_number ?? 'unweek';
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(c);
  });

  // Pick up to 2 chunks per week, then pad from any week if needed
  const selected = [];
  const weeks = Object.keys(byWeek);

  // Shuffle weeks
  weeks.sort(() => Math.random() - 0.5);

  for (const week of weeks) {
    const pool = byWeek[week];
    pool.sort(() => Math.random() - 0.5);
    selected.push(...pool.slice(0, 2));
    if (selected.length >= count) break;
  }

  // If still short, top up from all usable
  if (selected.length < count) {
    const remaining = usable.filter((c) => !selected.includes(c));
    remaining.sort(() => Math.random() - 0.5);
    selected.push(...remaining.slice(0, count - selected.length));
  }

  return selected.slice(0, count);
}

/**
 * POST /api/quiz/generate
 * Body: { courseId }
 * Response: { questions: [{question, options, correct, explanation, sourceHint}] }
 */
router.post('/quiz/generate', async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) return res.status(400).json({ error: 'courseId is required' });

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  try {
    const chunks = await getDiverseChunks(courseId, userId, jwt, 12);
    if (chunks.length < 3) {
      return res.status(400).json({ error: 'Not enough course materials to generate a quiz. Upload more files first.' });
    }

    // Format chunks for the prompt
    const contextBlock = chunks.map((c) => {
      const week = c.week_number ? ` — Week ${c.week_number}` : '';
      return `[Source: ${c.source_file}${week}]\n${c.content.slice(0, 600)}`;
    }).join('\n\n---\n\n');

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: QUIZ_PROMPT,
      messages: [{ role: 'user', content: `Generate 4 quiz questions from these course materials:\n\n${contextBlock}` }],
    });

    const text = response.content[0].text.trim();

    // Parse JSON — strip any markdown code fences if present
    let questions;
    try {
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      questions = JSON.parse(cleaned);
    } catch {
      console.error('[quiz] Failed to parse Claude response:', text);
      return res.status(500).json({ error: 'Failed to generate quiz questions. Please try again.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ error: 'Quiz generation returned unexpected format.' });
    }

    return res.json({ questions });
  } catch (err) {
    console.error('[quiz] Generate error:', err.message);
    return res.status(500).json({ error: 'Failed to generate quiz. Please try again.' });
  }
});

/**
 * POST /api/quiz/check
 * Body: { answers: {"0":"A","1":"C",...}, questions: [{correct,...}], courseId }
 * Response: { score, total, xpEarned, results: [{correct, selectedAnswer, explanation, sourceHint}] }
 */
router.post('/quiz/check', async (req, res) => {
  const { answers, questions } = req.body;
  if (!answers || !questions) return res.status(400).json({ error: 'answers and questions are required' });

  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  let score = 0;
  const results = questions.map((q, i) => {
    const selected = answers[String(i)];
    const isCorrect = selected === q.correct;
    if (isCorrect) score++;
    return {
      correct: isCorrect,
      correctAnswer: q.correct,
      selectedAnswer: selected,
      explanation: q.explanation,
      sourceHint: q.sourceHint,
    };
  });

  // Award XP for correct answers (fire-and-forget)
  const xpEarned = score * XP_PER_CORRECT_QUIZ;
  if (xpEarned > 0) {
    awardXp(userId, jwt, xpEarned).then(() => {
      checkAchievements(userId, jwt, { quizScore: score, quizTotal: questions.length });
    }).catch((err) => console.error('[quiz] XP award error:', err.message));
  }

  return res.json({ score, total: questions.length, xpEarned, results });
});

module.exports = router;
