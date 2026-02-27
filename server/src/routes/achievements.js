const express = require('express');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');

const router = express.Router();

const ALL_BADGES = [
  { key: 'hot_streak',      icon: '🔥', name: 'Hot Streak',       desc: 'Study 3 days in a row' },
  { key: 'sharpshooter',   icon: '🎯', name: 'Sharpshooter',     desc: 'Get 4/4 on a quiz' },
  { key: 'bookworm',        icon: '📚', name: 'Bookworm',          desc: 'Upload 5+ files to a course' },
  { key: 'deep_thinker',   icon: '🧠', name: 'Deep Thinker',      desc: 'Get 3 topics to Mastered in one session' },
  { key: 'course_champion', icon: '🏆', name: 'Course Champion',   desc: 'All syllabus topics reach Mastered' },
  { key: 'speed_learner',  icon: '⚡', name: 'Speed Learner',     desc: 'Answer a quiz question in under 10 seconds' },
  { key: 'night_owl',       icon: '🌙', name: 'Night Owl',         desc: 'Study after 11 PM' },
  { key: 'early_bird',      icon: '☀️', name: 'Early Bird',        desc: 'Study before 7 AM' },
  { key: 'first_question',  icon: '💬', name: 'First Step',        desc: 'Ask your first question' },
  { key: 'quiz_taker',      icon: '📝', name: 'Quiz Taker',        desc: 'Complete your first quiz' },
];

/**
 * GET /api/achievements
 * Returns all badges with unlock status for the user.
 * Response: { badges: [{ key, icon, name, desc, unlocked, unlockedAt }] }
 */
router.get('/achievements', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);
  const { data: unlocked } = await db
    .from('user_achievements')
    .select('badge_key, unlocked_at')
    .eq('user_id', userId);

  const unlockedMap = {};
  (unlocked || []).forEach((r) => { unlockedMap[r.badge_key] = r.unlocked_at; });

  const badges = ALL_BADGES.map((b) => ({
    ...b,
    unlocked: !!unlockedMap[b.key],
    unlockedAt: unlockedMap[b.key] || null,
  }));

  return res.json({ badges, unlockedCount: Object.keys(unlockedMap).length });
});

/**
 * Check and award achievements based on context.
 * Called internally from chat.js and quiz.js — not a public HTTP route.
 *
 * @param {string} userId
 * @param {string} jwt
 * @param {object} ctx - { quizScore, quizTotal, streak, demonstratedCount, totalFiles, fastAnswer }
 * @returns {string[]} array of newly unlocked badge keys
 */
async function checkAchievements(userId, jwt, ctx = {}) {
  if (!userId || !jwt) return [];
  try {
    const db = getAuthClient(jwt);

    // Get already unlocked badges
    const { data: existing } = await db
      .from('user_achievements')
      .select('badge_key')
      .eq('user_id', userId);
    const already = new Set((existing || []).map((r) => r.badge_key));

    const newBadges = [];
    const hour = new Date().getHours();

    // Determine which badges to award
    if (!already.has('first_question') && ctx.firstQuestion) newBadges.push('first_question');
    if (!already.has('quiz_taker') && ctx.quizCompleted) newBadges.push('quiz_taker');
    if (!already.has('sharpshooter') && ctx.quizScore === 4 && ctx.quizTotal === 4) newBadges.push('sharpshooter');
    if (!already.has('hot_streak') && ctx.streak >= 3) newBadges.push('hot_streak');
    if (!already.has('deep_thinker') && ctx.demonstratedCount >= 3) newBadges.push('deep_thinker');
    if (!already.has('bookworm') && ctx.totalFiles >= 5) newBadges.push('bookworm');
    if (!already.has('speed_learner') && ctx.fastAnswer) newBadges.push('speed_learner');
    if (!already.has('night_owl') && hour >= 23) newBadges.push('night_owl');
    if (!already.has('early_bird') && hour < 7) newBadges.push('early_bird');
    if (!already.has('course_champion') && ctx.allTopicsMastered) newBadges.push('course_champion');

    if (newBadges.length === 0) return [];

    const now = new Date().toISOString();
    const rows = newBadges.map((key) => ({ user_id: userId, badge_key: key, unlocked_at: now }));
    await db.from('user_achievements').upsert(rows, { onConflict: 'user_id,badge_key' });

    return newBadges;
  } catch (err) {
    console.error('[achievements] Check error:', err.message);
    return [];
  }
}

module.exports = { router, checkAchievements };
