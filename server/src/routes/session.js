const express = require('express');
const supabase = require('../db/supabase');

const router = express.Router();

/**
 * GET /api/session/:sessionId/summary
 *
 * Returns a topic-level summary for the given session:
 * - hintsNeeded = max hints_needed value seen for that topic
 * - resolved = true if ANY interaction on that topic was marked resolved
 * - exchanges = total number of interactions on that topic
 */
router.get('/session/:sessionId/summary', async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const { data, error } = await supabase
    .from('interactions')
    .select('topic_tag, hints_needed, resolved')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Session summary error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch session summary' });
  }

  if (!data || data.length === 0) {
    return res.json({ topics: [] });
  }

  // Aggregate by topic_tag
  const topicMap = {};
  for (const row of data) {
    const tag = row.topic_tag || 'General';
    if (!topicMap[tag]) {
      topicMap[tag] = { tag, hintsNeeded: 0, resolved: false, exchanges: 0 };
    }
    topicMap[tag].exchanges += 1;
    // hints_needed = index of this exchange within the topic, so max reflects depth
    if (row.hints_needed > topicMap[tag].hintsNeeded) {
      topicMap[tag].hintsNeeded = row.hints_needed;
    }
    if (row.resolved) {
      topicMap[tag].resolved = true;
    }
  }

  const topics = Object.values(topicMap);
  return res.json({ topics });
});

module.exports = router;
