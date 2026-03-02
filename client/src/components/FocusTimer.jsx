import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const FOCUS_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

/**
 * FocusTimer — standalone Pomodoro-style timer for anytime focus/study.
 * Simple, no session required.
 */
export function FocusTimer() {
  const { theme } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemainingMs, setTimeRemainingMs] = useState(null);
  const [totalMs, setTotalMs] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [doneMinutes, setDoneMinutes] = useState(null);

  // Tick every 100ms for smooth updates
  useEffect(() => {
    if (!isRunning || timeRemainingMs === null) return;
    const interval = setInterval(() => {
      setTimeRemainingMs((prev) => {
        if (prev <= 100) {
          setIsRunning(false);
          // Calculate minutes for the done modal
          if (totalMs) {
            const mins = Math.round(totalMs / 60 / 1000);
            setDoneMinutes(mins);
            setShowDoneModal(true);
          }
          return null;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning, timeRemainingMs, totalMs]);

  function startTimer(minutes) {
    const ms = minutes * 60 * 1000;
    setTotalMs(ms);
    setTimeRemainingMs(ms);
    setIsRunning(true);
    setShowMenu(false);
  }

  function togglePause() {
    setIsRunning((prev) => !prev);
  }

  function reset() {
    setIsRunning(false);
    setTimeRemainingMs(null);
    setTotalMs(null);
    setShowDoneModal(false);
    setDoneMinutes(null);
  }

  // Format time as MM:SS
  const formatTime = (ms) => {
    if (ms === null) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Progress 0-100%
  const progress = totalMs && timeRemainingMs !== null ? ((totalMs - timeRemainingMs) / totalMs) * 100 : 0;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => (timeRemainingMs === null ? setShowMenu(true) : togglePause())}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 8,
          background: timeRemainingMs !== null ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'none',
          border: timeRemainingMs !== null ? 'none' : `1px solid ${theme.border}`,
          color: timeRemainingMs !== null ? '#fff' : theme.textMuted,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (timeRemainingMs === null) {
            e.currentTarget.style.borderColor = theme.borderStrong;
            e.currentTarget.style.color = theme.textSecondary;
          }
        }}
        onMouseLeave={(e) => {
          if (timeRemainingMs === null) {
            e.currentTarget.style.borderColor = theme.border;
            e.currentTarget.style.color = theme.textMuted;
          }
        }}
        title={timeRemainingMs !== null ? (isRunning ? 'Pause' : 'Resume') : 'Start focus timer'}
      >
        <span>⏱</span>
        <span>{formatTime(timeRemainingMs)}</span>
        {timeRemainingMs !== null && (
          <span style={{ fontSize: 10, opacity: 0.8 }}>
            {isRunning ? '⏸' : '▶'}
          </span>
        )}
      </button>

      {/* Timer menu */}
      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: theme.bgCard,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            padding: '10px 12px',
            zIndex: 4000,
            minWidth: 140,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                onClick={() => startTimer(opt.minutes)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 7,
                  textAlign: 'left',
                  background: 'none',
                  border: `1px solid ${theme.border}`,
                  color: theme.textSecondary,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.bgHover;
                  e.currentTarget.style.borderColor = '#f59e0b';
                  e.currentTarget.style.color = '#fbbf24';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.color = theme.textSecondary;
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 3999 }}
        />
      )}

      {/* Stop button when running */}
      {timeRemainingMs !== null && (
        <button
          onClick={reset}
          style={{
            position: 'absolute',
            top: -20,
            right: 0,
            background: 'none',
            border: 'none',
            color: theme.textFaint,
            fontSize: 12,
            cursor: 'pointer',
            padding: '2px 4px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = theme.textFaint; }}
          title="Stop timer"
        >
          ✕
        </button>
      )}

      {/* Done modal — full screen overlay */}
      {showDoneModal && (
        <>
          <div
            onClick={() => reset()}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 4999,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: theme.bgCard,
              border: `1px solid ${theme.border}`,
              borderRadius: 16,
              padding: '40px 32px',
              zIndex: 5000,
              maxWidth: 420,
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏱</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: theme.textPrimary, margin: '0 0 12px' }}>
              Focus Complete!
            </h2>
            <p style={{ fontSize: 14, color: theme.textSecondary, margin: '0 0 28px', lineHeight: 1.6 }}>
              Your {doneMinutes}-minute focus session is done. Time for a break!
            </p>

            {/* Break duration chips */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  onClick={() => reset()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: '#f59e0b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(245,158,11,0.2)';
                    e.currentTarget.style.borderColor = '#f59e0b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)';
                  }}
                >
                  {mins}m break
                </button>
              ))}
            </div>

            {/* Dismiss button */}
            <button
              onClick={() => reset()}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 8,
                background: theme.bgHover,
                border: `1px solid ${theme.border}`,
                color: theme.textPrimary,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.bgInputField;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = theme.bgHover;
              }}
            >
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  );
}
