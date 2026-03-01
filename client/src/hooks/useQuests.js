import { useCallback, useEffect, useState } from 'react';

/**
 * useQuests — manages quest list for a course.
 *
 * Returns { quests, loading, fetchQuests, adoptQuests, updateQuestStatus, deleteQuest, checkQuestCompletion }
 */
export function useQuests(courseId, token) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchQuests = useCallback(async () => {
    if (!courseId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quests?courseId=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setQuests(data.quests || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [courseId, token]);

  useEffect(() => { fetchQuests(); }, [fetchQuests]);

  async function adoptQuests(actions) {
    if (!courseId || !token || !actions?.length) return;
    try {
      const res = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseId,
          quests: actions.map((a) => ({
            title: a.title,
            questType: a.type || 'review',
            targetData: a.targetData || {},
          })),
        }),
      });
      const data = await res.json();
      if (data.quests) {
        setQuests((prev) => [...data.quests, ...prev]);
      }
    } catch {
      /* ignore */
    }
  }

  async function updateQuestStatus(questId, status) {
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.quest) {
        setQuests((prev) => prev.map((q) => q.id === questId ? data.quest : q));
      }
    } catch {
      /* ignore */
    }
  }

  async function deleteQuest(questId) {
    try {
      await fetch(`/api/quests/${questId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuests((prev) => prev.filter((q) => q.id !== questId));
    } catch {
      /* ignore */
    }
  }

  /**
   * Auto-complete quests based on user actions.
   * @param {string} action  — 'topic_room_opened' | 'chat_sent' | 'quiz_completed'
   * @param {object} context — { topicTag, messageCount }
   */
  function checkQuestCompletion(action, context = {}) {
    const pending = quests.filter((q) => q.status !== 'completed');

    for (const quest of pending) {
      const td = quest.target_data || {};
      let shouldComplete = false;

      if (action === 'topic_room_opened' && quest.quest_type === 'topic_room') {
        shouldComplete = !td.topicTag || td.topicTag === context.topicTag;
      } else if (action === 'quiz_completed' && quest.quest_type === 'quiz') {
        shouldComplete = true;
      } else if (action === 'chat_sent' && quest.quest_type === 'chat') {
        // Complete after 3 messages on the matching topic
        const count = context.messageCount || 0;
        shouldComplete = count >= 3 && (!td.topicTag || td.topicTag === context.topicTag);
      }

      if (shouldComplete) {
        updateQuestStatus(quest.id, 'completed');
      }
    }
  }

  return { quests, loading, fetchQuests, adoptQuests, updateQuestStatus, deleteQuest, checkQuestCompletion };
}
