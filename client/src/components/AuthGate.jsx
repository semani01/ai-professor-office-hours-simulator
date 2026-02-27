import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

export function AuthGate({ children, session, loading }) {
  const { signIn, signUp } = useAuth();
  const { theme } = useTheme();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: theme.bgBase,
      padding: 24,
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>🎓</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary, letterSpacing: '-0.01em' }}>
            AI Professor Office Hours
          </div>
          <div style={{ fontSize: 12, color: theme.textFaint }}>Socratic tutor grounded in your course materials</div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 400,
        background: theme.bgCard, border: `1px solid ${theme.border}`,
        borderRadius: 16, padding: 32,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Title */}
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: theme.textPrimary }}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: theme.textMuted }}>
            {mode === 'signin'
              ? 'Welcome back — pick up where you left off.'
              : 'Your courses and progress are saved to your account.'}
          </p>
        </div>

        {/* Sign-up confirmation */}
        {signupSuccess && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: '#052e16', border: '1px solid #166534',
            fontSize: 13, color: '#4ade80', lineHeight: 1.5,
          }}>
            ✓ Account created! Check your email to confirm, then sign in.
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: '#450a0a', border: '1px solid #7f1d1d',
            fontSize: 13, color: '#fca5a5',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: theme.textSecondary }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              style={{
                padding: '10px 14px', borderRadius: 8,
                background: theme.bgInputField, border: `1px solid ${theme.border}`,
                color: theme.textPrimary, fontSize: 14, outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = theme.border}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: theme.textSecondary }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={{
                padding: '10px 14px', borderRadius: 8,
                background: theme.bgInputField, border: `1px solid ${theme.border}`,
                color: theme.textPrimary, fontSize: 14, outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = theme.border}
            />
          </div>

          <button
            type="submit"
            disabled={!!submitting}
            style={{
              padding: '11px', borderRadius: 8, border: 'none',
              background: submitting ? '#312e81' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s',
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

        {/* Toggle */}
        <div style={{ textAlign: 'center', fontSize: 13, color: theme.textFaint }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setSignupSuccess(false); }}
            style={{
              background: 'none', border: 'none', color: theme.accentLight,
              cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0,
            }}
          >
            {mode === 'signin' ? 'Create account' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
