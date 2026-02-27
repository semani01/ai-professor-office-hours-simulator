import { useState } from 'react';

export function CourseTabs({ courses, activeCourseId, onSelect, onCreate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) { setAdding(false); return; }
    setCreating(true);
    await onCreate(name);
    setNewName('');
    setAdding(false);
    setCreating(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') { setAdding(false); setNewName(''); }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      overflowX: 'auto', flexShrink: 1, minWidth: 0,
      // Hide scrollbar but allow scroll
      scrollbarWidth: 'none',
    }}>
      <style>{`.course-tabs-scroll::-webkit-scrollbar { display: none; }`}</style>

      {courses.map((course) => {
        const isActive = course.id === activeCourseId;
        return (
          <div
            key={course.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8,
              background: isActive ? '#1e1b4b' : 'transparent',
              border: `1px solid ${isActive ? '#4338ca' : '#1e293b'}`,
              cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.15s',
              position: 'relative',
            }}
            onClick={() => onSelect(course.id)}
          >
            <span style={{
              fontSize: 12, fontWeight: isActive ? 600 : 400,
              color: isActive ? '#a5b4fc' : '#64748b',
              whiteSpace: 'nowrap', maxWidth: 120,
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {course.name}
            </span>
            {/* Delete button — only visible on hover via onMouseEnter/Leave on parent */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(course.id); }}
              title="Delete course"
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', color: '#475569', fontSize: 12,
                lineHeight: 1, display: 'flex', alignItems: 'center',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
            >
              ×
            </button>
          </div>
        );
      })}

      {/* New course input */}
      {adding ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCreate}
            placeholder="Course name"
            disabled={creating}
            style={{
              padding: '5px 10px', borderRadius: 8,
              background: '#0f1117', border: '1px solid #6366f1',
              color: creating ? '#475569' : '#f1f5f9', fontSize: 12, outline: 'none', width: 130,
            }}
          />
          {creating && (
            <div style={{
              width: 14, height: 14, flexShrink: 0,
              border: '2px solid #6366f1', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          title="Add course"
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'none', border: '1px dashed #1e293b',
            color: '#475569', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#475569'; }}
        >
          +
        </button>
      )}
    </div>
  );
}
