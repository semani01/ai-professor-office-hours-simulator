import { useEffect, useRef, useState } from 'react';

export function useChat(courseId, token, onXpEarned, conversationId, conversationIdRef, onAutoConversation, studySessionId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Generate sessionId once per mount and keep it stable
  const sessionId = useRef(crypto.randomUUID()).current;
  // Track if first message was sent to avoid creating multiple conversations
  const createdConvRef = useRef(false);

  // Load messages from DB when conversationId changes
  useEffect(() => {
    if (!conversationId || !token) {
      setMessages([]);
      setError(null);
      return;
    }
    setLoadingHistory(true);
    fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/conversations/${conversationId}/messages`, {
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

  async function sendMessage(text, { onNewBadges, topicContext, isSystem } = {}) {
    if (!text.trim()) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    const history = messages.slice(-10);
    // Build message with optional topic context prefix
    const messageToSend = topicContext ? `[Topic: ${topicContext}] ${text}` : text;

    try {
      // Auto-create conversation if not yet created and no conversationId exists
      let convId = conversationIdRef ? conversationIdRef.current : conversationId;
      if (!convId && !isSystem && !createdConvRef.current) {
        createdConvRef.current = true;
        try {
          const createRes = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ courseId }),
          });
          const createData = await createRes.json();
          if (createData.conversation) {
            convId = createData.conversation.id;
            if (conversationIdRef) conversationIdRef.current = convId;
            if (onAutoConversation) onAutoConversation(convId);
          }
        } catch {
          // If auto-create fails, continue without persisting
        }
      }

      const res = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/chat', {
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

      // Persist messages to DB if we have a conversation ID
      if (convId) {
        const base = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
        fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/conversations/${convId}/messages`, {
          ...base, method: 'POST',
          body: JSON.stringify({ role: 'user', content: text }),
        }).then(() =>
          fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/conversations/${convId}/messages`, {
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
