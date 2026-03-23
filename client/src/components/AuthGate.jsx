import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { ElectronIcon } from './ElectronIcon';

const AUTH_STYLES = `
  @keyframes auth-gradient {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes auth-pulse {
    0%, 100% { opacity: 0.08; transform: scale(1); }
    50%      { opacity: 0.18; transform: scale(1.05); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .auth-btn {
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  }
  .auth-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(99, 102, 241, 0.35);
    filter: brightness(1.08);
  }
  .auth-input {
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .auth-input:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    outline: none;
  }
`;

export function AuthGate({ children, session, loading, initialMode = 'signin', onBackToLanding }) {
  const { signIn, signUp } = useAuth();
  const { theme } = useTheme();
  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: theme.bgBase,
      }}>
        <div style={{
          width: 28, height: 28,
          border: '2px solid #6366f1', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <style>{AUTH_STYLES}</style>
      </div>
    );
  }

  if (session) return children;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(mode);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setSignupSuccess(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  }

  const bgGradient = theme.isDark
    ? 'linear-gradient(135deg, #0f1117 0%, #1a1640 40%, #1e1b4b 70%, #251e52 100%)'
    : 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 40%, #e0e7ff 70%, #ddd6fe 100%)';

  const cardBg = theme.isDark
    ? 'rgba(30, 32, 48, 0.65)'
    : 'rgba(255, 255, 255, 0.7)';

  const successAlert = theme.isDark
    ? { bg: '#052e16', border: '#166534', color: '#4ade80' }
    : { bg: '#f0fdf4', border: '#86efac', color: '#166534' };

  const errorAlert = theme.isDark
    ? { bg: '#450a0a', border: '#7f1d1d', color: '#fca5a5' }
    : { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' };

  const logoBg = theme.isDark
    ? 'linear-gradient(135deg, #1e1b4b, #312e81)'
    : 'linear-gradient(135deg, #e0e7ff, #c7d2fe)';

  const logoBorder = theme.isDark ? '#4c1d95' : '#a5b4fc';
  const electronColor = theme.isDark ? '#a78bfa' : '#6366f1';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: bgGradient,
      backgroundSize: '200% 200%',
      animation: 'auth-gradient 12s ease infinite',
      padding: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{AUTH_STYLES}</style>

      {/* Decorative glow orbs */}
      <div style={{
        position: 'absolute', left: '10%', top: '20%',
        width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.isDark ? '#6366f118' : '#6366f110'} 0%, transparent 65%)`,
        animation: 'auth-pulse 6s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: '10%', bottom: '15%',
        width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.isDark ? '#8b5cf618' : '#8b5cf610'} 0%, transparent 65%)`,
        animation: 'auth-pulse 8s ease-in-out infinite',
        animationDelay: '-3s',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32,
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: logoBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${logoBorder}`,
        }}>
          <ElectronIcon size={28} color={electronColor} animate />
        </div>
        <div>
          <div style={{
            fontSize: 22, fontWeight: 700, color: theme.textPrimary,
            letterSpacing: '-0.02em',
          }}>
            Maieutic
          </div>
          <div style={{
            fontSize: 13, color: theme.textSecondary, fontWeight: 500,
          }}>
            Socratic tutor grounded in your course materials
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: cardBg,
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 20, padding: '36px 32px',
        display: 'flex', flexDirection: 'column', gap: 22,
        position: 'relative', zIndex: 1,
        boxShadow: theme.isDark
          ? '0 8px 40px rgba(0,0,0,0.4)'
          : '0 8px 40px rgba(99,102,241,0.08)',
      }}>
        {/* Title */}
        <div>
          <h2 style={{
            margin: 0, fontSize: 22, fontWeight: 700, color: theme.textPrimary,
            letterSpacing: '-0.01em',
          }}>
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: theme.textSecondary }}>
            {mode === 'signin'
              ? 'Sign in to pick up where you left off.'
              : 'Your courses and progress are saved to your account.'}
          </p>
        </div>

        {/* Sign-up confirmation */}
        {signupSuccess && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: successAlert.bg, border: `1px solid ${successAlert.border}`,
            fontSize: 13, color: successAlert.color, lineHeight: 1.5,
            fontWeight: 500,
          }}>
            ✓ Account created! Check your email to confirm, then sign in.
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: errorAlert.bg, border: `1px solid ${errorAlert.border}`,
            fontSize: 13, color: errorAlert.color,
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, letterSpacing: '0.02em' }}>
              Email
            </label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              style={{
                padding: '11px 14px', borderRadius: 10,
                background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                color: theme.textPrimary, fontSize: 14, outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, letterSpacing: '0.02em' }}>
              Password
            </label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={{
                padding: '11px 14px', borderRadius: 10,
                background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                color: theme.textPrimary, fontSize: 14, outline: 'none',
              }}
            />
          </div>

          <button
            className="auth-btn"
            type="submit"
            disabled={!!submitting}
            style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: submitting ? '#312e81' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 4,
            }}
          >
            {submitting ? (
              <>
                <div style={{
                  width: 14, height: 14,
                  border: '2px solid #fff', borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
              </>
            ) : (
              mode === 'signin' ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, height: 1, background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
          <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500 }}>
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <div style={{ flex: 1, height: 1, background: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
        </div>

        {/* Toggle */}
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setSignupSuccess(false); }}
          style={{
            padding: '10px', borderRadius: 10,
            background: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            color: theme.accentLight,
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => {
            e.target.style.borderColor = '#6366f1';
            e.target.style.background = theme.isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)';
          }}
          onMouseLeave={e => {
            e.target.style.borderColor = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
            e.target.style.background = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
          }}
        >
          {mode === 'signin' ? 'Create account' : 'Sign in'}
        </button>
      </div>

      {/* Back to landing */}
      {onBackToLanding && (
        <button
          onClick={onBackToLanding}
          style={{
            marginTop: 24, background: 'none', border: 'none',
            color: theme.textMuted, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color 0.2s',
            position: 'relative', zIndex: 1,
            fontWeight: 500,
          }}
          onMouseEnter={e => e.target.style.color = theme.textSecondary}
          onMouseLeave={e => e.target.style.color = theme.textMuted}
        >
          ← Back to home
        </button>
      )}
    </div>
  );
}
