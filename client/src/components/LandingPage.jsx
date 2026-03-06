import { useRef, useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ElectronIcon } from './ElectronIcon';

/* ─── Utility hooks ─── */

function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('lp-visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

/* ─── CSS ─── */

const LP_STYLES = `
  .lp-reveal {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .lp-visible {
    opacity: 1;
    transform: translateY(0);
  }
  .lp-stagger > * {
    opacity: 0; transform: translateY(16px);
    transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .lp-stagger.lp-visible > *:nth-child(1) { opacity: 1; transform: translateY(0); transition-delay: 0s; }
  .lp-stagger.lp-visible > *:nth-child(2) { opacity: 1; transform: translateY(0); transition-delay: 0.08s; }
  .lp-stagger.lp-visible > *:nth-child(3) { opacity: 1; transform: translateY(0); transition-delay: 0.16s; }
  .lp-stagger.lp-visible > *:nth-child(4) { opacity: 1; transform: translateY(0); transition-delay: 0.24s; }
  .lp-stagger.lp-visible > *:nth-child(5) { opacity: 1; transform: translateY(0); transition-delay: 0.32s; }
  .lp-stagger.lp-visible > *:nth-child(6) { opacity: 1; transform: translateY(0); transition-delay: 0.4s; }

  @keyframes lp-gradient {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes lp-float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50%      { transform: translateY(-12px) rotate(3deg); }
  }
  @keyframes lp-pulse {
    0%, 100% { opacity: 0.08; transform: scale(1); }
    50%      { opacity: 0.18; transform: scale(1.05); }
  }

  .lp-cta {
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  }
  .lp-cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
    filter: brightness(1.1);
  }
  .lp-card {
    transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
  }
  .lp-card:hover {
    transform: translateY(-3px);
  }
  .lp-nav-link {
    transition: color 0.2s ease;
  }
  .lp-nav-link:hover {
    color: var(--lp-accent) !important;
  }

  html { scroll-behavior: smooth; }
`;

/* ─── Shared section label ─── */

function SectionLabel({ text, theme }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 12, marginBottom: 16,
    }}>
      <div style={{ width: 32, height: 1, background: theme.accent, opacity: 0.4 }} />
      <span style={{
        fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: theme.accent,
      }}>
        {text}
      </span>
      <div style={{ width: 32, height: 1, background: theme.accent, opacity: 0.4 }} />
    </div>
  );
}

/* ─── Sections ─── */

