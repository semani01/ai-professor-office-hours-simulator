import { useState, useRef } from 'react';

export function useChat(courseId, token) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Generate sessionId once per mount and keep it stable
  const sessionId = useRef(crypto.randomUUID()).current;

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
    } catch (err) {
      setError(err.message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function resetMessages() {
    setMessages([]);
    setError(null);
  }

  return { messages, loading, error, sendMessage, sessionId, resetMessages };
}
