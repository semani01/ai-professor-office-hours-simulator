import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../context/ThemeContext';

function getTier(topic) {
  if (topic.resolved && topic.hintsNeeded <= 1) return 'mastered';
  if (topic.hintsNeeded >= 4 || (!topic.resolved && topic.exchanges >= 2)) return 'revisit';
  return 'inprogress';
}

const TIER_STYLE = {
  mastered:   { label: 'Mastered',    icon: '✓', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)' },
  inprogress: { label: 'In Progress', icon: '~', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  revisit:    { label: 'Revisit',     icon: '↺', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
};

function SkeletonCard({ lines = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 12, borderRadius: 6,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
          width: `${70 + (i % 3) * 12}%`,
        }} />
      ))}
      <style>{`@keyframes shimmer { 0%,100% { background-position: 0% 0; } 50% { background-position: 100% 0; } }`}</style>
    </div>
  );
}

function Section({ icon, title, children }) {
  const { theme } = useTheme();
  return (
    <div style={{
      background: theme.bgCard, border: `1px solid ${theme.border}`,
      borderRadius: 12, padding: '14px 16px',
    }}>
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

export function TopicRoom({ topic, courseId, token, onBack, onNewBadges }) {
  const { theme } = useTheme();
  const tier = getTier(topic);
  const ts = TIER_STYLE[tier];

  const [content, setContent] = useState(null); // { concepts, questions, coachingTips }
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

  async function loadContent() {
    setLoadingContent(true);
    setContentError(null);
    try {
      const tag = encodeURIComponent(topic.tag);
      const res = await fetch(`/api/topic-room/${courseId}/${tag}?tier=${tier}`, {
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
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response, sources: [] }]);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.bgBase }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', borderBottom: `1px solid ${theme.border}`,
        background: theme.bgSurface, flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: `1px solid ${theme.border}`, borderRadius: 8,
            color: theme.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 500,
            padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.borderStrong; e.currentTarget.style.color = theme.textSecondary; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
        >
          ← Back
        </button>

        {/* Tier badge */}
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: ts.bg, border: `1px solid ${ts.border}`, color: ts.color,
          flexShrink: 0,
        }}>
          {ts.icon} {ts.label}
        </span>

        {/* Topic name */}
        <span style={{
          fontSize: 14, fontWeight: 600, color: theme.textPrimary,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {topic.tag}
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {loadingContent && (
          <>
            <Section icon="📖" title="Key Concepts"><SkeletonCard lines={4} /></Section>
            <Section icon="🔍" title="Practice Questions"><SkeletonCard lines={3} /></Section>
            <Section icon="💡" title="Coaching Tips"><SkeletonCard lines={2} /></Section>
          </>
        )}

        {contentError && (
          <div style={{
            padding: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center' }}>⚠️ {contentError}</div>
            <button
              onClick={loadContent}
              style={{
                fontSize: 11, padding: '5px 14px', borderRadius: 8,
                background: 'none', border: '1px solid rgba(239,68,68,0.4)',
                color: '#f87171', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {content && (
          <>
            {/* Key Concepts */}
            <Section icon="📖" title="Key Concepts">
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {content.concepts.map((c, i) => (
                  <li key={i} style={{ fontSize: 13, color: theme.textBody, lineHeight: 1.55 }}>{c}</li>
                ))}
              </ul>
            </Section>

            {/* Practice Questions */}
            <Section icon="🔍" title="Practice Questions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {content.questions.map((q, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '10px 12px',
                    background: theme.bgBase, borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: ts.color,
                      flexShrink: 0, marginTop: 1, minWidth: 18,
                    }}>
                      Q{i + 1}
                    </span>
                    <span style={{ fontSize: 13, color: theme.textBody, lineHeight: 1.55 }}>{q}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Coaching Tips */}
            <Section icon="💡" title="Coaching Tips">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {content.coachingTips.map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                      {tier === 'mastered' ? '🚀' : tier === 'revisit' ? '🌱' : '⭐'}
                    </span>
                    <span style={{ fontSize: 13, color: theme.textBody, lineHeight: 1.55 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Scoped chat messages */}
        {chatMessages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: theme.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Chat about this topic
              </div>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}>
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
                    {msg.role === 'assistant' ? (
                      <div className="prose-chat"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    ) : msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  }}>🎓</div>
                  <div style={{
                    background: theme.bgCard, border: `1px solid ${theme.border}`,
                    borderRadius: '16px 16px 16px 4px', padding: '10px 14px',
                    display: 'flex', gap: 4, alignItems: 'center',
                  }}>
                    {[0,150,300].map((d) => (
                      <span key={d} style={{
                        width: 5, height: 5, borderRadius: '50%', background: theme.textFaint,
                        animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${d}ms`,
                      }} />
                    ))}
                    <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-4px);opacity:1} }`}</style>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scoped chat input */}
      <div style={{
        borderTop: `1px solid ${theme.border}`, padding: '12px 20px',
        background: theme.bgSurface, flexShrink: 0,
      }}>
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
              background: chatLoading || !chatInput.trim()
                ? theme.border
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
    </div>
  );
}
