import { useState, useRef } from 'react';

export function useChat(courseId) {
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

    // Cap history to last 10 messages for the API call
    const history = messages.slice(-10);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, sessionId, courseId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Chat request failed');

      const assistantMsg = { role: 'assistant', content: data.response, sources: data.sources || [] };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message);
      // Remove the user message that failed so the UI is consistent
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return { messages, loading, error, sendMessage, sessionId };
}
