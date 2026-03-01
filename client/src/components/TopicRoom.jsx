import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../context/ThemeContext';

function getTier(topic) {
  if (topic.manualTier) return topic.manualTier;
  if (topic.resolved && topic.hintsNeeded <= 1) return 'mastered';
  if (topic.hintsNeeded >= 4 || (!topic.resolved && topic.exchanges >= 2)) return 'revisit';
  return 'inprogress';
}

const TIER_STYLE = {
  mastered:   { label: 'Mastered',    icon: '✓', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)' },
  inprogress: { label: 'In Progress', icon: '~', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  revisit:    { label: 'Revisit',     icon: '↺', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
};

const TIER_ORDER = ['revisit', 'inprogress', 'mastered'];

function nextTier(t) { const i = TIER_ORDER.indexOf(t); return i < 2 ? TIER_ORDER[i + 1] : null; }
function prevTier(t) { const i = TIER_ORDER.indexOf(t); return i > 0 ? TIER_ORDER[i - 1] : null; }

function SkeletonCard({ lines = 3 }) {
  const { theme } = useTheme();
  const base = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const hi   = theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 13, borderRadius: 6,
          background: `linear-gradient(90deg, ${base} 0%, ${hi} 50%, ${base} 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
          width: `${65 + (i % 3) * 13}%`,
        }} />
      ))}
      <style>{`@keyframes shimmer { 0%,100% { background-position: 200% 0; } 50% { background-position: 0% 0; } }`}</style>
    </div>
  );
}

function Section({ icon, title, children }) {
  const { theme } = useTheme();
  return (
    <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: theme.textFaint,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Flashcard component
// ────────────────────────────────────────────────────────────
function FlashcardsTab({ cards, loading }) {
  const { theme } = useTheme();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SkeletonCard lines={2} />
      <SkeletonCard lines={3} />
    </div>
  );
  if (!cards || cards.length === 0) return (
    <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: 13, padding: '24px 0' }}>
      No flashcards generated yet.
    </div>
  );

  const card = cards[idx];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Progress indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
        {cards.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
            background: i === idx ? '#6366f1' : theme.border,
            transition: 'all 0.2s',
            cursor: 'pointer',
          }} onClick={() => { setIdx(i); setFlipped(false); }} />
        ))}
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped((f) => !f)}
        style={{
          minHeight: 140, borderRadius: 16,
          background: flipped
            ? `linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))`
            : theme.bgCard,
          border: `1px solid ${flipped ? 'rgba(99,102,241,0.4)' : theme.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '20px 24px', cursor: 'pointer', transition: 'all 0.25s',
          textAlign: 'center', gap: 10,
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.textFaint }}>
          {flipped ? '💡 Answer' : '❓ Question'}
        </div>
        <div style={{ fontSize: 14, fontWeight: flipped ? 400 : 600, color: flipped ? theme.textBody : theme.textPrimary, lineHeight: 1.6 }}>
          {flipped ? card.answer : card.question}
        </div>
        <div style={{ fontSize: 10, color: theme.textFaint, marginTop: 4 }}>
          {flipped ? 'tap to flip back' : 'tap to reveal answer'}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => { setIdx((i) => Math.max(0, i - 1)); setFlipped(false); }}
          disabled={idx === 0}
          style={{
            flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${theme.border}`,
            background: 'none', color: idx === 0 ? theme.textFaint : theme.textSecondary,
            cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 13,
          }}
        >← Prev</button>
        <button
          onClick={() => { setIdx((i) => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
          disabled={idx === cards.length - 1}
          style={{
            flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${theme.border}`,
            background: 'none', color: idx === cards.length - 1 ? theme.textFaint : theme.textSecondary,
            cursor: idx === cards.length - 1 ? 'not-allowed' : 'pointer', fontSize: 13,
          }}
        >Next →</button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Mind Map component — simple radial text layout (no canvas lib needed)
