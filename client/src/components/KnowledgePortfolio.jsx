import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { StreakCalendar } from './StreakCalendar';

function getTier(topic) {
  if (topic.resolved && topic.hintsNeeded <= 1) return 'mastered';
  if (topic.hintsNeeded >= 4 || (!topic.resolved && topic.exchanges >= 2)) return 'revisit';
  return 'inprogress';
}

const TIER_CONFIG = {
  mastered:   { label: 'Mastered',     icon: '✓', colorKey: 'green' },
  inprogress: { label: 'In Progress',  icon: '~', colorKey: 'yellow' },
  revisit:    { label: 'Revisit',      icon: '↺', colorKey: 'red' },
};

function TopicPill({ topic, theme, onClick }) {
  const tier = getTier(topic);
  const cfg = TIER_CONFIG[tier];
  const s = theme[cfg.colorKey];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? s.border : s.bg,
        border: `1px solid ${hovered ? s.dot : s.border}`,
        borderRadius: 8,
        padding: '7px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: s.dot, boxShadow: `0 0 5px ${s.dot}88`,
        }} />
        <span style={{
          fontSize: 12, fontWeight: 500, color: s.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{topic.tag}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: s.meta, opacity: 0.8 }}>
          {topic.exchanges}q{topic.hintsNeeded > 0 ? ` · ${topic.hintsNeeded}h` : ''}
        </span>
        {hovered && <span style={{ fontSize: 10, color: s.dot }}>→</span>}
      </div>
    </div>
  );
}

function ProgressRing({ value, max, color, size = 48 }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={11} fontWeight={700} fill={color}>
        {value}
      </text>
    </svg>
  );
}

export function KnowledgePortfolio({ courseId, token, topicsVersion, portfolioVersion, xpData, onTopicClick }) {
  const { theme } = useTheme();
  const [topics, setTopics] = useState([]);
  const [hasCourseTopic, setHasCourseTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'mastered' | 'inprogress' | 'revisit'

  // Reset immediately when course changes
  useEffect(() => {
    setTopics([]);
    setHasCourseTopic(null);
    setActiveSection('all');
  }, [courseId]);

  // Fetch whether a syllabus has been uploaded
  useEffect(() => {
    if (!courseId || !token) return;
    fetch(`/api/topics/${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setHasCourseTopic(data.topics?.length > 0))
      .catch(() => setHasCourseTopic(false));
  }, [courseId, token, topicsVersion]);

  // Fetch course-level summary — updates topics state silently (no loading flash)
  async function fetchSummary({ showLoading = false } = {}) {
    if (!courseId || !token) return;
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/course/${courseId}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.topics) {
        setTopics((prev) => {
          const next = data.topics;
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
      }
    } catch { /* non-critical */ }
    finally { if (showLoading) setLoading(false); }
  }

  // Eager refresh when a new message or quiz completes (silent — no spinner)
  useEffect(() => {
    if (portfolioVersion > 0) fetchSummary();
  }, [portfolioVersion]);

  useEffect(() => {
    if (!courseId || !token) return;
    fetchSummary({ showLoading: true }); // first load shows skeleton
    const interval = setInterval(() => fetchSummary(), 15_000); // polls silently
    return () => clearInterval(interval);
  }, [courseId, token]);

  const mastered   = topics.filter((t) => getTier(t) === 'mastered');
  const inprogress = topics.filter((t) => getTier(t) === 'inprogress');
  const revisit    = topics.filter((t) => getTier(t) === 'revisit');
  const total = topics.length;

  const filtered = activeSection === 'all' ? topics
    : activeSection === 'mastered' ? mastered
    : activeSection === 'inprogress' ? inprogress
    : revisit;

  // Skeleton
  if (hasCourseTopic === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
        {[80, 55, 70, 45].map((w, i) => (
          <div key={i} style={{ height: 10, borderRadius: 5, background: theme.border, width: `${w}%`, opacity: 0.4 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Syllabus nudge */}
      {hasCourseTopic === false && (
        <div style={{
          padding: '12px 14px', background: theme.yellow.bg,
          border: `1px solid ${theme.yellow.border}`, borderRadius: 10,
          display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 15 }}>📋</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.yellow.text }}>Upload your syllabus</span>
          </div>
          <p style={{ fontSize: 11, color: theme.yellow.meta, margin: 0, lineHeight: 1.5 }}>
            Topic tracking unlocks when you upload a syllabus. Questions will be mapped to course topics automatically.
          </p>
        </div>
      )}

      {/* Summary stats row — only when there are topics */}
      {total > 0 && (
        <div style={{
          display: 'flex', gap: 6, justifyContent: 'space-between',
        }}>
          {[
            { tier: 'mastered',   count: mastered.length,   cfg: TIER_CONFIG.mastered },
            { tier: 'inprogress', count: inprogress.length, cfg: TIER_CONFIG.inprogress },
            { tier: 'revisit',    count: revisit.length,    cfg: TIER_CONFIG.revisit },
          ].map(({ tier, count, cfg }) => {
            const s = theme[cfg.colorKey];
            const isActive = activeSection === tier;
            return (
              <button
                key={tier}
                onClick={() => setActiveSection(activeSection === tier ? 'all' : tier)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 2, padding: '8px 4px', borderRadius: 8,
                  background: isActive ? s.bg : theme.bgCard,
                  border: `1px solid ${isActive ? s.border : theme.border}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <ProgressRing value={count} max={total} color={s.dot} size={40} />
                <span style={{ fontSize: 10, color: s.text, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Topic list */}
      {total === 0 && !loading && hasCourseTopic !== false && (
        <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: 12, padding: '12px 0', lineHeight: 1.6 }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>📊</div>
          Topics appear as you study
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map((topic, i) => (
            <TopicPill
              key={topic.tag || i}
              topic={topic}
              theme={theme}
              onClick={() => onTopicClick && onTopicClick(topic)}
            />
          ))}
        </div>
      )}

      {/* Streak Calendar */}
      {xpData?.studyDates && (
        <>
          <div style={{ borderTop: `1px solid ${theme.border}` }} />
          <StreakCalendar studyDates={xpData.studyDates} />
        </>
      )}

      {/* Footer */}
      {total > 0 && (
        <p style={{ fontSize: 10, color: theme.textFaint, margin: 0, fontStyle: 'italic', textAlign: 'center' }}>
          You decide when you're ready.
        </p>
      )}
    </div>
  );
}
