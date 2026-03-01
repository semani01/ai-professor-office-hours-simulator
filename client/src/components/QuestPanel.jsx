import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const QUEST_ICONS = { topic_room: '📖', quiz: '🧠', chat: '💬', review: '🔍', custom: '📌' };
const ACCENT = { pending: '#6366f1', in_progress: '#3b82f6', completed: '#22c55e' };
const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', completed: 'Done' };

/**
 * QuestPanel — displays AI-generated quests in the right sidebar.
 *
 * Props:
 *   quests         Quest[]  — from useQuests hook
 *   onQuestAction  fn(quest)— called when user clicks Go on a quest
 *   onStatusChange fn(id, status) — from useQuests.updateQuestStatus
 *   onDelete       fn(id)   — from useQuests.deleteQuest
 */
export function QuestPanel({ quests, onQuestAction, onStatusChange, onDelete }) {
  const { theme } = useTheme();
  const [showCompleted, setShowCompleted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const active = quests.filter((q) => q.status !== 'completed');
  const done = quests.filter((q) => q.status === 'completed');

  if (quests.length === 0) return null;

  return (
    <div style={{ borderTop: `1px solid ${theme.border}` }}>
      {/* Section header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: '100%', padding: '9px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            🗺 Quests
          </span>
          {active.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: '#6366f1', color: '#fff',
              borderRadius: 10, padding: '1px 6px',
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
        <div style={{ padding: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {active.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              theme={theme}
              onGo={() => onQuestAction(quest)}
              onComplete={() => onStatusChange(quest.id, 'completed')}
              onDelete={() => onDelete(quest.id)}
            />
          ))}

          {done.length > 0 && (
            <>
              <button
                onClick={() => setShowCompleted((v) => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: theme.textFaint, textAlign: 'left',
                  padding: '2px 4px', marginTop: 2,
                }}
              >
                {showCompleted ? '▾' : '▸'} {done.length} completed
              </button>
              {showCompleted && done.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  theme={theme}
                  onGo={() => onQuestAction(quest)}
                  onComplete={() => onStatusChange(quest.id, 'pending')}
                  onDelete={() => onDelete(quest.id)}
                  dimmed
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest, theme, onGo, onComplete, onDelete, dimmed }) {
  const [hovered, setHovered] = useState(false);
  const isDone = quest.status === 'completed';
  const accentColor = ACCENT[quest.status] || '#6366f1';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: hovered ? theme.bgHover : theme.bgSurface,
        border: `1px solid ${isDone ? 'transparent' : theme.borderStrong}`,
        borderLeft: `3px solid ${accentColor}`,
        opacity: dimmed ? 0.6 : 1,
        transition: 'all 0.15s',
        display: 'flex', flexDirection: 'column', gap: 7,
      }}
    >
      {/* Top row: icon + title + delete */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.3 }}>
          {QUEST_ICONS[quest.quest_type] || '📌'}
        </span>

        <span style={{
          fontSize: 13, fontWeight: 600,
          color: isDone ? theme.textFaint : theme.textPrimary,
          flex: 1, lineHeight: 1.45,
          textDecoration: isDone ? 'line-through' : 'none',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {quest.title}
        </span>

        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              background: 'none', border: 'none', padding: '0 2px',
              color: theme.textFaint, fontSize: 13, cursor: 'pointer', flexShrink: 0, lineHeight: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = theme.textFaint; }}
            title="Remove quest"
          >×</button>
        )}
      </div>

      {/* Bottom row: status pill + action buttons */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: accentColor + '22',
          border: `1px solid ${accentColor}55`,
          color: accentColor,
        }}>
          {STATUS_LABEL[quest.status] || 'Pending'}
        </span>

        <div style={{ flex: 1 }} />

        {!isDone && (
          <button
            onClick={onGo}
            style={{
              padding: '3px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', color: '#fff', cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Go →
          </button>
        )}
        <button
          onClick={onComplete}
          style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: 'none',
            border: `1px solid ${isDone ? theme.borderStrong : 'rgba(34,197,94,0.5)'}`,
            color: isDone ? theme.textFaint : '#22c55e', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = isDone ? theme.bgHover : 'rgba(34,197,94,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        >
          {isDone ? 'Undo' : '✓ Done'}
        </button>
      </div>
    </div>
  );
}
