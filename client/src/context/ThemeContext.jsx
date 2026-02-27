import { createContext, useContext, useEffect, useState } from 'react';

export const darkTheme = {
  // Backgrounds
  bgBase:       '#0f1117',
  bgSurface:    '#0d1117',
  bgCard:       '#111827',
  bgInput:      '#111827',
  bgInputField: '#0f1117',
  bgHover:      '#1a2035',

  // Borders
  border:       '#1e293b',
  borderStrong: '#334155',

  // Text
  textPrimary:  '#f1f5f9',
  textSecondary:'#94a3b8',
  textMuted:    '#64748b',
  textFaint:    '#475569',
  textBody:     '#cbd5e1',
  textBodyAlt:  '#e2e8f0',

  // Accent (indigo — same in both themes)
  accent:       '#6366f1',
  accentLight:  '#818cf8',
  accentBg:     '#1e1b4b',
  accentBorder: '#312e81',

  // Source type badges (same in both themes — strong semantic colors)
  lecture:    { bg: '#1e1b4b', text: '#818cf8', border: '#312e81' },
  notes:      { bg: '#052e16', text: '#4ade80', border: '#14532d' },
  assignment: { bg: '#431407', text: '#fb923c', border: '#7c2d12' },
  syllabus:   { bg: '#2e1065', text: '#c084fc', border: '#4c1d95' },
  material:   { bg: '#1e293b', text: '#94a3b8', border: '#334155' },

  // Topic tiers
  green:  { bg: '#052e16', border: '#166534', text: '#4ade80', dot: '#22c55e', meta: '#86efac', label: 'Demonstrated' },
  yellow: { bg: '#1c1400', border: '#854d0e', text: '#fbbf24', dot: '#f59e0b', meta: '#fde68a', label: 'Needs Review' },
  red:    { bg: '#2d0a0a', border: '#7f1d1d', text: '#f87171', dot: '#ef4444', meta: '#fca5a5', label: 'Revisit' },

  // Misc
  scrollbar:    '#334155',
  isDark:       true,
};

export const lightTheme = {
  // Backgrounds
  bgBase:       '#f8fafc',
  bgSurface:    '#f1f5f9',
  bgCard:       '#ffffff',
  bgInput:      '#ffffff',
  bgInputField: '#f8fafc',
  bgHover:      '#e8eef8',

  // Borders
  border:       '#e2e8f0',
  borderStrong: '#cbd5e1',

  // Text
  textPrimary:  '#0f172a',
  textSecondary:'#475569',
  textMuted:    '#64748b',
  textFaint:    '#94a3b8',
  textBody:     '#334155',
  textBodyAlt:  '#1e293b',

  // Accent
  accent:       '#6366f1',
  accentLight:  '#4f46e5',
  accentBg:     '#eef2ff',
  accentBorder: '#c7d2fe',

  // Source type badges
  lecture:    { bg: '#eef2ff', text: '#4f46e5', border: '#c7d2fe' },
  notes:      { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  assignment: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  syllabus:   { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff' },
  material:   { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },

  // Topic tiers
  green:  { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', dot: '#22c55e', meta: '#15803d', label: 'Demonstrated' },
  yellow: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', dot: '#f59e0b', meta: '#92400e', label: 'Needs Review' },
  red:    { bg: '#fff1f2', border: '#fecdd3', text: '#dc2626', dot: '#ef4444', meta: '#9f1239', label: 'Revisit' },

  // Misc
  scrollbar:    '#cbd5e1',
  isDark:       false,
};

const ThemeContext = createContext({ theme: darkTheme, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // default dark
  });

  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    // Apply CSS variables for global styles (body bg, scrollbar)
    document.documentElement.style.setProperty('--bg-base', theme.bgBase);
    document.documentElement.style.setProperty('--text-body', theme.textBodyAlt);
    document.documentElement.style.setProperty('--scrollbar', theme.scrollbar);
    document.documentElement.style.setProperty('--prose-strong', theme.textPrimary);
    document.documentElement.style.setProperty('--prose-em', theme.textSecondary);
    document.documentElement.style.setProperty('--prose-blockquote', theme.textSecondary);
    document.documentElement.style.setProperty('--prose-code-bg', theme.border);
    document.body.style.background = theme.bgBase;
    document.body.style.color = theme.textBodyAlt;
  }, [theme]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
