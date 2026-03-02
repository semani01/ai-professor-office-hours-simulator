import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export function ConversationList({ courseId, token, activeConversationId, onSelect, onCreate, onDelete }) {
  const { theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const editRef = useRef(null);

  useEffect(() => {
    if (!courseId || !token) { setConversations([]); return; }
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/conversations?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { setConversations(data.conversations || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId, token]);

  async function handleCreate() {
    if (!courseId) return;
    const res = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ courseId }),
    });
    const data = await res.json();
    if (data.conversation) {
      setConversations((prev) => [data.conversation, ...prev]);
      if (onCreate) onCreate(data.conversation.id);
    }
  }

  function startEdit(conv, e) {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditName(conv.title);
    setTimeout(() => editRef.current?.select(), 0);
  }

  async function commitEdit(convId) {
    const name = editName.trim();
    setEditingId(null);
    if (!name) return;
    const conv = conversations.find((c) => c.id === convId);
    if (name === conv?.title) return;

    const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/conversations/${convId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: name }),
    });
    const data = await res.json();
    if (data.conversation) {
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, title: data.conversation.title } : c));
    }
  }

  function handleEditKey(e, convId) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(convId); }
    if (e.key === 'Escape') setEditingId(null);
  }

  async function handleDelete(convId, e) {
    e.stopPropagation();
    await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/conversations/${convId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== convId);
      if (activeConversationId === convId) {
        // Switch to next most recent, or create new
        if (next.length > 0) {
          if (onSelect) onSelect(next[0].id);
        } else {
          if (onDelete) onDelete(convId);
        }
      }
      return next;
    });
  }

  // Sync title when auto-titled from server (poll once after a conversation is active)
  function refreshTitle(convId) {
    if (!convId || !token) return;
    fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/conversations?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.conversations) setConversations(data.conversations); })
      .catch(() => {});
  }

  // Expose refreshTitle for parent to call after first message
  ConversationList._refreshTitle = refreshTitle;

  return (
    <div style={{ padding: '8px 10px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Conversations
        </span>
        <button
          onClick={handleCreate}
          title="New conversation"
          style={{
            background: 'none', border: `1px dashed ${theme.border}`,
            borderRadius: 6, color: theme.textFaint, cursor: 'pointer',
            fontSize: 13, width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textFaint; }}
        >
          +
        </button>
      </div>

      {/* Conversation list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && (
          <div style={{ fontSize: 11, color: theme.textFaint, padding: '4px 0' }}>Loading…</div>
        )}
        {!loading && conversations.length === 0 && (
          <div style={{ fontSize: 11, color: theme.textFaint, padding: '4px 0' }}>No conversations yet</div>
        )}
        {conversations.map((conv) => {
          const isActive = conv.id === activeConversationId;
          const isEditing = editingId === conv.id;

          return (
            <div
              key={conv.id}
              onClick={() => !isEditing && onSelect && onSelect(conv.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 8px', borderRadius: 7,
                background: isActive ? theme.accentBg : 'transparent',
                border: `1px solid ${isActive ? theme.accent : 'transparent'}`,
                cursor: isEditing ? 'default' : 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => { if (!isActive && !isEditing) e.currentTarget.style.background = theme.bgHover || theme.border + '22'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Active indicator dot */}
              <span style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: isActive ? theme.accent : 'transparent',
                transition: 'background 0.12s',
              }} />

              {/* Title or edit input */}
              {isEditing ? (
                <input
                  ref={editRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => handleEditKey(e, conv.id)}
                  onBlur={() => commitEdit(conv.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1, fontSize: 12, background: 'transparent',
                    border: 'none', outline: 'none',
                    color: theme.textPrimary, padding: 0, fontFamily: 'inherit',
                  }}
                />
              ) : (
                <span
                  style={{
                    flex: 1, fontSize: 12,
                    color: isActive ? theme.accentLight : theme.textMuted,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontWeight: isActive ? 500 : 400,
                  }}
                  onDoubleClick={(e) => startEdit(conv, e)}
                  title={conv.title}
                >
                  {conv.title}
                </span>
              )}

              {/* Action buttons — only shown on hover or when active */}
              {!isEditing && (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0, opacity: isActive ? 0.7 : 0 }}
                  className="conv-actions"
                >
                  <button
                    onClick={(e) => startEdit(conv, e)}
                    title="Rename"
                    style={{
                      background: 'none', border: 'none', padding: '0 2px',
                      cursor: 'pointer', color: theme.textFaint, fontSize: 10,
                      lineHeight: 1, display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = theme.accentLight; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = theme.textFaint; }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    title="Delete conversation"
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      cursor: 'pointer', color: theme.textFaint, fontSize: 12,
                      lineHeight: 1, display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = theme.textFaint; }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show action buttons on row hover via global style */}
      <style>{`
        div:hover > .conv-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