// ────────────────────────────────────────────────────────────
function MindMapTab({ concepts, tag, loading }) {
  const { theme } = useTheme();

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SkeletonCard lines={5} />
    </div>
  );
  if (!concepts || concepts.length === 0) return (
    <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: 13, padding: '24px 0' }}>
      No concepts to map yet.
    </div>
  );

  // Center node + radial branches — rendered as SVG
  const W = 460, H = 340, cx = W / 2, cy = H / 2;
  const r = 120; // radius from center to concept nodes
  const n = concepts.length;

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}
      >
        {/* Lines from center to nodes */}
        {concepts.map((_, i) => {
          const angle = (2 * Math.PI * i) / n - Math.PI / 2;
          const nx = cx + r * Math.cos(angle);
          const ny = cy + r * Math.sin(angle);
          return (
            <line key={i} x1={cx} y1={cy} x2={nx} y2={ny}
              stroke={theme.isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.4)'}
              strokeWidth={1.5} strokeDasharray="4 3"
            />
          );
        })}

        {/* Center node */}
        <circle cx={cx} cy={cy} r={36} fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.5)" strokeWidth={1.5} />
        <foreignObject x={cx - 32} y={cy - 22} width={64} height={44}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            fontSize: 9, fontWeight: 700, color: '#a5b4fc', textAlign: 'center',
            lineHeight: 1.3, wordBreak: 'break-word', display: 'flex',
            alignItems: 'center', justifyContent: 'center', height: '100%',
          }}>
            {tag.length > 22 ? tag.slice(0, 20) + '…' : tag}
          </div>
        </foreignObject>

        {/* Concept nodes */}
        {concepts.map((c, i) => {
          const angle = (2 * Math.PI * i) / n - Math.PI / 2;
          const nx = cx + r * Math.cos(angle);
          const ny = cy + r * Math.sin(angle);
          const boxW = 110, boxH = 44;
          return (
            <g key={i}>
              <rect
                x={nx - boxW / 2} y={ny - boxH / 2} width={boxW} height={boxH}
                rx={8}
                fill={theme.isDark ? 'rgba(30,27,75,0.85)' : 'rgba(238,242,255,0.95)'}
                stroke={theme.isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.4)'}
                strokeWidth={1}
              />
              <foreignObject x={nx - boxW / 2 + 4} y={ny - boxH / 2 + 4} width={boxW - 8} height={boxH - 8}>
                <div xmlns="http://www.w3.org/1999/xhtml" style={{
                  fontSize: 9, color: theme.isDark ? '#c7d2fe' : '#4338ca',
                  textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%',
                }}>
                  {c.length > 55 ? c.slice(0, 53) + '…' : c}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
      <p style={{ fontSize: 10, color: theme.textFaint, textAlign: 'center', margin: '6px 0 0' }}>
        Key concepts radiating from the topic centre
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main TopicRoom
// ────────────────────────────────────────────────────────────
export function TopicRoom({ topic, courseId, token, onBack, onNewBadges, onTierChange }) {
  const { theme } = useTheme();
  const [tier, setTier] = useState(() => getTier(topic));
  const ts = TIER_STYLE[tier];

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'flashcards' | 'mindmap'
  const [content, setContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [contentError, setContentError] = useState(null);

  // Scoped chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const sessionId = useRef(crypto.randomUUID()).current;
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Re-sync tier when topic changes (different topic pill clicked)
  useEffect(() => {
    setTier(getTier(topic));
    setChatMessages([]);
    setChatInput('');
  }, [topic.tag]);

  async function loadContent(tierOverride) {
    const useTier = tierOverride ?? tier;
    setLoadingContent(true);
    setContentError(null);
    setContent(null); // clear immediately so skeleton shows, not stale data
    try {
      const tag = encodeURIComponent(topic.tag);
      const res = await fetch(`/api/topic-room/${courseId}?tag=${tag}&tier=${useTier}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setContent(data);
    } catch (err) {
      setContentError(err.message);
    } finally {
      setLoadingContent(false);
    }
  }

  useEffect(() => { loadContent(); }, [topic.tag, courseId]);

  function handleTierChange(newTier) {
    setTier(newTier);
    if (onTierChange) onTierChange(topic.tag, newTier);
    loadContent(newTier);
  }

  async function handleChatSend() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput('');
    if (textareaRef.current) textareaRef.current.style.height = '24px';

    const userMsg = { role: 'user', content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const history = chatMessages.slice(-8);
      const messageToSend = `[Topic: ${topic.tag}] ${text}`;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: messageToSend, history, sessionId, courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      if (onNewBadges && data.newBadges?.length > 0) onNewBadges(data.newBadges);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'error', content: err.message }]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  }

  const up = nextTier(tier);
  const down = prevTier(tier);
  const TABS = [
    { id: 'overview',   label: '📖 Overview' },
    { id: 'flashcards', label: '🃏 Flashcards' },
    { id: 'mindmap',    label: '🗺 Mind Map' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bgBase }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderBottom: `1px solid ${theme.border}`,
        background: theme.bgSurface, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: `1px solid ${theme.border}`, borderRadius: 8,
            color: theme.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 500,
            padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4,
            transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; e.currentTarget.style.color = theme.textSecondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
        >
          ← Back
        </button>

        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: ts.bg, border: `1px solid ${ts.border}`, color: ts.color, flexShrink: 0,
        }}>
          {ts.icon} {ts.label}
        </span>

        <span style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {topic.tag}
        </span>

        {/* Tier progression controls */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {down && (
            <button
              onClick={() => handleTierChange(down)}
              title={`Step back to ${TIER_STYLE[down].label}`}
              style={{
                fontSize: 10, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                background: 'none', border: `1px solid ${TIER_STYLE[down].border}`,
                color: TIER_STYLE[down].color, transition: 'all 0.15s',
              }}
            >
              ↓ {TIER_STYLE[down].label}
            </button>
          )}
          {up && (
            <button
              onClick={() => handleTierChange(up)}
              title={`I'm ready — advance to ${TIER_STYLE[up].label}`}
              style={{
                fontSize: 10, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                background: TIER_STYLE[up].bg, border: `1px solid ${TIER_STYLE[up].border}`,
                color: TIER_STYLE[up].color, fontWeight: 700, transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              ↑ I'm ready → {TIER_STYLE[up].label}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: `1px solid ${theme.border}`,
        background: theme.bgSurface, flexShrink: 0,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '9px 16px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid #6366f1` : '2px solid transparent',
              color: activeTab === tab.id ? '#a5b4fc' : theme.textMuted,
              cursor: 'pointer', fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {contentError && (
          <div style={{
            padding: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center' }}>⚠️ {contentError}</div>
            <button
              onClick={() => loadContent()}
              style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, background: 'none', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            {loadingContent ? (
              <>
                <Section icon="📖" title="Key Concepts"><SkeletonCard lines={4} /></Section>
                <Section icon="🔍" title="Practice Questions"><SkeletonCard lines={3} /></Section>
                <Section icon="💡" title="Coaching Tips"><SkeletonCard lines={2} /></Section>
              </>
            ) : content && (
              <>
                <Section icon="📖" title="Key Concepts">
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {content.concepts.map((c, i) => (
                      <li key={i} style={{ fontSize: 13, color: theme.textBody, lineHeight: 1.55 }}>{c}</li>
                    ))}
                  </ul>
                </Section>

                <Section icon="🔍" title="Practice Questions">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {content.questions.map((q, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 10, padding: '10px 12px',
                        background: theme.bgBase, borderRadius: 8, border: `1px solid ${theme.border}`,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ts.color, flexShrink: 0, marginTop: 1, minWidth: 18 }}>
                          Q{i + 1}
                        </span>
                        <span style={{ fontSize: 13, color: theme.textBody, lineHeight: 1.55 }}>{q}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section icon="💡" title="Coaching Tips">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {content.coachingTips.map((tip, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                          {tier === 'mastered' ? '🚀' : tier === 'revisit' ? '🌱' : '⭐'}
                        </span>
                        <span style={{ fontSize: 13, color: theme.textBody, lineHeight: 1.55 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Self-assessment nudge */}
                {up && (
                  <div style={{
                    padding: '12px 16px', borderRadius: 12,
                    background: TIER_STYLE[up].bg, border: `1px solid ${TIER_STYLE[up].border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}>
                    <span style={{ fontSize: 12, color: TIER_STYLE[up].color, lineHeight: 1.5 }}>
                      Feeling confident? Only you know when you're truly ready.
                    </span>
                    <button
                      onClick={() => handleTierChange(up)}
                      style={{
                        fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 20,
                        background: TIER_STYLE[up].bg, border: `1px solid ${TIER_STYLE[up].border}`,
                        color: TIER_STYLE[up].color, cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                      }}
                    >
                      ↑ Move to {TIER_STYLE[up].label}
                    </button>
                  </div>
                )}
                {tier === 'mastered' && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                    fontSize: 12, color: '#4ade80', textAlign: 'center',
                  }}>
                    🏆 You've marked this topic as Mastered. Keep it up!
                  </div>
                )}
              </>
            )}

            {/* Scoped chat */}
            {chatMessages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
                <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    Chat about this topic
                  </div>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                      {msg.role === 'assistant' && (
                        <div style={{
                          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, marginRight: 8, marginTop: 2,
                        }}>🎓</div>
                      )}
                      <div style={{
                        maxWidth: '80%', padding: '10px 14px',
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        fontSize: 13, lineHeight: 1.6,
                        ...(msg.role === 'user'
                          ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }
                          : msg.role === 'error'
                          ? { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }
                          : { background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textBody }),
                      }}>
                        {msg.role === 'assistant'
                          ? <div className="prose-chat"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                          : msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🎓</div>
                      <div style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '16px 16px 16px 4px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                        {[0, 150, 300].map((d) => (
                          <span key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: theme.textFaint, animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${d}ms` }} />
                        ))}
                        <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-4px);opacity:1} }`}</style>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}

        {/* ── FLASHCARDS TAB ── */}
        {activeTab === 'flashcards' && (
          <FlashcardsTab
            loading={loadingContent}
            cards={content?.flashcards}
          />
        )}

        {/* ── MIND MAP TAB ── */}
        {activeTab === 'mindmap' && (
          <MindMapTab
            loading={loadingContent}
            concepts={content?.concepts}
            tag={topic.tag}
          />
        )}
      </div>

      {/* Scoped chat input — only shown on overview tab */}
      {activeTab === 'overview' && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px 20px', background: theme.bgSurface, flexShrink: 0 }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: theme.bgInput, border: `1px solid ${theme.borderStrong}`,
            borderRadius: 12, padding: '6px 6px 6px 14px',
          }}>
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                const el = e.target;
                el.style.height = '24px';
                el.style.height = Math.min(el.scrollHeight, 100) + 'px';
              }}
              onKeyDown={handleChatKey}
              disabled={chatLoading}
              placeholder={`Ask about ${topic.tag}…`}
              rows={1}
              style={{
                flex: 1, resize: 'none', border: 'none', outline: 'none',
                background: 'transparent', color: theme.textPrimary,
                fontSize: 13, lineHeight: 1.5, height: '24px',
                maxHeight: 100, overflowY: 'auto', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleChatSend}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: chatLoading || !chatInput.trim() ? theme.border : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: chatLoading || !chatInput.trim() ? theme.textFaint : '#fff',
                cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              {chatLoading ? '⏳' : '↑'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
