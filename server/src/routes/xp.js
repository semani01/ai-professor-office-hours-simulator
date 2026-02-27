const express = require('express');
const { getAuthClient, extractJwt, getUserId } = require('../db/supabaseWithAuth');

const router = express.Router();

const XP_PER_MESSAGE = 10;
const XP_PER_CORRECT_QUIZ = 25;
const XP_PER_DEMONSTRATED_TOPIC = 50;
const XP_PER_LEVEL = 200;

function calcLevel(totalXp) {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

function calcXpToNext(totalXp) {
  const level = calcLevel(totalXp);
  return level * XP_PER_LEVEL - totalXp;
}

function calcStreakMultiplier(streak) {
  if (streak >= 3) return 2.0;
  if (streak >= 2) return 1.5;
  return 1.0;
}

/**
 * GET /api/xp
 * Returns the authenticated user's XP stats.
 * Response: { totalXp, level, xpToNextLevel, currentStreak, studyDates }
 */
router.get('/xp', async (req, res) => {
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'Unauthorized' });

  const userId = await getUserId(jwt);
  if (!userId) return res.status(401).json({ error: 'Could not identify user' });

  const db = getAuthClient(jwt);

  // Get XP record
  const { data: xpData } = await db
    .from('user_xp')
    .select('total_xp, current_streak, last_study_date')
    .eq('user_id', userId)
    .single();

  const totalXp = xpData?.total_xp ?? 0;
  const currentStreak = xpData?.current_streak ?? 0;

  // Get study activity (last 35 days for calendar)
  const since = new Date();
  since.setDate(since.getDate() - 35);
  const { data: interactions } = await db
    .from('interactions')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString());

  // Group by date
  const dateMap = {};
  (interactions || []).forEach((row) => {
    const d = row.created_at.slice(0, 10); // YYYY-MM-DD
    dateMap[d] = (dateMap[d] || 0) + 1;
  });

  return res.json({
    totalXp,
    level: calcLevel(totalXp),
    xpToNextLevel: calcXpToNext(totalXp),
    currentStreak,
    studyDates: dateMap,
  });
});

/**
 * Award XP to a user. Called internally from chat and quiz routes.
 * Not a public HTTP endpoint — exported as a function.
 *
 * @param {string} userId
 * @param {string} jwt
 * @param {number} baseXp - base amount before multiplier
 */
async function awardXp(userId, jwt, baseXp) {
  if (!userId || !jwt || !baseXp) return;
  try {
    const db = getAuthClient(jwt);

    // Get current record
    const { data: existing } = await db
      .from('user_xp')
      .select('total_xp, current_streak, last_study_date')
      .eq('user_id', userId)
      .single();

    const today = new Date().toISOString().slice(0, 10);
    const lastDate = existing?.last_study_date;

    // Calculate streak
    let streak = existing?.current_streak ?? 0;
    if (lastDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      if (lastDate === today) {
        // Already studied today — streak unchanged
      } else if (lastDate === yesterdayStr) {
        // Studied yesterday — extend streak
        streak += 1;
      } else {
        // Gap — reset streak
        streak = 1;
      }
    } else {
      streak = 1; // First ever study day
    }

    const multiplier = calcStreakMultiplier(streak);
    const xpEarned = Math.round(baseXp * multiplier);
    const currentXp = existing?.total_xp ?? 0;
    const newTotal = currentXp + xpEarned;

    await db.from('user_xp').upsert({
      user_id: userId,
      total_xp: newTotal,
      current_streak: streak,
      last_study_date: today,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return { xpEarned, newTotal, streak };
  } catch (err) {
    console.error('[xp] Award error:', err.message);
    return null;
  }
}

module.exports = { router, awardXp, XP_PER_MESSAGE, XP_PER_CORRECT_QUIZ, XP_PER_DEMONSTRATED_TOPIC };