function Nav({ theme, toggleTheme, onSignIn, isMobile }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled
        ? (theme.isDark ? 'rgba(15, 17, 23, 0.92)' : 'rgba(248, 250, 252, 0.92)')
        : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? `1px solid ${theme.border}` : '1px solid transparent',
      transition: 'background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: isMobile ? '12px 20px' : '12px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ElectronIcon size={26} color={theme.accent} animate />
          <span style={{ fontSize: 19, fontWeight: 700, color: theme.textPrimary, letterSpacing: '-0.02em' }}>
            Maieutic
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 24 }}>
          {/* Nav links (desktop) */}
          {!isMobile && navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="lp-nav-link"
              style={{
                fontSize: 14, color: theme.textSecondary,
                textDecoration: 'none', fontWeight: 500,
              }}
            >
              {link.label}
            </a>
          ))}

          <button
            onClick={toggleTheme}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 16, padding: '4px 6px', color: theme.textSecondary,
            }}
          >
            {theme.isDark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={onSignIn}
            style={{
              background: 'none', cursor: 'pointer',
              border: `1px solid ${theme.borderStrong}`,
              borderRadius: 8, padding: '7px 18px',
              color: theme.textPrimary, fontSize: 13, fontWeight: 500,
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = theme.accent; e.target.style.background = theme.accentBg; }}
            onMouseLeave={e => { e.target.style.borderColor = theme.borderStrong; e.target.style.background = 'none'; }}
          >
            Sign In
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero({ theme, onGetStarted, onSignIn, isMobile }) {
  const heroGradient = theme.isDark
    ? 'linear-gradient(135deg, #0f1117 0%, #1a1640 40%, #1e1b4b 70%, #251e52 100%)'
    : 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 40%, #e0e7ff 70%, #ddd6fe 100%)';

  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      background: heroGradient,
      backgroundSize: '200% 200%',
      animation: 'lp-gradient 12s ease infinite',
      padding: isMobile ? '100px 20px 70px' : '140px 40px 120px',
    }}>
      {/* Decorative elements */}
      {!isMobile && (
        <div style={{
          position: 'absolute', right: '6%', top: '12%',
          animation: 'lp-float 6s ease-in-out infinite',
          opacity: 0.06, pointerEvents: 'none',
        }}>
          <ElectronIcon size={320} color={theme.accent} />
        </div>
      )}
      <div style={{
        position: 'absolute', left: '15%', top: '25%',
        width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accent}18 0%, transparent 65%)`,
        animation: 'lp-pulse 6s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: '25%', bottom: '10%',
        width: 300, height: 300, borderRadius: '50%',
        background: `radial-gradient(circle, #8b5cf618 0%, transparent 65%)`,
        animation: 'lp-pulse 8s ease-in-out infinite',
        animationDelay: '-3s',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 820, margin: '0 auto', textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 28,
          padding: '7px 18px', borderRadius: 24,
          background: theme.isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)',
          border: `1px solid ${theme.accentBorder}`,
          fontSize: 13, fontWeight: 600, color: theme.accentLight,
          letterSpacing: '0.02em',
        }}>
          <ElectronIcon size={14} color={theme.accentLight} />
          AI-Powered Socratic Tutor
        </div>

        <h1 style={{
          fontSize: isMobile ? 38 : 64, fontWeight: 800,
          color: theme.textPrimary,
          letterSpacing: '-0.035em', lineHeight: 1.08,
          margin: '0 0 24px',
        }}>
          Don't just get answers.
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Learn to think.
          </span>
        </h1>

        <p style={{
          fontSize: isMobile ? 16 : 19, lineHeight: 1.7,
          color: theme.textSecondary, maxWidth: 580, margin: '0 auto 40px',
        }}>
          Upload your course materials. Ask questions. Get guided by AI that teaches
          through the Socratic method — grounded in your syllabus, not the internet.
        </p>

        <div style={{
          display: 'flex', gap: 14,
          justifyContent: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
        }}>
          <button
            className="lp-cta"
            onClick={onGetStarted}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', border: 'none', cursor: 'pointer',
              padding: '15px 36px', borderRadius: 10,
              fontSize: 16, fontWeight: 600, letterSpacing: '0.01em',
              minWidth: isMobile ? '100%' : 190,
            }}
          >
            Get Started Free →
          </button>
          <button
            onClick={onSignIn}
            style={{
              background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              cursor: 'pointer',
              border: `1px solid ${theme.borderStrong}`,
              padding: '15px 36px', borderRadius: 10,
              fontSize: 16, fontWeight: 500, color: theme.textSecondary,
              minWidth: isMobile ? '100%' : 150,
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = theme.accent; e.target.style.background = theme.accentBg; }}
            onMouseLeave={e => { e.target.style.borderColor = theme.borderStrong; e.target.style.background = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'; }}
          >
            Sign In
          </button>
        </div>
      </div>
    </section>
  );
}

