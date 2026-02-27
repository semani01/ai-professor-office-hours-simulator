import { useEffect, useState } from 'react';

/**
 * Classify a topic into a readiness tier based on hints needed and resolved status.
 *   Green  — resolved + hintsNeeded ≤ 1  → demonstrated understanding quickly
 *   Yellow — hintsNeeded 2–3             → needed a few nudges
 *   Red    — hintsNeeded ≥ 4 or unresolved after exchanges → struggling / unresolved
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
    label: 'Demonstrated',
  },
  yellow: {
    bg: '#1c1a00',
    border: '#854d0e',
    text: '#facc15',
    dot: '#eab308',
    label: 'Needs Review',
  },
  red: {
    bg: '#2d0a0a',
    border: '#7f1d1d',
    text: '#f87171',
    dot: '#ef4444',
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
      gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: s.dot, flexShrink: 0,
            boxShadow: `0 0 5px ${s.dot}88`,
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: s.text }}>{topic.tag}</span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 500, color: s.text,
          background: `${s.border}55`, borderRadius: 10,
          padding: '1px 7px', border: `1px solid ${s.border}`,
        }}>{s.label}</span>
      </div>
      <div style={{ fontSize: 10, color: '#475569', paddingLeft: 15 }}>
        {topic.exchanges} exchange{topic.exchanges !== 1 ? 's' : ''}
        {topic.hintsNeeded > 0 && ` · ${topic.hintsNeeded} hint${topic.hintsNeeded !== 1 ? 's' : ''} needed`}
      </div>
    </div>
  );
}

export function WeakSpotDashboard({ sessionId }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchSummary() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/summary`);
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
  }, [sessionId]);

  const demonstrated = topics.filter((t) => getTier(t) === 'green');
  const needsReview = topics.filter((t) => getTier(t) === 'yellow');
  const revisit = topics.filter((t) => getTier(t) === 'red');

  if (topics.length === 0 && !loading) {
    return (
      <div style={{
        padding: '20px 16px',
        color: '#1e293b',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>📊</div>
        Topics will appear here as you study
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Session Map
        </div>
        {loading && (
          <div style={{ fontSize: 10, color: '#334155' }}>updating…</div>
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
          padding: '10px 12px',
          background: '#0d1117',
          border: '1px solid #1e293b',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {demonstrated.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#4ade80', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ✓ Demonstrated
              </div>
              <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.6 }}>
                {demonstrated.map((t) => t.tag).join(' · ')}
              </div>
            </div>
          )}
          {(needsReview.length > 0 || revisit.length > 0) && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#f87171', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ↺ To Revisit
              </div>
              <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.6 }}>
                {[...revisit, ...needsReview].map((t) => t.tag).join(' · ')}
              </div>
            </div>
          )}
          <p style={{ fontSize: 10, color: '#1e293b', margin: 0, fontStyle: 'italic' }}>
            When to stop studying is your decision.
          </p>
        </div>
      )}
    </div>
  );
}
