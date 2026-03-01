import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

function daysLeft(deletedAt) {
  const ms = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function initials(email) {
  if (!email) return '?';
  return email[0].toUpperCase();
}

/**
 * UserMenu — avatar button in top-right corner.
 * Clicking opens a dropdown with:
 *   - User email
 *   - Archived / deleted courses (recoverable within 30 days)
 *   - Sign out button
 *
 * Props:
 *   email: string
 *   token: string
 *   signOut: () => void
 *   onCourseRestored: (course) => void  — called when a course is recovered
 */
export function UserMenu({ email, token, signOut, onCourseRestored }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [archived, setArchived] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Fetch archived courses whenever the menu opens
  useEffect(() => {
    if (!open || !token) return;
    setLoadingArchived(true);
    fetch('/api/courses/archived', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setArchived(data.courses || []))
      .catch(() => setArchived([]))
      .finally(() => setLoadingArchived(false));
  }, [open, token]);

  async function handleRestore(courseId) {
    setRestoringId(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.course) {
        setArchived((prev) => prev.filter((c) => c.id !== courseId));
        onCourseRestored?.(data.course);
      }
    } catch { /* ignore */ }
    finally { setRestoringId(null); }
  }

  const avatarBg = 'linear-gradient(135deg, #6366f1, #8b5cf6)';

  return (
    <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={email || 'Account'}
        style={{
          width: 30, height: 30, borderRadius: '50%',
          background: avatarBg,
          border: open ? '2px solid #818cf8' : '2px solid transparent',
          color: '#fff', cursor: 'pointer',
          fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.15s',
          flexShrink: 0,
          padding: 0,
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.borderColor = 'rgba(129,140,248,0.6)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = 'transparent'; }}
      >
        {initials(email)}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 260,
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Email */}
          <div style={{
            padding: '12px 14px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: avatarBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {initials(email)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email || 'Signed in'}
              </div>
              <div style={{ fontSize: 10, color: theme.textFaint }}>Maieutic</div>
            </div>
          </div>

          {/* Archived courses section */}
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Recently Archived
            </div>

            {loadingArchived && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                <div style={{ width: 14, height: 14, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {!loadingArchived && archived.length === 0 && (
              <div style={{ fontSize: 11, color: theme.textFaint, fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>
                No archived courses
              </div>
            )}

            {!loadingArchived && archived.map((course) => (
              <div key={course.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 8px', borderRadius: 8, marginBottom: 4,
                background: theme.bgSurface,
                border: `1px solid ${theme.border}`,
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {course.name}
                  </div>
                  <div style={{ fontSize: 10, color: theme.textFaint }}>
                    Deleted · {daysLeft(course.deleted_at)}d left
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(course.id)}
                  disabled={restoringId === course.id}
                  style={{
                    marginLeft: 8, padding: '3px 9px', borderRadius: 6,
                    background: 'none',
                    border: `1px solid ${theme.accent || '#6366f1'}`,
                    color: theme.accent || '#6366f1',
                    fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    flexShrink: 0, transition: 'all 0.15s',
                    opacity: restoringId === course.id ? 0.5 : 1,
                  }}
                >
                  {restoringId === course.id ? '…' : 'Restore'}
                </button>
              </div>
            ))}
          </div>

          {/* Sign out */}
          <div style={{ padding: '8px 14px' }}>
            <button
              onClick={() => { setOpen(false); signOut(); }}
              style={{
                width: '100%', padding: '7px 12px', borderRadius: 8,
                background: 'none',
                border: `1px solid ${theme.border}`,
                color: theme.textMuted,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = 'none'; }}
            >
              <span style={{ fontSize: 13 }}>↪</span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
