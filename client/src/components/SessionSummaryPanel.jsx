import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * SessionSummaryPanel — full-screen overlay shown when a study session ends.
 *
 * Props:
 *   summary        object   — { id, summary_json, recommended_actions, created_at }
 *   onClose        fn       — close without adopting quests
 *   onAdoptQuests  fn(arr)  — called with selected recommended actions to turn into quests
 */
export function SessionSummaryPanel({ summary, onClose, onAdoptQuests }) {
  const { theme } = useTheme();
  const s = summary?.summary_json || {};
  const actions = summary?.recommended_actions || [];
  const [selected, setSelected] = useState(() => new Set(actions.map((_, i) => i)));
  const [adopting, setAdopting] = useState(false);

  // Escape to close
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

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
    onClose();
  }

  const QUEST_ICONS = { topic_room: '📖', quiz: '🧠', chat: '💬', review: '🔍' };

  const stats = s.sessionStats || {};

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3500,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 540, maxHeight: '88vh',
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          borderRadius: 20,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.22s ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: theme.textPrimary }}>
                Session Complete ✨
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
                {s.overallAssessment || 'Great work today!'}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: theme.textFaint,
                fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
              }}
            >×</button>
          </div>

          {/* Stats row */}
          {(stats.topicsCovered > 0 || stats.questionsAsked > 0) && (
            <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
              {[
                { label: 'Topics Covered', value: stats.topicsCovered || 0 },
                { label: 'Questions Asked', value: stats.questionsAsked || 0 },
                { label: 'Hints Needed', value: stats.hintsNeeded || 0 },
                { label: 'Resolved', value: stats.resolved || 0 },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: theme.bgSurface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10, padding: '8px 14px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#818cf8' }}>{value}</div>
                  <div style={{ fontSize: 10, color: theme.textFaint }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Demonstrated */}
          {s.demonstrated?.length > 0 && (
            <Section
              icon="✅" title="What You Demonstrated"
              bg="rgba(34,197,94,0.06)" border="rgba(34,197,94,0.2)"
              titleColor="#4ade80" theme={theme}
            >
              <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.demonstrated.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* Not tested */}
          {s.notTested?.length > 0 && (
            <Section
              icon="⏳" title="Not Tested Yet"
              bg="rgba(234,179,8,0.06)" border="rgba(234,179,8,0.2)"
              titleColor="#fbbf24" theme={theme}
            >
              <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.notTested.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* Prioritize */}
          {s.prioritize?.length > 0 && (
            <Section
              icon="🎯" title="Prioritize Next"
              bg="rgba(239,68,68,0.06)" border="rgba(239,68,68,0.2)"
              titleColor="#f87171" theme={theme}
            >
              <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.prioritize.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* Blindspots */}
          {s.blindspots?.length > 0 && (
            <Section
              icon="💡" title="Learning Blindspots"
              bg="rgba(99,102,241,0.06)" border="rgba(99,102,241,0.2)"
              titleColor="#818cf8" theme={theme}
            >
              <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.blindspots.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* Recommended actions */}
          {actions.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.textPrimary, marginBottom: 10 }}>
                Recommended Next Steps
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {actions.map((action, i) => {
                  const isSelected = selected.has(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleAction(i)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                        background: isSelected ? 'rgba(99,102,241,0.1)' : theme.bgSurface,
                        border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : theme.border}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        background: isSelected ? '#6366f1' : 'none',
                        border: `2px solid ${isSelected ? '#6366f1' : theme.borderStrong}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: '#fff',
                      }}>
                        {isSelected && '✓'}
                      </div>
                      <span style={{ fontSize: 14 }}>{QUEST_ICONS[action.type] || '📌'}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: theme.textPrimary, flex: 1 }}>
                        {action.title}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 5,
                        background: 'rgba(99,102,241,0.12)',
                        color: '#818cf8',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {action.type?.replace('_', ' ') || 'quest'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${theme.border}`,
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: 8,
              background: 'none', border: `1px solid ${theme.border}`,
              color: theme.textMuted, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; }}
          >
            Dismiss
          </button>
          {actions.length > 0 && (
            <button
              onClick={handleAdopt}
              disabled={adopting || selected.size === 0}
              style={{
                padding: '8px 22px', borderRadius: 8, border: 'none',
                background: selected.size === 0 ? theme.border : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: selected.size === 0 ? theme.textFaint : '#fff',
                fontSize: 13, fontWeight: 600, cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                opacity: adopting ? 0.7 : 1,
              }}
            >
              {adopting ? 'Adding…' : `Add ${selected.size} Quest${selected.size !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, bg, border, titleColor, theme, children }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 12, padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: titleColor, letterSpacing: '0.02em' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
