import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const INTENT_LABELS = {
  general: '📚 General Study',
  exam_prep: '🎯 Exam Prep',
  assignment: '✏️ Assignment',
  review_weak: '🔍 Review Weak Spots',
  explore_new: '🚀 Exploring New Topics',
};

const QUEST_ICONS = { topic_room: '📖', quiz: '🧠', chat: '💬', review: '🔍' };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * WelcomeBackPanel — modal shown on login when a previous session summary exists.
 *
 * Props:
 *   summary       object  — { id, summary_json, recommended_actions, created_at, study_sessions: { intent, started_at } }
 *   onAdoptQuests fn(arr) — called with selected actions to turn into quests
 *   onDismiss     fn      — dismiss without adopting
 */
export function WelcomeBackPanel({ summary, existingQuests = [], onAdoptQuests, onDismiss }) {
  const { theme } = useTheme();
  const s = summary?.summary_json || {};
  const session = summary?.study_sessions;
  const existingTitles = new Set((existingQuests || []).map((q) => q.title));
  const allActions = summary?.recommended_actions || [];
  // Split into new (addable) and already-added
  const actions = allActions.filter((a) => !existingTitles.has(a.title));
  const alreadyAdded = allActions.filter((a) => existingTitles.has(a.title));
  const [selected, setSelected] = useState(() => new Set(actions.map((_, i) => i)));
  const [adopting, setAdopting] = useState(false);

  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onDismiss(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onDismiss]);

  function toggleAction(i) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function handleAdopt() {
    setAdopting(true);
    const chosen = actions.filter((_, i) => selected.has(i));
    if (chosen.length > 0) await onAdoptQuests(chosen);
    onDismiss();
  }

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3500,
        animation: 'fadeInWB 0.2s ease',
      }}
    >
      <style>{`
        @keyframes fadeInWB { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUpWB { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 500, maxHeight: '82vh',
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          borderRadius: 20,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          animation: 'slideUpWB 0.22s ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '22px 24px 18px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))',
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>
                Welcome back! 👋
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
                {session && (
                  <span>
                    Last session: {INTENT_LABELS[session.intent] || 'Study Session'} · {timeAgo(summary.created_at)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onDismiss}
              style={{ background: 'none', border: 'none', color: theme.textFaint, fontSize: 18, cursor: 'pointer' }}
            >×</button>
          </div>

          {s.overallAssessment && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 10,
              background: theme.bgSurface, border: `1px solid ${theme.border}`,
              fontSize: 13, color: theme.textSecondary, lineHeight: 1.5, fontStyle: 'italic',
            }}>
              "{s.overallAssessment}"
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Quick snapshot */}
          {(s.demonstrated?.length > 0 || s.notTested?.length > 0) && (
            <div style={{ display: 'flex', gap: 10 }}>
              {s.demonstrated?.length > 0 && (
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Demonstrated</div>
                  {s.demonstrated.slice(0, 3).map((t, i) => (
                    <div key={i} style={{ fontSize: 12, color: theme.textSecondary, paddingLeft: 8, borderLeft: '2px solid rgba(34,197,94,0.4)', marginBottom: 2 }}>{t}</div>
                  ))}
                </div>
              )}
              {s.notTested?.length > 0 && (
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Still to Test</div>
                  {s.notTested.slice(0, 3).map((t, i) => (
                    <div key={i} style={{ fontSize: 12, color: theme.textSecondary, paddingLeft: 8, borderLeft: '2px solid rgba(234,179,8,0.4)', marginBottom: 2 }}>{t}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Already-added quests notice */}
          {alreadyAdded.length > 0 && (
            <div style={{
              padding: '9px 12px', borderRadius: 9,
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
              fontSize: 12, color: theme.textMuted,
            }}>
              ✅ Already in your quests: {alreadyAdded.map((a) => a.title).join(', ')}
            </div>
          )}

          {/* Recommended actions */}
          {actions.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.textPrimary, marginBottom: 8 }}>
                Pick up where you left off
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {actions.map((action, i) => {
                  const isSelected = selected.has(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleAction(i)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 9, cursor: 'pointer',
                        background: isSelected ? 'rgba(99,102,241,0.1)' : theme.bgSurface,
                        border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : theme.border}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        background: isSelected ? '#6366f1' : 'none',
                        border: `2px solid ${isSelected ? '#6366f1' : theme.borderStrong}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: '#fff',
                      }}>
                        {isSelected && '✓'}
                      </div>
                      <span style={{ fontSize: 14 }}>{QUEST_ICONS[action.type] || '📌'}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: theme.textPrimary, flex: 1 }}>{action.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: `1px solid ${theme.border}`,
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          flexShrink: 0,
        }}>
          <button
            onClick={onDismiss}
            style={{
              padding: '7px 18px', borderRadius: 8,
              background: 'none', border: `1px solid ${theme.border}`,
              color: theme.textMuted, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; }}
          >
            Start Fresh
          </button>
          {actions.length > 0 && (
            <button
              onClick={handleAdopt}
              disabled={adopting || selected.size === 0}
              style={{
                padding: '7px 20px', borderRadius: 8, border: 'none',
                background: selected.size === 0 ? theme.border : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: selected.size === 0 ? theme.textFaint : '#fff',
                fontSize: 13, fontWeight: 600, cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {adopting ? 'Adding…' : `Load ${selected.size} Quest${selected.size !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
