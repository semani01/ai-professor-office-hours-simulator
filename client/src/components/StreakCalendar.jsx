import { useTheme } from '../context/ThemeContext';

/**
 * GitHub-style contribution calendar showing the last 35 days of study activity.
 * Props:
 *   studyDates: { "YYYY-MM-DD": count } — from /api/xp
 */
export function StreakCalendar({ studyDates = {} }) {
  const { theme } = useTheme();

  // Build last 35 days (5 weeks × 7 days)
  const days = [];
  const today = new Date();
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: studyDates[key] || 0, date: d });
  }

  // Pad to start on Sunday
  const firstDay = days[0].date.getDay(); // 0=Sun
  const padded = Array(firstDay).fill(null).concat(days);

  // Color intensity
  function cellColor(count) {
    if (count === 0) return theme.isDark ? '#1e293b' : '#e2e8f0';
    if (count < 3) return theme.isDark ? '#166534' : '#86efac';
    if (count < 6) return theme.isDark ? '#15803d' : '#4ade80';
    return theme.isDark ? '#22c55e' : '#16a34a';
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Study Activity
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {dayLabels.map((l, i) => (
          <div key={i} style={{ fontSize: 9, color: theme.textFaint, textAlign: 'center' }}>{l}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {padded.map((day, i) => (
          <div
            key={i}
            title={day ? `${day.key}: ${day.count} question${day.count !== 1 ? 's' : ''}` : ''}
            style={{
              height: 10, borderRadius: 2,
              background: day ? cellColor(day.count) : 'transparent',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      <div style={{ fontSize: 9, color: theme.textFaint, textAlign: 'right' }}>
        last 5 weeks
      </div>
    </div>
  );
}
