import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const SOURCE_TYPE_LABELS = {
  lecture: 'Lecture', notes: 'Notes', assignment: 'Assignment',
  syllabus: 'Syllabus', material: 'Material',
};

export function SourceCitation({ sources }) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(null);
  if (!sources || sources.length === 0) return null;

  // Deduplicate by sourceFile + weekNumber so the same file cited for different weeks both show
  const unique = sources.filter(
    (s, i, arr) => arr.findIndex(
      (x) => x.sourceFile === s.sourceFile && x.weekNumber === s.weekNumber
    ) === i
  );

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {unique.map((source, i) => {
        const label = SOURCE_TYPE_LABELS[source.sourceType] || 'Source';
        const tag = source.weekNumber ? `Week ${source.weekNumber} · ${label}` : label;
        const isOpen = expanded === i;

        return (
          <div key={i} style={{ position: 'relative' }}>
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                background: theme.accentBg, color: theme.accentLight,
                border: `1px solid ${theme.accentBorder}`, cursor: 'pointer',
                transition: 'all 0.1s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = theme.accentBorder}
              onMouseLeave={(e) => e.currentTarget.style.background = theme.accentBg}
            >
              <span style={{ fontSize: 10 }}>📄</span>
              <span>{tag}</span>
            </button>

            {isOpen && source.excerpt && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
                zIndex: 50, width: 280, padding: '10px 12px',
                background: theme.bgCard, border: `1px solid ${theme.borderStrong}`,
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: theme.textPrimary, margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {source.sourceFile}
                </p>
                <p style={{ fontSize: 11, color: theme.textSecondary, margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
                  "{source.excerpt}..."
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
