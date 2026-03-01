import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const BREAK_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '20 min', minutes: 20 },
];

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * ActiveSessionBanner — thin bar between header and main content during a study session.
 *
 * Props:
 *   session     object  — the active study_session row (started_at, intent, time_goal_minutes)
 *   onEndSession fn     — called when user clicks "End Session"
 */
export function ActiveSessionBanner({ session, onEndSession }) {
  const { theme } = useTheme();

  // Total time paused so far (milliseconds) — accumulates across multiple breaks
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  // When the current break started (null if not on break)
  const [breakStartedAt, setBreakStartedAt] = useState(null);
  // When the current break should end (null if not on break)
  const [breakUntil, setBreakUntil] = useState(null);
  // Elapsed session seconds (excluding paused time)
  const [elapsed, setElapsed] = useState(0);
  // Break remaining seconds
  const [breakRemaining, setBreakRemaining] = useState(0);
  // Show break picker popover
  const [showBreakPicker, setShowBreakPicker] = useState(false);
  const breakPickerRef = useRef(null);

  const onBreak = !!breakUntil;
  const goalMs = session.time_goal_minutes ? session.time_goal_minutes * 60 * 1000 : null;
  const sessionStartMs = new Date(session.started_at).getTime();

  // Main tick — runs every second
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();

      if (breakUntil) {
        const remaining = Math.max(0, Math.ceil((breakUntil - now) / 1000));
        setBreakRemaining(remaining);

        if (remaining === 0) {
          // Break ended — accumulate pause duration and resume
          const paused = now - breakStartedAt;
          setTotalPausedMs((prev) => prev + paused);
          setBreakUntil(null);
          setBreakStartedAt(null);
        }
      } else {
        const active = Math.floor((now - sessionStartMs - totalPausedMs) / 1000);
        setElapsed(Math.max(0, active));
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [breakUntil, breakStartedAt, totalPausedMs, sessionStartMs]);

  // Close break picker on outside click
  useEffect(() => {
    if (!showBreakPicker) return;
    function handler(e) {
      if (breakPickerRef.current && !breakPickerRef.current.contains(e.target)) {
        setShowBreakPicker(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBreakPicker]);

  function startBreak(minutes) {
    const now = Date.now();
    setBreakStartedAt(now);
    setBreakUntil(now + minutes * 60 * 1000);
    setBreakRemaining(minutes * 60);
    setShowBreakPicker(false);
  }

  // Progress toward time goal (0–1), only relevant when goal is set
  const progress = goalMs ? Math.min(1, (elapsed * 1000) / goalMs) : 0;
  const atGoal = goalMs && elapsed * 1000 >= goalMs;
  const nearGoal = goalMs && elapsed * 1000 >= goalMs * 0.8;

  // Intent label
  const INTENT_LABELS = {
    general: '📚 General Study',
    exam_prep: '🎯 Exam Prep',
    assignment: '✏️ Assignment',
    review_weak: '🔍 Review Weak Spots',
    explore_new: '🚀 Exploring New Topics',
  };
  const intentLabel = INTENT_LABELS[session.intent] || '📚 Study Session';

  // Banner background: pulse red when break is active, warn when near goal
  const bannerBg = onBreak
    ? 'linear-gradient(90deg, #1e3a5f, #1e4a8f)'
    : atGoal
    ? 'linear-gradient(90deg, #450a0a, #7f1d1d)'
    : nearGoal
    ? 'linear-gradient(90deg, #451a03, #78350f)'
    : theme.isDark
    ? 'linear-gradient(90deg, #1e1b4b, #312e81)'
    : 'linear-gradient(90deg, #312e81, #4338ca)';

  return (
    <div style={{
      position: 'relative',
      height: 40,
      background: bannerBg,
      borderBottom: `1px solid ${onBreak ? '#3b82f6' : '#4f46e5'}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      flexShrink: 0,
      transition: 'background 0.4s ease',
      overflow: 'visible',
    }}>
      {/* Intent label */}
      <span style={{ fontSize: 11, fontWeight: 600, color: '#c7d2fe', letterSpacing: '0.04em', flexShrink: 0 }}>
        {intentLabel}
      </span>

      <div style={{ width: 1, height: 14, background: 'rgba(199,210,254,0.3)', flexShrink: 0 }} />

      {/* Timer display */}
      {onBreak ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 500 }}>Break</span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#bfdbfe',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em',
          }}>
            {fmt(breakRemaining)}
          </span>
          <span style={{ fontSize: 10, color: '#93c5fd' }}>remaining</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(199,210,254,0.7)' }}>Elapsed</span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#e0e7ff',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em',
          }}>
            {fmt(elapsed)}
          </span>
          {goalMs && (
            <span style={{ fontSize: 10, color: 'rgba(199,210,254,0.6)' }}>
              / {fmt(session.time_goal_minutes * 60)}
            </span>
          )}
        </div>
      )}

      {/* Progress bar (only when goal set) */}
      {goalMs && !onBreak && (
        <div style={{
          flex: 1, height: 4, background: 'rgba(255,255,255,0.15)',
          borderRadius: 2, overflow: 'hidden', maxWidth: 160,
        }}>
          <div style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: atGoal ? '#f87171' : nearGoal ? '#fbbf24' : '#818cf8',
            borderRadius: 2,
            transition: 'width 1s linear, background 0.5s',
          }} />
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Break button */}
      {!onBreak && (
        <div ref={breakPickerRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowBreakPicker((v) => !v)}
            style={{
              padding: '3px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(199,210,254,0.3)',
              color: '#c7d2fe', fontSize: 11, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          >
            ☕ Break
          </button>

          {showBreakPicker && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
              background: theme.bgCard,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              padding: '10px 12px',
              zIndex: 4000,
              minWidth: 150,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Break for how long?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {BREAK_OPTIONS.map((opt) => (
                  <button
                    key={opt.minutes}
                    onClick={() => startBreak(opt.minutes)}
                    style={{
                      padding: '6px 10px', borderRadius: 7, textAlign: 'left',
                      background: 'none', border: `1px solid ${theme.border}`,
                      color: theme.textSecondary, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#a78bfa'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* End session button */}
      <button
        onClick={onEndSession}
        style={{
          padding: '3px 12px', borderRadius: 6,
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.4)',
          color: '#fca5a5', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s', flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.28)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
      >
        End Session
      </button>

      {/* On-break overlay message */}
      {onBreak && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
          <span style={{ fontSize: 11, color: '#93c5fd', fontStyle: 'italic' }}>
            Session paused — see you in {fmt(breakRemaining)}!
          </span>
          <button
            onClick={() => {
              const now = Date.now();
              const paused = now - breakStartedAt;
              setTotalPausedMs((prev) => prev + paused);
              setBreakUntil(null);
              setBreakStartedAt(null);
            }}
            style={{
              padding: '2px 8px', borderRadius: 5,
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.5)',
              color: '#a5b4fc', fontSize: 10, cursor: 'pointer',
            }}
          >
            Resume early
          </button>
        </div>
      )}
    </div>
  );
}