function ProblemSection({ theme, isMobile }) {
  const ref = useScrollReveal();
  const generic = [
    'Gives you the answer immediately',
    'No idea what your course covers',
    'One-size-fits-all responses',
    'You feel smart, but didn\'t learn',
  ];
  const maieutic = [
    'Asks you the right question',
    'Grounded in YOUR uploaded materials',
    'Tracks what you know and don\'t',
    'You struggle, but actually understand',
  ];

  return (
    <section ref={ref} className="lp-reveal" style={{
      padding: isMobile ? '70px 20px' : '110px 40px',
      background: theme.bgBase,
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <SectionLabel text="The Difference" theme={theme} />
        <h2 style={{
          fontSize: isMobile ? 26 : 38, fontWeight: 700,
          color: theme.textPrimary, textAlign: 'center',
          marginBottom: 52, letterSpacing: '-0.02em',
        }}>
          Not another ChatGPT wrapper
        </h2>

        <div style={{
          display: 'flex', gap: 20,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {/* Generic AI column */}
          <div className="lp-card" style={{
            flex: 1, padding: 28, borderRadius: 16,
            background: theme.bgCard,
            border: `1px solid ${theme.red.border}`,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${theme.red.dot}, transparent)`,
            }} />
            <div style={{
              fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 22,
              color: theme.red.text,
            }}>
              🤖 Generic AI
            </div>
            {generic.map((text, j) => (
              <div key={j} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                marginBottom: 16, fontSize: 15, lineHeight: 1.5,
                color: theme.textBody,
              }}>
                <span style={{ color: theme.red.dot, flexShrink: 0, fontSize: 16, marginTop: 1 }}>✗</span>
                {text}
              </div>
            ))}
          </div>

          {/* Maieutic column */}
          <div className="lp-card" style={{
            flex: 1, padding: 28, borderRadius: 16,
            background: theme.bgCard,
            border: `1px solid ${theme.green.border}`,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${theme.green.dot}, transparent)`,
            }} />
            <div style={{
              fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 22,
              color: theme.green.text,
            }}>
              🎓 Maieutic
            </div>
            {maieutic.map((text, j) => (
              <div key={j} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                marginBottom: 16, fontSize: 15, lineHeight: 1.5,
                color: theme.textBody,
              }}>
                <span style={{ color: theme.green.dot, flexShrink: 0, fontSize: 16, marginTop: 1 }}>✓</span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p style={{
          textAlign: 'center', marginTop: 44,
          fontSize: isMobile ? 18 : 22, fontWeight: 600,
          color: theme.accent,
          letterSpacing: '-0.01em',
        }}>
          "ChatGPT gives answers. Maieutic makes you think."
        </p>
      </div>
    </section>
  );
}

function HowItWorks({ theme, isMobile }) {
  const ref = useScrollReveal();
  const steps = [
    { num: '1', emoji: '📄', title: 'Upload', desc: 'Drop in your lecture slides, notes, and syllabus. The system chunks and embeds them locally for instant retrieval.' },
    { num: '2', emoji: '💬', title: 'Ask', desc: 'Ask any question about your course. The AI retrieves relevant context and responds Socratically — guiding, never revealing.' },
    { num: '3', emoji: '🧠', title: 'Learn', desc: 'Track your understanding across every topic. See what you\'ve mastered, what needs review, and what to study next.' },
  ];

  return (
    <section id="how-it-works" ref={ref} className="lp-reveal" style={{
      padding: isMobile ? '70px 20px' : '110px 40px',
      background: theme.bgSurface,
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <SectionLabel text="How It Works" theme={theme} />
        <h2 style={{
          fontSize: isMobile ? 26 : 38, fontWeight: 700,
          color: theme.textPrimary, textAlign: 'center',
          marginBottom: 60, letterSpacing: '-0.02em',
        }}>
          Three steps to deeper understanding
        </h2>

        <div style={{
          display: 'flex', gap: isMobile ? 32 : 0,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          position: 'relative',
        }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', position: 'relative', zIndex: 1,
              padding: isMobile ? 0 : '0 20px',
            }}>
              {/* Step number circle */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', fontSize: 20, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
              }}>
                {step.num}
              </div>
              {/* Connector arrow (desktop) */}
              {!isMobile && i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', top: 24, right: -8, zIndex: 2,
                  color: theme.textFaint, fontSize: 18,
                }}>
                  →
                </div>
              )}
              <div style={{ fontSize: 28, marginBottom: 10 }}>{step.emoji}</div>
              <h3 style={{
                fontSize: 20, fontWeight: 700, color: theme.textPrimary,
                marginBottom: 10,
              }}>
                {step.title}
              </h3>
              <p style={{
                fontSize: 14, lineHeight: 1.65, color: theme.textSecondary,
                maxWidth: 280, margin: '0 auto',
              }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid({ theme, isMobile }) {
  const headRef = useScrollReveal();
  const gridRef = useScrollReveal();
  const features = [
    { emoji: '🏛️', title: 'Socratic AI Tutor', desc: 'Never gives the answer outright. Guides you with follow-up questions and hints, grounded in your actual course materials.' },
    { emoji: '📋', title: 'Study Sessions', desc: 'Set your intent, pick topics, get an AI-generated study plan, and track progress with timed focus sessions.' },
    { emoji: '⚔️', title: 'Quests', desc: 'AI-generated goals that adapt to your knowledge gaps. Complete topic rooms and challenges to earn XP.' },
    { emoji: '🗺️', title: 'Topic Rooms', desc: 'Deep-dive into topics with flashcards, mind maps, and targeted Q&A. Rate your own understanding as you go.' },
    { emoji: '⚡', title: 'Quiz Mode', desc: 'Auto-generated quizzes from your course materials. Multiple choice with timed questions and instant feedback.' },
    { emoji: '📊', title: 'Knowledge Portfolio', desc: 'Visual dashboard of every topic. See mastery tiers, streaks, achievements, and XP at a glance.' },
  ];

  return (
    <section id="features" style={{
      padding: isMobile ? '70px 20px' : '110px 40px',
      background: theme.bgBase,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div ref={headRef} className="lp-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <SectionLabel text="Features" theme={theme} />
          <h2 style={{
            fontSize: isMobile ? 26 : 38, fontWeight: 700,
            color: theme.textPrimary, letterSpacing: '-0.02em',
            marginBottom: 12,
          }}>
            Everything you need to actually learn
          </h2>
          <p style={{ fontSize: 16, color: theme.textSecondary, maxWidth: 480, margin: '0 auto' }}>
            Not just a chatbot. A complete AI-powered study system.
          </p>
        </div>

        <div ref={gridRef} className="lp-reveal lp-stagger" style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 18,
        }}>
          {features.map((f, i) => (
            <div key={i} className="lp-card" style={{
              padding: 28, borderRadius: 14,
              background: theme.bgCard,
              border: `1px solid ${theme.border}`,
              position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow = `0 4px 24px ${theme.accent}15`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 14 }}>{f.emoji}</div>
              <h3 style={{
                fontSize: 16, fontWeight: 700, color: theme.textPrimary,
                marginBottom: 8,
              }}>
                {f.title}
              </h3>
              <p style={{
                fontSize: 14, lineHeight: 1.6, color: theme.textSecondary, margin: 0,
              }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhilosophySection({ theme, isMobile }) {
  const ref = useScrollReveal();
  return (
    <section ref={ref} className="lp-reveal" style={{
      padding: isMobile ? '70px 20px' : '110px 40px',
      background: theme.accentBg,
      borderTop: `1px solid ${theme.accentBorder}`,
      borderBottom: `1px solid ${theme.accentBorder}`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle decorative glow */}
      <div style={{
        position: 'absolute', right: '10%', top: '20%',
        width: 250, height: 250, borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accent}12 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <SectionLabel text="Philosophy" theme={theme} />
        <h2 style={{
          fontSize: isMobile ? 28 : 42, fontWeight: 800,
          color: theme.textPrimary, letterSpacing: '-0.03em',
          lineHeight: 1.15, marginBottom: 28,
        }}>
          The AI never tells you{' '}
          <span style={{
            background: 'linear-gradient(135deg, #f87171, #ef4444)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            you're ready.
          </span>
        </h2>
        <p style={{
          fontSize: isMobile ? 15 : 18, lineHeight: 1.8,
          color: theme.textBody, maxWidth: 580, margin: '0 auto',
        }}>
          Your Knowledge Portfolio shows progress — green, yellow, red — but
          the decision to walk into an exam confident? That's yours. The AI's job
          is to make sure you've been asked the hard questions. Your job is to be
          honest about whether you understand the answers.
        </p>
        <div style={{
          marginTop: 36, padding: '12px 24px', borderRadius: 8,
          display: 'inline-block',
          background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${theme.border}`,
        }}>
          <span style={{
            fontSize: 15, fontWeight: 600,
            color: theme.textSecondary, fontStyle: 'italic',
          }}>
            "When to stop studying is your decision."
          </span>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ theme, onGetStarted, isMobile }) {
  const ref = useScrollReveal();
  return (
    <section ref={ref} className="lp-reveal" style={{
      padding: isMobile ? '70px 20px' : '110px 40px',
      background: theme.bgBase, textAlign: 'center',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h2 style={{
          fontSize: isMobile ? 28 : 44, fontWeight: 800,
          color: theme.textPrimary, letterSpacing: '-0.03em',
          marginBottom: 16, lineHeight: 1.1,
        }}>
          Ready to study differently?
        </h2>
        <p style={{
          fontSize: 17, color: theme.textSecondary, marginBottom: 36, lineHeight: 1.6,
        }}>
          Upload your first course and see the Socratic method in action.
        </p>
        <button
          className="lp-cta"
          onClick={onGetStarted}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', border: 'none', cursor: 'pointer',
            padding: '16px 44px', borderRadius: 12,
            fontSize: 18, fontWeight: 700, letterSpacing: '0.01em',
          }}
        >
          Start Learning →
        </button>
      </div>
    </section>
  );
}

function Footer({ theme, isMobile }) {
  return (
    <footer style={{
      padding: isMobile ? '32px 20px' : '40px 40px',
      background: theme.bgSurface,
      borderTop: `1px solid ${theme.border}`,
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ElectronIcon size={16} color={theme.accent} />
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>Maieutic</span>
          <span style={{ fontSize: 12, color: theme.textFaint }}>·</span>
          <span style={{ fontSize: 12, color: theme.textFaint }}>Built with ❤️ for students</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a
            href="https://github.com/semani01/ai-professor-office-hours-simulator"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: theme.textMuted, textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = theme.accent}
            onMouseLeave={e => e.target.style.color = theme.textMuted}
          >
            GitHub
          </a>
          <span style={{ fontSize: 12, color: theme.textFaint }}>© 2026</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main ─── */

export default function LandingPage({ onGetStarted, onSignIn }) {
  const { theme, toggleTheme } = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div style={{ minHeight: '100vh', background: theme.bgBase, '--lp-accent': theme.accent }}>
      <style>{LP_STYLES}</style>

      <Nav theme={theme} toggleTheme={toggleTheme} onSignIn={onSignIn} isMobile={isMobile} />
      <Hero theme={theme} onGetStarted={onGetStarted} onSignIn={onSignIn} isMobile={isMobile} />
      <ProblemSection theme={theme} isMobile={isMobile} />
      <HowItWorks theme={theme} isMobile={isMobile} />
      <FeaturesGrid theme={theme} isMobile={isMobile} />
      <PhilosophySection theme={theme} isMobile={isMobile} />
      <FinalCTA theme={theme} onGetStarted={onGetStarted} isMobile={isMobile} />
      <Footer theme={theme} isMobile={isMobile} />
    </div>
  );
}
