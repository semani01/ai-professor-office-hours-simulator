import { useTheme } from '../context/ThemeContext';

const XP_PER_LEVEL = 200;

/**
 * Compact XP bar for the header.
 * Props:
 *   xpData: { totalXp, level, xpToNextLevel, currentStreak }
 */
export function XpBar({ xpData }) {
  const { theme } = useTheme();

  if (!xpData) {
    // Loading skeleton
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.4 }}>
        <div style={{ width: 28, height: 18, borderRadius: 4, background: theme.border }} />
        <div style={{ width: 60, height: 6, borderRadius: 3, background: theme.border }} />
      </div>
    );
  }

  const { level = 1, totalXp = 0, currentStreak = 0 } = xpData;
  const xpInCurrentLevel = totalXp - (level - 1) * XP_PER_LEVEL;
  const pct = Math.min(xpInCurrentLevel / XP_PER_LEVEL, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      {/* Level badge */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: theme.accentLight,
        background: theme.accentBg, border: `1px solid ${theme.accentBorder}`,
        borderRadius: 6, padding: '2px 6px', lineHeight: 1.4, whiteSpace: 'nowrap',
      }}>
        Lv {level}
      </div>

      {/* XP progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{
          width: 64, height: 5, borderRadius: 3,
          background: theme.isDark ? '#1e293b' : '#e2e8f0',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ fontSize: 9, color: theme.textFaint, textAlign: 'center', lineHeight: 1 }}>
          {xpInCurrentLevel}/{XP_PER_LEVEL}
        </div>
      </div>

      {/* Streak */}
      {currentStreak > 0 && (
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: currentStreak >= 3 ? '#f97316' : theme.textMuted,
          display: 'flex', alignItems: 'center', gap: 1,
          whiteSpace: 'nowrap',
        }}>
          🔥{currentStreak}
        </div>
      )}
    </div>
  );
}
