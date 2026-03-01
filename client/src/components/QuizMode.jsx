import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const ANSWER_LABELS = ['A', 'B', 'C', 'D'];
const QUESTION_TIME = 30; // seconds per question

/**
 * QuizMode overlay.
 * Props:
 *   courseId: string
 *   token: string
 *   onClose: () => void
 *   onXpEarned: (xp: number) => void  — to refresh header XP bar
 */
export function QuizMode({ courseId, token, onClose, onXpEarned, onNewBadges }) {
  const { theme } = useTheme();
  const [phase, setPhase] = useState('loading'); // 'loading' | 'question' | 'review' | 'results' | 'error'
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null); // answer chosen for current Q
  const [revealed, setRevealed] = useState(false); // show correct/wrong for current Q
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const timerRef = useRef(null);
  const answerTimeRef = useRef(Date.now()); // for speed badge

  // Load questions on mount
  useEffect(() => {
    fetch('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ courseId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); setPhase('error'); return; }
        setQuestions(data.questions);
        setPhase('question');
        answerTimeRef.current = Date.now();
      })
      .catch(() => { setError('Failed to load quiz. Please try again.'); setPhase('error'); });
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'question') return;
    setTimeLeft(QUESTION_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // Time's up — auto-reveal with no answer
          if (!revealed) handleReveal(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current, phase]);

  function handleSelect(letter) {
    if (revealed) return;
    setSelected(letter);
  }

  function handleReveal(letter) {
    clearInterval(timerRef.current);
    const finalAnswer = letter ?? selected ?? null;
    const elapsed = (Date.now() - answerTimeRef.current) / 1000;
    if (elapsed <= 10 && finalAnswer !== null) {
      answerTimeRef.fastAnswerEarned = true;
    }
    setSelected(finalAnswer);
    setRevealed(true);
    if (finalAnswer !== null) {
      setAnswers((prev) => ({ ...prev, [current]: finalAnswer }));
    }
  }

  function handleNext() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
      answerTimeRef.current = Date.now();
      setPhase('question');
    } else {
      // Submit answers
      submitAnswers();
    }
  }

  async function submitAnswers() {
    setPhase('loading');
    try {
      const finalAnswers = { ...answers };
      const res = await fetch('/api/quiz/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          answers: finalAnswers,
          questions,
          courseId,
          fastAnswer: !!answerTimeRef.fastAnswerEarned,
        }),
      });
      const data = await res.json();
      setResults(data);
      setPhase('results');
      if (data.xpEarned > 0 && onXpEarned) onXpEarned(data.xpEarned);
      if (data.newBadges?.length > 0 && onNewBadges) onNewBadges(data.newBadges);
    } catch {
      setError('Failed to submit quiz. Please try again.');
      setPhase('error');
    }
  }

  const q = questions[current];
  const timerPct = timeLeft / QUESTION_TIME;
  const timerColor = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#f59e0b' : '#ef4444';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 55,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: theme.bgCard, border: `1px solid ${theme.border}`,
          borderRadius: 20, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* --- LOADING --- */}
        {phase === 'loading' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 16, padding: 56,
          }}>
            <div style={{
              width: 32, height: 32, border: '3px solid #6366f1',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: 14, color: theme.textMuted }}>
              Generating quiz from your materials…
            </div>
          </div>
        )}

        {/* --- ERROR --- */}
        {phase === 'error' && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>😕</div>
            <p style={{ fontSize: 14, color: '#f87171', marginBottom: 20 }}>{error}</p>
            <button onClick={onClose} style={{
              padding: '9px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', cursor: 'pointer', fontSize: 14,
            }}>Close</button>
          </div>
        )}

        {/* --- QUESTION --- */}
        {(phase === 'question' || phase === 'review') && q && (
          <>
            {/* Quiz header */}
            <div style={{
              padding: '16px 20px 12px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>Quiz</span>
                <span style={{ fontSize: 12, color: theme.textMuted }}>
                  {current + 1} / {questions.length}
                </span>
              </div>
              {/* Timer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 80, height: 4, borderRadius: 2, background: theme.border, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2, background: timerColor,
                    width: `${timerPct * 100}%`, transition: 'width 1s linear, background 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: 12, color: timerColor, fontWeight: 600, minWidth: 18, textAlign: 'right' }}>
                  {timeLeft}
                </span>
              </div>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', color: theme.textFaint,
                cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1,
              }}>×</button>
            </div>

            {/* Progress dots */}
            <div style={{
              display: 'flex', gap: 4, padding: '10px 20px 0',
            }}>
              {questions.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: i < current ? '#6366f1' : i === current ? '#8b5cf6' : theme.border,
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>

            {/* Question body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <p style={{
                fontSize: 15, fontWeight: 600, color: theme.textPrimary,
                lineHeight: 1.55, marginBottom: 20, margin: '0 0 20px',
              }}>
                {q.question}
              </p>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ANSWER_LABELS.map((letter) => {
                  const optText = q.options[letter];
                  if (!optText) return null;
                  const isSelected = selected === letter;
                  const isCorrect = q.correct === letter;
                  const isWrong = revealed && isSelected && !isCorrect;
                  const isRight = revealed && isCorrect;

                  let bg = theme.isDark ? '#0f172a' : '#f8fafc';
                  let border = theme.border;
                  let textColor = theme.textBody;

                  if (isRight) { bg = '#052e16'; border = '#166534'; textColor = '#4ade80'; }
                  else if (isWrong) { bg = '#2d0a0a'; border = '#7f1d1d'; textColor = '#f87171'; }
                  else if (isSelected && !revealed) { bg = '#1e1b4b'; border = '#4338ca'; textColor = '#a5b4fc'; }

                  return (
                    <button
                      key={letter}
                      onClick={() => revealed ? null : handleSelect(letter)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 14px', borderRadius: 10,
                        background: bg, border: `1px solid ${border}`,
                        cursor: revealed ? 'default' : 'pointer',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { if (!revealed && !isSelected) e.currentTarget.style.borderColor = theme.borderStrong; }}
                      onMouseLeave={(e) => { if (!revealed && !isSelected) e.currentTarget.style.borderColor = theme.border; }}
                    >
                      <span style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: isRight ? '#166534' : isWrong ? '#7f1d1d' : isSelected ? '#312e81' : theme.border,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: isRight ? '#4ade80' : isWrong ? '#f87171' : isSelected ? '#a5b4fc' : theme.textFaint,
                      }}>{letter}</span>
                      <span style={{ fontSize: 13, color: textColor, lineHeight: 1.5 }}>{optText}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation after reveal */}
              {revealed && q.explanation && (
                <div style={{
                  marginTop: 16, padding: '10px 14px', borderRadius: 10,
                  background: theme.isDark ? '#0d1b2e' : '#eff6ff',
                  border: `1px solid ${theme.isDark ? '#1e3a5f' : '#bfdbfe'}`,
                  fontSize: 12, color: theme.isDark ? '#7dd3fc' : '#1d4ed8', lineHeight: 1.6,
                }}>
                  <span style={{ fontWeight: 600 }}>💡 </span>{q.explanation}
                  {q.sourceHint && (
                    <div style={{ marginTop: 4, fontSize: 11, opacity: 0.7 }}>📄 {q.sourceHint}</div>
                  )}
                </div>
              )}
            </div>

            {/* Action button */}
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${theme.border}` }}>
              {!revealed ? (
                <button
                  onClick={() => handleReveal(selected)}
                  disabled={!selected && timeLeft > 0}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                    background: selected ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : theme.border,
                    color: selected ? '#fff' : theme.textFaint,
                    cursor: selected ? 'pointer' : 'not-allowed',
                    fontSize: 14, fontWeight: 600, transition: 'all 0.15s',
                  }}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  }}
                >
                  {current < questions.length - 1 ? 'Next Question →' : 'See Results'}
                </button>
              )}
            </div>
          </>
        )}

        {/* --- RESULTS --- */}
        {phase === 'results' && results && (
          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
            {/* Score */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 6 }}>
                {results.score === results.total ? '🏆' : results.score >= results.total / 2 ? '⭐' : '📖'}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: theme.textPrimary }}>
                {results.score} / {results.total}
              </div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>
                {results.score === results.total ? 'Perfect score!' :
                 results.score >= results.total / 2 ? 'Good work!' : 'Keep studying — you\'ll get there!'}
              </div>
              {results.xpEarned > 0 && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                  padding: '5px 14px', borderRadius: 20,
                  background: '#1e1b4b', border: '1px solid #312e81',
                  fontSize: 12, fontWeight: 600, color: '#a5b4fc',
                }}>
                  ⚡ +{results.xpEarned} XP earned
                </div>
              )}
            </div>

            {/* Per-question breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.results.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                  borderRadius: 10, background: r.correct ? (theme.isDark ? '#052e16' : '#f0fdf4') : (theme.isDark ? '#2d0a0a' : '#fff1f2'),
                  border: `1px solid ${r.correct ? (theme.isDark ? '#166534' : '#86efac') : (theme.isDark ? '#7f1d1d' : '#fecdd3')}`,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{r.correct ? '✓' : '✗'}</span>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 600, color: r.correct ? (theme.isDark ? '#4ade80' : '#15803d') : (theme.isDark ? '#f87171' : '#dc2626'), marginBottom: 2 }}>
                      Q{i + 1}: {r.correct ? 'Correct' : `Incorrect — answer was ${r.correctAnswer}`}
                    </div>
                    <div style={{ color: theme.textMuted }}>{r.explanation}</div>
                    {r.sourceHint && <div style={{ fontSize: 10, color: theme.textFaint, marginTop: 2 }}>📄 {r.sourceHint}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                padding: '11px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}
            >
              Back to studying
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
