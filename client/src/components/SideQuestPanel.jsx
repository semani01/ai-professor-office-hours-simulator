import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * SideQuestPanel — user-created to-do list in the right sidebar.
 * Self-contained: manages its own state and API calls.
 *
 * Props:
 *   courseId  string
 *   token     string
 */
export function SideQuestPanel({ courseId, token }) {
  const { theme } = useTheme();
  const [sideQuests, setSideQuests] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!courseId || !token) return;
    fetch(`/api/side-quests?courseId=${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setSideQuests(data.sideQuests || []))
      .catch(() => {});
  }, [courseId, token]);

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/side-quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId, title }),
      });
      const data = await res.json();
      if (data.sideQuest) {
        setSideQuests((prev) => [...prev, data.sideQuest]);
        setNewTitle('');
      }
    } catch { /* ignore */ }
    finally { setAdding(false); }
  }

  async function handleToggle(id, current) {
    try {
      const res = await fetch(`/api/side-quests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ completed: !current }),
      });
      const data = await res.json();
      if (data.sideQuest) {
        setSideQuests((prev) => prev.map((q) => q.id === id ? data.sideQuest : q));
      }
    } catch { /* ignore */ }
  }

  async function handleDelete(id) {
    try {
      await fetch(`/api/side-quests/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSideQuests((prev) => prev.filter((q) => q.id !== id));
    } catch { /* ignore */ }
  }

  const active = sideQuests.filter((q) => !q.completed);
  const done = sideQuests.filter((q) => q.completed);
  const ordered = [...active, ...done];

  return (
    <div style={{ borderTop: `1px solid ${theme.border}` }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: '100%', padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Side Quests
          </span>
          {active.length > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: theme.bgCard, border: `1px solid ${theme.borderStrong}`,
              color: theme.textMuted, borderRadius: 10, padding: '1px 5px',
            }}>
              {active.length}
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: theme.textFaint }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Add input */}
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            background: theme.bgInputField,
            border: `1px solid ${theme.border}`,
            borderRadius: 8, padding: '4px 8px',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Add a task..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 11, color: theme.textPrimary, fontFamily: 'inherit',
              }}
            />
            {newTitle.trim() && (
              <button
                onClick={handleAdd}
                disabled={adding}
                style={{
                  background: '#6366f1', border: 'none', borderRadius: 5,
                  color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  padding: '2px 8px', flexShrink: 0,
                }}
              >
                +
              </button>
            )}
          </div>

          {/* Task list */}
          {ordered.map((sq) => (
            <SideQuestRow
              key={sq.id}
              sq={sq}
              theme={theme}
              onToggle={() => handleToggle(sq.id, sq.completed)}
              onDelete={() => handleDelete(sq.id)}
            />
          ))}

          {ordered.length === 0 && (
            <div style={{ fontSize: 11, color: theme.textFaint, fontStyle: 'italic', padding: '4px 4px', textAlign: 'center' }}>
              No tasks yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SideQuestRow({ sq, theme, onToggle, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 6px', borderRadius: 7,
        background: hovered ? theme.bgHover : 'none',
        transition: 'background 0.12s',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 14, height: 14, borderRadius: 4, flexShrink: 0,
          background: sq.completed ? '#6366f1' : 'none',
          border: `2px solid ${sq.completed ? '#6366f1' : theme.borderStrong}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        }}
      >
        {sq.completed && (
          <span style={{ fontSize: 8, color: '#fff', fontWeight: 700, lineHeight: 1 }}>✓</span>
        )}
      </button>

      {/* Title */}
      <span style={{
        flex: 1, fontSize: 11, color: sq.completed ? theme.textFaint : theme.textSecondary,
        textDecoration: sq.completed ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}>
        {sq.title}
      </span>

      {/* Delete on hover */}
      {hovered && (
        <button
          onClick={onDelete}
          style={{
            background: 'none', border: 'none', padding: '0 2px',
            color: theme.textFaint, fontSize: 11, cursor: 'pointer', lineHeight: 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = theme.textFaint; }}
        >×</button>
      )}
    </div>
  );
}
