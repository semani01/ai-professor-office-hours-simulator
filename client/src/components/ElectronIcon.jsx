/**
 * ElectronIcon — purple electron SVG matching the app theme.
 *
 * Props:
 *   size    number  — rendered width/height (default 20)
 *   color   string  — stroke/fill color (default '#a78bfa')
 *   animate boolean — when true, all 3 electron dots spin around their orbits
 */
export function ElectronIcon({ size = 20, color = '#a78bfa', animate = false }) {
  return (
    <>
      <style>{`
        @keyframes ei-orbit1 {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes ei-orbit2 {
          from { transform: rotate(60deg);  }
          to   { transform: rotate(420deg); }
        }
        @keyframes ei-orbit3 {
          from { transform: rotate(120deg); }
          to   { transform: rotate(480deg); }
        }
      `}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', flexShrink: 0 }}
      >
        {/* Nucleus */}
        <circle cx="50" cy="50" r="7" fill={color} />

        {/* Orbit 1 — horizontal */}
        <ellipse cx="50" cy="50" rx="38" ry="14"
          stroke={color} strokeWidth="4.5" fill="none" />
        {/* Electron on orbit 1 — rotates 0° to 360° */}
        <g style={{
          transformOrigin: '50px 50px',
          ...(animate && { animation: 'ei-orbit1 1.4s linear infinite' }),
        }}>
          <circle cx="88" cy="50" r="6" fill={color} />
        </g>

        {/* Orbit 2 — visual 60° rotation */}
        <ellipse cx="50" cy="50" rx="38" ry="14"
          stroke={color} strokeWidth="4.5" fill="none"
          transform="rotate(60 50 50)" />
        {/* Electron on orbit 2 — starts at 60° and rotates to 420° (60° + 360°) */}
        <g style={{
          transformOrigin: '50px 50px',
          ...(animate && { animation: 'ei-orbit2 1.4s linear infinite' }),
        }}>
          <circle cx="88" cy="50" r="6" fill={color} />
        </g>

        {/* Orbit 3 — visual 120° rotation */}
        <ellipse cx="50" cy="50" rx="38" ry="14"
          stroke={color} strokeWidth="4.5" fill="none"
          transform="rotate(120 50 50)" />
        {/* Electron on orbit 3 — starts at 120° and rotates to 480° (120° + 360°) */}
        <g style={{
          transformOrigin: '50px 50px',
          ...(animate && { animation: 'ei-orbit3 1.4s linear infinite' }),
        }}>
          <circle cx="88" cy="50" r="6" fill={color} />
        </g>
      </svg>
    </>
  );
}
