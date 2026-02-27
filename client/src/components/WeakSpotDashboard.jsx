import { useEffect, useState } from 'react';

/**
 * Classify a topic into a readiness tier based on hints needed and resolved status.
 *   Green  — resolved + hintsNeeded ≤ 1  → demonstrated understanding quickly
 *   Yellow — hintsNeeded 2–3             → needed a few nudges
 *   Red    — hintsNeeded ≥ 4 or unresolved after ≥2 exchanges → struggling / unresolved
 */
function getTier(topic) {
  if (topic.resolved && topic.hintsNeeded <= 1) return 'green';
  if (topic.hintsNeeded >= 4 || (!topic.resolved && topic.exchanges >= 2)) return 'red';
  return 'yellow';
}

const TIER_STYLES = {
  green: {
    bg: '#052e16',
    border: '#166534',
    text: '#4ade80',
    dot: '#22c55e',
    meta: '#86efac',
    label: 'Demonstrated',
  },
  yellow: {
    bg: '#1c1400',
    border: '#854d0e',
    text: '#fbbf24',
    dot: '#f59e0b',
    meta: '#fde68a',
    label: 'Needs Review',
  },
  red: {
    bg: '#2d0a0a',
    border: '#7f1d1d',
    text: '#f87171',
    dot: '#ef4444',
    meta: '#fca5a5',
    label: 'Revisit',
  },
};

function TopicCard({ topic }) {
  const tier = getTier(topic);
  const s = TIER_STYLES[tier];

  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 10,
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: s.dot, flexShrink: 0,
            boxShadow: `0 0 6px ${s.dot}99`,
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: s.text }}>{topic.tag}</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 500, color: s.text,
          background: `${s.border}66`, borderRadius: 10,
          padding: '2px 8px', border: `1px solid ${s.border}`,
          whiteSpace: 'nowrap',
        }}>{s.label}</span>
      </div>
      <div style={{ fontSize: 12, color: s.meta, paddingLeft: 15 }}>
        {topic.exchanges} exchange{topic.exchanges !== 1 ? 's' : ''}
        {topic.hintsNeeded > 0 && ` · ${topic.hintsNeeded} hint${topic.hintsNeeded !== 1 ? 's' : ''} needed`}
      </div>
    </div>
  );
}

export function WeakSpotDashboard({ sessionId, courseId, token, topicsVersion }) {
  const [topics, setTopics] = useState([]);
  const [hasCourseTopic, setHasCourseTopic] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check if a syllabus has been uploaded — re-runs when courseId or topicsVersion changes
  useEffect(() => {
    if (!courseId || !token) return;
    setHasCourseTopic(null);
    fetch(`/api/topics/${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setHasCourseTopic(data.topics?.length > 0))
      .catch(() => setHasCourseTopic(false));
  }, [courseId, token, topicsVersion]);

  async function fetchSummary() {
    if (!sessionId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.topics) setTopics(data.topics);
    } catch {
      // silently fail — dashboard is non-critical
    } finally {
      setLoading(false);
    }
  }

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30_000);
    return () => clearInterval(interval);
  }, [sessionId, token]);

  const demonstrated = topics.filter((t) => getTier(t) === 'green');
  const needsReview = topics.filter((t) => getTier(t) === 'yellow');
  const revisit = topics.filter((t) => getTier(t) === 'red');

  // Skeleton while checking for syllabus
  if (hasCourseTopic === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '2px 0' }}>
        {[80, 55, 70].map((w, i) => (
          <div key={i} style={{
            height: 12, borderRadius: 6,
            background: '#1e293b', width: `${w}%`, opacity: 0.5,
          }} />
        ))}
      </div>
    );
  }

  // Syllabus nudge — shown when no topics have been extracted yet
  if (hasCourseTopic === false) {
    return (
      <div style={{
        padding: '14px',
        background: '#1c1a00',
        border: '1px solid #854d0e',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>Upload your syllabus</span>
        </div>
        <p style={{ fontSize: 12, color: '#fde68a', margin: 0, lineHeight: 1.5 }}>
          Upload a syllabus file to enable topic tracking. The session map will group your questions by course topic automatically.
        </p>
      </div>
    );
  }

  if (topics.length === 0 && !loading) {
    return (
      <div style={{
        padding: '16px',
        color: '#64748b',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>📊</div>
        Topics will appear here as you study
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Session Map
        </div>
        {loading && (
          <div style={{ fontSize: 11, color: '#64748b' }}>updating…</div>
        )}
      </div>

      {/* Topic cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {topics.map((topic, i) => (
          <TopicCard key={i} topic={topic} />
        ))}
      </div>

      {/* Summary section */}
      {topics.length > 0 && (
        <div style={{
          marginTop: 4,
          padding: '12px 14px',
          background: '#111827',
          border: '1px solid #1e293b',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {demonstrated.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#4ade80', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ✓ Demonstrated
              </div>
              <div style={{ fontSize: 12, color: '#86efac', lineHeight: 1.6 }}>
                {demonstrated.map((t) => t.tag).join(' · ')}
              </div>
            </div>
          )}
          {(needsReview.length > 0 || revisit.length > 0) && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#f87171', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ↺ To Revisit
              </div>
              <div style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.6 }}>
                {[...revisit, ...needsReview].map((t) => t.tag).join(' · ')}
              </div>
            </div>
          )}
          <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontStyle: 'italic' }}>
            When to stop studying is your decision.
          </p>
        </div>
      )}
    </div>
  );
}
