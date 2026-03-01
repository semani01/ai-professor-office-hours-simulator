import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * DeleteCourseDialog — modal confirmation before archiving a course.
 *
 * Props:
 *   courseName: string
 *   onConfirm: () => void
 *   onCancel: () => void
 */
export function DeleteCourseDialog({ courseName, onConfirm, onCancel }) {
  const { theme } = useTheme();

  // Keyboard: Enter = confirm, Escape = cancel
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onConfirm, onCancel]);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000,
        animation: 'fadeIn 0.12s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          padding: '24px 28px',
          width: 360,
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.15s ease',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        {/* Icon + heading */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            🗄️
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: theme.textPrimary, marginBottom: 4 }}>
              Archive course?
            </div>
            <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.5 }}>
              <strong style={{ color: theme.textPrimary }}>{courseName}</strong> will be moved to your archive.
              You can restore it within 30 days.
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '7px 18px', borderRadius: 8,
              background: 'none',
              border: `1px solid ${theme.border}`,
              color: theme.textMuted,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; e.currentTarget.style.color = theme.textPrimary; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '7px 18px', borderRadius: 8,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              color: '#f87171',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
          >
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}
