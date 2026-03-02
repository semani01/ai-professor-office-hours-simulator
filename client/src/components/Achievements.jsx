import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Achievements modal + header trigger button.
 * Props:
 *   token: string
 *   newBadgeKeys: string[] — keys of newly unlocked badges (for toast)
 */
export function AchievementsButton({ token, newBadgeKeys = [] }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [seen, setSeen] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('seen-badges') || '[]'); } catch { return []; }
  });
  const [toast, setToast] = useState(null); // { icon, name }
  const toastTimer = useRef(null);

  useEffect(() => {
    if (!token) return;
    fetch((import.meta.env.VITE_API_URL ?? '') + '/api/achievements', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setBadges(data.badges || []);
        setUnlockedCount(data.unlockedCount || 0);
      })
      .catch(() => {});
  }, [token, newBadgeKeys.length]);

  // Show toast for newly earned badges
  const prevNewLen = useRef(0);
  useEffect(() => {
    if (newBadgeKeys.length <= prevNewLen.current) { prevNewLen.current = newBadgeKeys.length; return; }
    const latestKey = newBadgeKeys[newBadgeKeys.length - 1];
    const ALL_BADGE_DEFS = {
      hot_streak:      { icon: '🔥', name: 'Hot Streak' },
      sharpshooter:    { icon: '🎯', name: 'Sharpshooter' },
      bookworm:        { icon: '📚', name: 'Bookworm' },
      deep_thinker:    { icon: '🧠', name: 'Deep Thinker' },
      course_champion: { icon: '🏆', name: 'Course Champion' },
      speed_learner:   { icon: '⚡', name: 'Speed Learner' },
      night_owl:       { icon: '🌙', name: 'Night Owl' },
      early_bird:      { icon: '☀️', name: 'Early Bird' },
      first_question:  { icon: '💬', name: 'First Step' },
      quiz_taker:      { icon: '📝', name: 'Quiz Taker' },
    };
    const def = ALL_BADGE_DEFS[latestKey];
    if (def) {
      setToast(def);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3500);
    }
    prevNewLen.current = newBadgeKeys.length;
  }, [newBadgeKeys.length]);

  const unseenNew = newBadgeKeys.filter((k) => !seen.includes(k));

  function handleOpen() {
    setOpen(true);
    // Mark new badges as seen
    if (unseenNew.length > 0) {
      const next = [...seen, ...unseenNew];
      setSeen(next);
      sessionStorage.setItem('seen-badges', JSON.stringify(next));
    }
  }

  return (
    <>
      {/* Header button */}
      <button
        onClick={handleOpen}
        title="Achievements"
        style={{
          position: 'relative',
          background: 'none', border: `1px solid ${theme.border}`, borderRadius: 8,
          color: theme.textFaint, cursor: 'pointer', fontSize: 14,
          width: 32, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; e.currentTarget.style.color = theme.textSecondary; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textFaint; }}
      >
        🏆
        {unseenNew.length > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 10, height: 10, borderRadius: '50%',
            background: '#f97316', border: `2px solid ${theme.bgBase}`,
          }} />
        )}
      </button>

      {/* Achievement unlock toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, pointerEvents: 'none',
          animation: 'achieveSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards, achieveFadeOut 0.4s ease 3.1s forwards',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            border: '1px solid #6366f1',
            borderRadius: 14, padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
            minWidth: 240,
          }}>
            <span style={{ fontSize: 28 }}>{toast.icon}</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Achievement Unlocked!
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 1 }}>
                {toast.name}
              </div>
            </div>
          </div>
          <style>{`
            @keyframes achieveSlideIn {
              from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1); }
            }
            @keyframes achieveFadeOut {
              from { opacity: 1; }
              to   { opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: theme.bgCard, border: `1px solid ${theme.border}`,
              borderRadius: 16, padding: 28,
              display: 'flex', flexDirection: 'column', gap: 20,
              maxHeight: '80vh', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: theme.textPrimary }}>
                  Achievements
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: theme.textMuted }}>
                  {unlockedCount} of {badges.length} unlocked
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', color: theme.textFaint,
                  cursor: 'pointer', fontSize: 20, padding: 4,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = theme.textPrimary}
                onMouseLeave={(e) => e.currentTarget.style.color = theme.textFaint}
              >×</button>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 6, borderRadius: 3, background: theme.isDark ? '#1e293b' : '#e2e8f0', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: badges.length > 0 ? `${(unlockedCount / badges.length) * 100}%` : '0%',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                transition: 'width 0.4s ease',
              }} />
            </div>

            {/* Badge grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
              overflowY: 'auto',
            }}>
              {badges.map((badge) => {
                const isNew = newBadgeKeys.includes(badge.key);
                return (
                  <div key={badge.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: badge.unlocked ? (theme.isDark ? '#0f1a2e' : '#eff6ff') : theme.bgBase,
                    border: `1px solid ${badge.unlocked ? (theme.isDark ? '#1e3a5f' : '#bfdbfe') : theme.border}`,
                    opacity: badge.unlocked ? 1 : 0.45,
                    transition: 'all 0.2s',
                    filter: badge.unlocked ? 'none' : 'grayscale(1)',
                    boxShadow: isNew ? `0 0 12px ${theme.isDark ? '#6366f1' : '#818cf8'}44` : 'none',
                  }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{badge.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: badge.unlocked ? theme.textPrimary : theme.textFaint }}>
                        {badge.name}
                        {isNew && <span style={{ marginLeft: 5, fontSize: 9, color: '#f97316', fontWeight: 700 }}>NEW</span>}
                      </div>
                      <div style={{ fontSize: 10, color: theme.textMuted, lineHeight: 1.4, marginTop: 1 }}>
                        {badge.desc}
                      </div>
                      {badge.unlocked && badge.unlockedAt && (
                        <div style={{ fontSize: 9, color: theme.textFaint, marginTop: 2 }}>
                          {new Date(badge.unlockedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
