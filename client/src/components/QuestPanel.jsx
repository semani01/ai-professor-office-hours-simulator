import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const QUEST_ICONS = { topic_room: '📖', quiz: '🧠', chat: '💬', review: '🔍', custom: '📌' };
const STATUS_DOT = {
  pending: '#6366f1',
  in_progress: '#3b82f6',
  completed: '#22c55e',
};

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
          width: '100%', padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Quests
          </span>
          {active.length > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: '#6366f1', color: '#fff',
              borderRadius: 10, padding: '1px 5px',
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
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
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
                  fontSize: 10, color: theme.textFaint, textAlign: 'left',
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

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 10px',
        borderRadius: 9,
        background: hovered ? theme.bgHover : theme.bgSurface,
        border: `1px solid ${isDone ? 'transparent' : theme.border}`,
        opacity: dimmed ? 0.55 : 1,
        transition: 'all 0.15s',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        {/* Status dot */}
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4,
          background: STATUS_DOT[quest.status] || '#6366f1',
        }} />

        {/* Quest icon */}
        <span style={{ fontSize: 13, flexShrink: 0 }}>
          {QUEST_ICONS[quest.quest_type] || '📌'}
        </span>

        {/* Title */}
        <span style={{
          fontSize: 12, fontWeight: 500, color: isDone ? theme.textFaint : theme.textPrimary,
          flex: 1, lineHeight: 1.4, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          textDecoration: isDone ? 'line-through' : 'none',
        }}>
          {quest.title}
        </span>

        {/* Delete on hover */}
        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              background: 'none', border: 'none', padding: '0 2px',
              color: theme.textFaint, fontSize: 11, cursor: 'pointer', flexShrink: 0, lineHeight: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = theme.textFaint; }}
            title="Remove quest"
          >×</button>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 5, paddingLeft: 14 }}>
        {!isDone && (
          <button
            onClick={onGo}
            style={{
              padding: '2px 9px', borderRadius: 5, fontSize: 10, fontWeight: 600,
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
            padding: '2px 9px', borderRadius: 5, fontSize: 10, fontWeight: 500,
            background: 'none',
            border: `1px solid ${isDone ? theme.borderStrong : '#22c55e44'}`,
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
