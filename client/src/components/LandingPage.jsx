import { useRef, useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ElectronIcon } from './ElectronIcon';
import appPreviewDark from '../assets/app-preview-dark.png';
import appPreviewLight from '../assets/app-preview-light.png';

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
  @keyframes lp-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-6px); opacity: 1; }
  }
  @keyframes lp-msg-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-badge-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
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
  .lp-card .lp-card-accent {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .lp-card:hover .lp-card-accent {
    opacity: 1;
  }
  .lp-nav-link {
    transition: color 0.2s ease;
  }
  .lp-nav-link:hover {
    color: var(--lp-accent) !important;
  }

  .lp-chat-scroll::-webkit-scrollbar { width: 4px; }
  .lp-chat-scroll::-webkit-scrollbar-track { background: transparent; }
  .lp-chat-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.18); border-radius: 2px; }

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
        ? (theme.isDark ? 'rgba(15, 17, 23, 0.85)' : 'rgba(248, 250, 252, 0.85)')
        : 'transparent',
      backdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'none',
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

  const badges = [
    { icon: '🎯', label: 'Socratic Method' },
    { icon: '📚', label: 'Your Materials Only' },
    { icon: '📈', label: 'Mastery Tracking' },
  ];

  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      background: heroGradient,
      backgroundSize: '200% 200%',
      animation: 'lp-gradient 12s ease infinite',
      padding: isMobile ? '100px 20px 70px' : '140px 40px 100px',
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

        {/* Floating stat badges */}
        <div style={{
          display: 'flex', gap: isMobile ? 10 : 16,
          justifyContent: 'center', marginTop: 44, flexWrap: 'wrap',
        }}>
          {badges.map((b, i) => (
            <div key={i} style={{
              padding: '7px 16px', borderRadius: 20,
              background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${theme.border}`,
              fontSize: 12, color: theme.textSecondary, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
              animation: `lp-badge-float ${5 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}>
              <span>{b.icon}</span> {b.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Animated Chat Demo ─── */

const GENERIC_MSGS = [
  { role: 'student', text: 'What is the critical path method?', showAt: 0 },
  {
    role: 'ai', showAt: 1400, typingAt: 500,
    text: 'The Critical Path Method (CPM) is a project scheduling algorithm. It identifies the longest path of dependent tasks to determine minimum project duration. Steps: 1) List activities, 2) Map dependencies, 3) Estimate durations, 4) Calculate the longest path. Any delay on critical path tasks directly delays the entire project.',
  },
];

const MAIEUTIC_MSGS = [
  { role: 'student', text: 'What is the critical path method?', showAt: 0 },
  {
    role: 'ai', showAt: 1800, typingAt: 500,
    text: "Great question! Your Week 4 lecture discusses project networks. What do you think 'path' means in that context?",
    source: 'Week 4 \u00B7 Lecture',
  },
  { role: 'student', text: 'A sequence of connected tasks?', showAt: 3500 },
  {
    role: 'ai', showAt: 5200, typingAt: 4100,
    text: "Exactly! Now \u2014 if a project has many paths, what makes one 'critical'? Think about what happens to the deadline...",
    source: 'Week 4 \u00B7 Lecture',
  },
];

function MiniChat({ label, labelColor, borderColor, messages, theme, cycle }) {
  const [visible, setVisible] = useState([]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setVisible([]);
    setTyping(false);
    if (!cycle) return;
    const timers = [];
    messages.forEach(msg => {
      if (msg.typingAt != null) {
        timers.push(setTimeout(() => setTyping(true), msg.typingAt));
      }
      timers.push(setTimeout(() => {
        setTyping(false);
        setVisible(prev => [...prev, msg]);
      }, msg.showAt));
    });
    return () => timers.forEach(clearTimeout);
  }, [cycle, messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [visible.length, typing]);

  return (
    <div style={{
      flex: 1, borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${borderColor}`,
      background: theme.bgCard,
      boxShadow: theme.isDark
        ? `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 ${borderColor}30`
        : `0 8px 32px rgba(0,0,0,0.06)`,
    }}>
      {/* Title bar */}
      <div style={{
        padding: '11px 16px',
        borderBottom: `1px solid ${theme.border}`,
        background: theme.bgSurface,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%', background: labelColor,
          boxShadow: `0 0 8px ${labelColor}60`,
        }} />
        <span style={{
          fontSize: 12, fontWeight: 700, color: labelColor,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {label}
        </span>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="lp-chat-scroll"
        style={{
          padding: 16, height: 265, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}
      >
        {visible.map((msg, i) => (
          <div
            key={`${cycle}-${i}`}
            style={{
              alignSelf: msg.role === 'student' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              animation: 'lp-msg-in 0.35s ease-out both',
            }}
          >
            <div style={{
              padding: '10px 14px', borderRadius: 14,
              fontSize: 13, lineHeight: 1.6,
              background: msg.role === 'student'
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              color: msg.role === 'student' ? '#fff' : theme.textBody,
              borderBottomRightRadius: msg.role === 'student' ? 4 : 14,
              borderBottomLeftRadius: msg.role === 'ai' ? 4 : 14,
            }}>
              {msg.text}
            </div>
            {msg.source && (
              <div style={{
                marginTop: 5, fontSize: 10, fontWeight: 600,
                color: theme.accent, opacity: 0.8,
                display: 'flex', alignItems: 'center', gap: 4,
                paddingLeft: 4,
              }}>
                <span style={{ fontSize: 9 }}>📄</span> {msg.source}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '12px 16px', borderRadius: 14, borderBottomLeftRadius: 4,
            background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            display: 'flex', gap: 5, alignItems: 'center',
            animation: 'lp-msg-in 0.2s ease-out both',
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: theme.textFaint,
                animation: `lp-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProblemSection({ theme, isMobile }) {
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [cycle, setCycle] = useState(0);

  // Combine scroll-reveal + in-view detection
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.classList.add('lp-visible');
        setInView(true);
      }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Start animation cycle when in view
  useEffect(() => {
    if (!inView) return;
    setCycle(1);
    const id = setInterval(() => setCycle(c => c + 1), 8500);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <section ref={containerRef} className="lp-reveal" style={{
      padding: isMobile ? '70px 20px' : '110px 40px',
      background: theme.bgBase,
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <SectionLabel text="The Difference" theme={theme} />
        <h2 style={{
          fontSize: isMobile ? 26 : 38, fontWeight: 700,
          color: theme.textPrimary, textAlign: 'center',
          marginBottom: 14, letterSpacing: '-0.02em',
        }}>
          Not another ChatGPT wrapper
        </h2>
        <p style={{
          textAlign: 'center', fontSize: 15, color: theme.textSecondary,
          maxWidth: 500, margin: '0 auto 48px',
        }}>
          See the difference in real time. Same question, fundamentally different approach.
        </p>

        <div style={{
          display: 'flex', gap: 20,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <MiniChat
            label="Generic AI"
            labelColor={theme.red.dot}
            borderColor={theme.red.border}
            messages={GENERIC_MSGS}
            theme={theme}
            cycle={cycle}
          />
          <MiniChat
            label="Maieutic"
            labelColor={theme.green.dot}
            borderColor={theme.green.border}
            messages={MAIEUTIC_MSGS}
            theme={theme}
            cycle={cycle}
          />
        </div>

        {/* Labels below */}
        <div style={{
          display: 'flex', gap: 20, marginTop: 16,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div style={{
            flex: 1, textAlign: 'center',
            fontSize: 13, color: theme.red.text, fontWeight: 600,
          }}>
            Gives the answer. You move on. You forget.
          </div>
          <div style={{
            flex: 1, textAlign: 'center',
            fontSize: 13, color: theme.green.text, fontWeight: 600,
          }}>
            Guides your thinking. You struggle. You understand.
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
          {/* Connecting gradient line (desktop only) */}
          {!isMobile && (
            <div style={{
              position: 'absolute', top: 25, left: '18%', right: '18%',
              height: 2, zIndex: 0,
              background: `linear-gradient(90deg, transparent, ${theme.accent}50, ${theme.accent}80, ${theme.accent}50, transparent)`,
              borderRadius: 1,
            }} />
          )}

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
                position: 'relative',
              }}>
                {step.num}
                {/* Outer ring pulse */}
                <div style={{
                  position: 'absolute', inset: -4, borderRadius: '50%',
                  border: `2px solid ${theme.accent}30`,
                }} />
              </div>
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
                e.currentTarget.style.boxShadow = `0 8px 32px ${theme.accent}18`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Gradient accent bar — revealed on hover */}
              <div className="lp-card-accent" style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
              }} />

              {/* Icon with background */}
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: theme.isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, marginBottom: 16,
              }}>
                {f.emoji}
              </div>
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
          marginTop: 36, padding: '14px 28px', borderRadius: 10,
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

/* ─── Stats Strip ─── */

function StatsStrip({ theme, isMobile }) {
  const ref = useRef(null);
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const animatedRef = useRef(false);

  const stats = [
    { target: 100, suffix: '%', label: 'Grounded in Your Materials' },
    { target: 6, suffix: '', label: 'AI-Powered Learning Tools' },
    { target: 0, suffix: '', label: 'Direct Answers Ever Given' },
    { target: 24, suffix: '/7', label: 'Always Available' },
  ];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !animatedRef.current) {
        animatedRef.current = true;
        const duration = 1400;
        let start = null;
        const tick = (ts) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / duration, 1);
          // ease-out cubic
          const ease = 1 - Math.pow(1 - p, 3);
          setCounts(stats.map(s => Math.round(ease * s.target)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{
      padding: isMobile ? '40px 20px' : '52px 40px',
      background: theme.bgSurface,
      borderTop: `1px solid ${theme.border}`,
      borderBottom: `1px solid ${theme.border}`,
    }}>
      <div style={{
        maxWidth: 900, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? 28 : 16,
        textAlign: 'center',
      }}>
        {stats.map((s, i) => (
          <div key={i}>
            <div style={{
              fontSize: isMobile ? 32 : 40, fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.1,
            }}>
              {counts[i]}{s.suffix}
            </div>
            <div style={{
              fontSize: 13, color: theme.textSecondary, fontWeight: 500,
              marginTop: 6,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── App Preview ─── */

function AppPreview({ theme, isMobile }) {
  const ref = useScrollReveal();

  return (
    <section ref={ref} className="lp-reveal" style={{
      padding: isMobile ? '70px 20px' : '110px 40px',
      background: theme.bgSurface,
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <SectionLabel text="See It In Action" theme={theme} />
        <h2 style={{
          fontSize: isMobile ? 26 : 38, fontWeight: 700,
          color: theme.textPrimary, textAlign: 'center',
          marginBottom: 14, letterSpacing: '-0.02em',
        }}>
          Your AI study workspace
        </h2>
        <p style={{
          textAlign: 'center', fontSize: 15, color: theme.textSecondary,
          maxWidth: 480, margin: '0 auto 44px',
        }}>
          Upload materials on the left. Chat with your Socratic tutor in the center.
          Track mastery on the right.
        </p>

        {/* Browser window mockup */}
        <div style={{
          borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${theme.border}`,
          boxShadow: theme.isDark
            ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)'
            : '0 20px 60px rgba(0,0,0,0.12)',
          background: theme.bgCard,
        }}>
          {/* Title bar */}
          <div style={{
            padding: '10px 16px',
            background: theme.bgSurface,
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {/* Traffic light dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: '50%', background: c,
                  opacity: 0.85,
                }} />
              ))}
            </div>
            {/* URL bar */}
            <div style={{
              flex: 1, marginLeft: 12,
              padding: '5px 14px', borderRadius: 6,
              background: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              fontSize: 11, color: theme.textFaint, fontFamily: 'monospace',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ opacity: 0.5 }}>🔒</span>
              ai-professor-office-hours-simulator.vercel.app
            </div>
          </div>

          {/* Screenshot — switches with theme */}
          <img
            src={theme.isDark ? appPreviewDark : appPreviewLight}
            alt="Maieutic app — Socratic chat with course materials"
            style={{
              display: 'block', width: '100%', height: 'auto',
            }}
          />
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
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.accent}10 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
      <StatsStrip theme={theme} isMobile={isMobile} />
      <ProblemSection theme={theme} isMobile={isMobile} />
      <HowItWorks theme={theme} isMobile={isMobile} />
      <FeaturesGrid theme={theme} isMobile={isMobile} />
      <AppPreview theme={theme} isMobile={isMobile} />
      <PhilosophySection theme={theme} isMobile={isMobile} />
      <FinalCTA theme={theme} onGetStarted={onGetStarted} isMobile={isMobile} />
      <Footer theme={theme} isMobile={isMobile} />
    </div>
  );
}
