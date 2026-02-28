import { useEffect, useRef, useState } from 'react';

export function useChat(courseId, token, onXpEarned, conversationId) {
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

  async function sendMessage(text) {
    if (!text.trim()) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    const history = messages.slice(-10);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, history, sessionId, courseId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Chat request failed');

      const assistantMsg = { role: 'assistant', content: data.response, sources: data.sources || [] };
      setMessages((prev) => [...prev, assistantMsg]);
      if (onXpEarned) onXpEarned();

      // Persist messages to DB if we have a conversationId
      if (conversationId) {
        const base = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        // Save user message first, then assistant (sequential to preserve order)
        fetch(`/api/conversations/${conversationId}/messages`, {
          ...base, method: 'POST',
          body: JSON.stringify({ role: 'user', content: text }),
        }).then(() =>
          fetch(`/api/conversations/${conversationId}/messages`, {
            ...base, method: 'POST',
            body: JSON.stringify({ role: 'assistant', content: data.response, sources: data.sources || [] }),
          })
        ).catch(() => {}); // fire-and-forget, don't block UI
      }
    } catch (err) {
      setError(err.message);
      // Keep the user message visible with a failed flag so they can retry
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
