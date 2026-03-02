import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

const INTENTS = [
  {
    id: 'general',
    icon: '📚',
    title: 'General Study',
    description: 'Review and reinforce your understanding',
  },
  {
    id: 'exam_prep',
    icon: '🎯',
    title: 'Exam Prep',
    description: 'Focused preparation for an upcoming exam',
  },
  {
    id: 'assignment',
    icon: '✏️',
    title: 'Assignment Help',
    description: 'Work through a specific assignment or problem',
  },
  {
    id: 'review_weak',
    icon: '🔍',
    title: 'Review Weak Spots',
    description: "Focus on topics you're struggling with",
  },
  {
    id: 'explore_new',
    icon: '🚀',
    title: 'Explore New Topics',
    description: "Dive into material you haven't covered yet",
  },
];

const TIME_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: 'No Limit', value: null },
];

export default function StudySessionModal({ courseId, token, onSessionStarted, onClose }) {
  const { theme } = useTheme();

  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [timeGoal, setTimeGoal] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [sessionData, setSessionData] = useState(null);

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch topics on mount
  useEffect(() => {
    async function fetchTopics() {
      setLoadingTopics(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/topics/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load topics');
        const data = await res.json();
        setTopics(data.topics || []);
      } catch {
        setTopics([]);
      } finally {
        setLoadingTopics(false);
      }
    }
    fetchTopics();
  }, [courseId, token]);

  const handleCreateSession = useCallback(
    async (resolvedTimeGoal) => {
      setGeneratingPlan(true);
      setPlanError(null);
      try {
        const res = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/study-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            courseId,
            intent,
            selectedTopics,
            timeGoalMinutes: resolvedTimeGoal,
          }),
        });
        if (!res.ok) throw new Error('Bad response');
        const data = await res.json();
        setSessionData(data);
      } catch {
        setPlanError('Failed to generate plan. Please try again.');
      } finally {
        setGeneratingPlan(false);
      }
    },
    [courseId, intent, selectedTopics, token]
  );

  // ── Styles ────────────────────────────────────────────────────────────────

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    zIndex: 3000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  };

  const cardStyle = {
    width: 480,
    maxHeight: '85vh',
    background: theme.bgCard,
    border: `1px solid ${theme.border}`,
    borderRadius: 20,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 22px 14px',
    borderBottom: `1px solid ${theme.border}`,
    flexShrink: 0,
  };

  const dotsContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    justifyContent: 'center',
  };

  const scrollableStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: 28,
  };

  const titleStyle = {
    fontSize: 20,
    fontWeight: 700,
    color: theme.textPrimary,
    marginBottom: 6,
    lineHeight: 1.25,
  };

  const subtitleStyle = {
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: 24,
  };

  // ── Step dot helper ───────────────────────────────────────────────────────

  function StepDot({ index }) {
    const isActive = index === step;
    const isPast = index < step;
    let bg, border;
    if (isActive) {
      bg = '#6366f1';
      border = '#6366f1';
    } else if (isPast) {
      bg = 'transparent';
      border = '#6366f1';
    } else {
      bg = 'transparent';
      border = theme.borderStrong;
    }
    return (
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: bg,
          border: `2px solid ${border}`,
          transition: 'all 0.25s ease',
        }}
      />
    );
  }

  // ── Intent card ───────────────────────────────────────────────────────────

  function IntentCard({ item }) {
    const isSelected = intent === item.id;
    return (
      <button
        onClick={() => {
          setIntent(item.id);
          setStep(2);
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 6,
          padding: '16px 14px',
          borderRadius: 12,
          border: `1.5px solid ${isSelected ? '#6366f1' : theme.border}`,
          background: isSelected
            ? theme.isDark
              ? 'rgba(99,102,241,0.12)'
              : '#eef2ff'
            : theme.bgInputField,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.18s, background 0.18s, transform 0.12s',
          transform: 'scale(1)',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = theme.border;
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        <span style={{ fontSize: 28 }}>{item.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary }}>
          {item.title}
        </span>
        <span style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.4 }}>
          {item.description}
        </span>
      </button>
    );
  }

  // ── Topic row ─────────────────────────────────────────────────────────────

  function TopicRow({ topic }) {
    const isChecked = selectedTopics.includes(topic);
    return (
      <button
        onClick={() =>
          setSelectedTopics((prev) =>
            isChecked ? prev.filter((t) => t !== topic) : [...prev, topic]
          )
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '10px 12px',
          borderRadius: 10,
          border: `1px solid ${isChecked ? '#6366f1' : theme.border}`,
          background: isChecked
            ? theme.isDark
              ? 'rgba(99,102,241,0.1)'
              : '#eef2ff'
            : 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          marginBottom: 8,
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        {/* Custom checkbox */}
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 5,
            border: `2px solid ${isChecked ? '#6366f1' : theme.borderStrong}`,
            background: isChecked ? '#6366f1' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          {isChecked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="#f1f5f9"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <span style={{ fontSize: 14, color: theme.textBody }}>{topic}</span>
      </button>
    );
  }

  // ── Spinner ───────────────────────────────────────────────────────────────

  function Spinner() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '40px 0' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: `3px solid ${theme.border}`,
            borderTopColor: '#6366f1',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: 15, color: theme.textMuted, fontStyle: 'italic' }}>
          Crafting your study plan...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Step renders ──────────────────────────────────────────────────────────

  function renderStep1() {
    const pairs = [];
    for (let i = 0; i < INTENTS.length; i += 2) {
      pairs.push(INTENTS.slice(i, i + 2));
    }
    return (
      <div>
        <div style={titleStyle}>What are you studying for today? ✨</div>
        <div style={subtitleStyle}>This helps me personalize your session</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pairs.map((pair, pIdx) => (
            <div
              key={pIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: pair.length === 1 ? '1fr' : '1fr 1fr',
                gap: 10,
                maxWidth: pair.length === 1 ? '50%' : '100%',
                margin: pair.length === 1 ? '0 auto' : '0',
              }}
            >
              {pair.map((item) => (
                <IntentCard key={item.id} item={item} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderStep2() {
    const hasTopics = !loadingTopics && topics.length > 0;
    return (
      <div>
        <div style={titleStyle}>Which topics do you want to cover?</div>
        <div style={subtitleStyle}>Select all that apply</div>

        {loadingTopics && (
          <p style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            Loading topics...
          </p>
        )}

        {!loadingTopics && topics.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 18 }}>
              📂 Upload a syllabus to enable topic selection
            </p>
            <button
              onClick={() => {
                setSelectedTopics([]);
                setStep(3);
              }}
              style={{
                padding: '9px 24px',
                borderRadius: 8,
                border: `1px solid ${theme.borderStrong}`,
                background: 'transparent',
                color: theme.textSecondary,
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Skip →
            </button>
          </div>
        )}

        {hasTopics && (
          <>
            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button
                onClick={() => setSelectedTopics(topics.map((t) => t.topic || t))}
                style={{
                  padding: '5px 14px',
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`,
                  background: theme.bgInputField,
                  color: theme.textSecondary,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedTopics([])}
                style={{
                  padding: '5px 14px',
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`,
                  background: theme.bgInputField,
                  color: theme.textSecondary,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Clear
              </button>
            </div>

            <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
              {topics.map((t) => {
                const label = typeof t === 'string' ? t : t.topic;
                return <TopicRow key={label} topic={label} />;
              })}
            </div>
          </>
        )}

        {hasTopics && (
          <button
            onClick={() => setStep(3)}
            style={{
              marginTop: 20,
              width: '100%',
              padding: '12px 0',
              borderRadius: 10,
              border: 'none',
              background: '#6366f1',
              color: '#f1f5f9',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Next →
          </button>
        )}
      </div>
    );
  }

  function renderStep3() {
    return (
      <div>
        <div style={titleStyle}>How long do you have? ⏱️</div>
        <div style={subtitleStyle}>Pick a session length and we'll get started</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
          {TIME_OPTIONS.map((opt) => {
            const isSelected = timeGoal === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => {
                  setTimeGoal(opt.value);
                  setStep(4);
                  handleCreateSession(opt.value);
                }}
                style={{
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: `2px solid ${isSelected ? '#6366f1' : theme.border}`,
                  background: isSelected ? '#6366f1' : theme.bgInputField,
                  color: isSelected ? '#f1f5f9' : theme.textPrimary,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.color = '#6366f1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.color = theme.textPrimary;
                  }
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderStep4() {
    if (generatingPlan) return <Spinner />;

    if (planError) {
      return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 14, color: '#f87171', marginBottom: 20 }}>{planError}</p>
          <button
            onClick={() => {
              setPlanError(null);
              handleCreateSession(timeGoal);
            }}
            style={{
              padding: '10px 28px',
              borderRadius: 10,
              border: 'none',
              background: '#6366f1',
              color: '#f1f5f9',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!sessionData) return null;

    const plan = sessionData.studyPlan || {};
    const steps = plan.steps || [];

    return (
      <div>
        {/* Plan title */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, marginBottom: 6 }}>
            {plan.planTitle || 'Your Study Plan'}
          </div>
          {plan.encouragement && (
            <p style={{ fontSize: 13, color: theme.textMuted, fontStyle: 'italic', lineHeight: 1.5 }}>
              {plan.encouragement}
            </p>
          )}
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: '12px 14px',
                borderRadius: 12,
                background: theme.bgInputField,
                border: `1px solid ${theme.border}`,
              }}
            >
              {/* Order badge */}
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{i + 1}</span>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary, marginBottom: 3 }}>
                  {s.action || s.title || `Step ${i + 1}`}
                </div>
                {s.reason && (
                  <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.45 }}>{s.reason}</div>
                )}
              </div>

              {/* Estimated time pill */}
              {(s.estimatedMinutes || s.duration) && (
                <div
                  style={{
                    flexShrink: 0,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: theme.isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                    border: `1px solid ${theme.isDark ? '#4338ca' : '#c7d2fe'}`,
                    color: '#6366f1',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.estimatedMinutes || s.duration} min
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        {plan.totalEstimatedMinutes && (
          <p style={{ fontSize: 13, color: theme.textMuted, textAlign: 'right', marginBottom: 20 }}>
            Total: ~{plan.totalEstimatedMinutes} minutes
          </p>
        )}

        {/* Start button */}
        <button
          onClick={() => {
            onSessionStarted(sessionData.session || sessionData);
            onClose();
          }}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#f1f5f9',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.02em',
            boxShadow: '0 4px 18px rgba(99,102,241,0.35)',
            transition: 'opacity 0.15s, transform 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.92';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Start Studying →
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          {/* Back button — steps 2 & 3 only */}
          <div style={{ width: 64, display: 'flex', alignItems: 'center' }}>
            {step >= 2 && step <= 3 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 0',
                }}
              >
                ← Back
              </button>
            )}
          </div>

          {/* Step dots */}
          <div style={dotsContainerStyle}>
            {[1, 2, 3, 4].map((n) => (
              <StepDot key={n} index={n} />
            ))}
          </div>

          {/* Close button */}
          <div style={{ width: 64, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: theme.textMuted,
                fontSize: 20,
                lineHeight: 1,
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: 6,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.textPrimary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={scrollableStyle}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
}
