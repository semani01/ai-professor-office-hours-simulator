import { useEffect, useRef, useState } from 'react';

export function useChat(courseId, token, onXpEarned, conversationId, conversationIdRef, studySessionId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Generate sessionId once per mount and keep it stable
  const sessionId = useRef(crypto.randomUUID()).current;

  // Load messages from DB when conversationId changes
  useEffect(() => {
    if (!conversationId || !token) {
      setMessages([]);
      setError(null);
      return;
    }
    setLoadingHistory(true);
    fetch(`/api/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const loaded = (data.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
          sources: m.sources || [],
        }));
        setMessages(loaded);
        setError(null);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [conversationId, token]);

  async function sendMessage(text, { onNewBadges, topicContext } = {}) {
    if (!text.trim()) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    const history = messages.slice(-10);
    // Build message with optional topic context prefix
    const messageToSend = topicContext ? `[Topic: ${topicContext}] ${text}` : text;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageToSend, history, sessionId, courseId, studySessionId: studySessionId || null }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Chat request failed');

      const assistantMsg = { role: 'assistant', content: data.response, sources: data.sources || [] };
      setMessages((prev) => [...prev, assistantMsg]);
      if (onXpEarned) onXpEarned();
      if (onNewBadges && data.newBadges?.length > 0) onNewBadges(data.newBadges);

      // Persist messages to DB using the ref for always-current conversationId
      const convId = conversationIdRef ? conversationIdRef.current : conversationId;
      if (convId) {
        const base = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        fetch(`/api/conversations/${convId}/messages`, {
          ...base, method: 'POST',
          body: JSON.stringify({ role: 'user', content: text }),
        }).then(() =>
          fetch(`/api/conversations/${convId}/messages`, {
            ...base, method: 'POST',
            body: JSON.stringify({ role: 'assistant', content: data.response, sources: data.sources || [] }),
          })
        ).catch(() => {});
      }
    } catch (err) {
      setError(err.message);
      setMessages((prev) => prev.map((m, i) =>
        i === prev.length - 1 && m.role === 'user' ? { ...m, failed: true } : m
      ));
    } finally {
      setLoading(false);
    }
  }

  function resetMessages() {
    setMessages([]);
    setError(null);
  }

  return { messages, loading, loadingHistory, error, sendMessage, sessionId, resetMessages };
}
