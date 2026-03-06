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
        @keyframes ei-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
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

        {/* Orbit 1 — horizontal (0°) */}
        <ellipse cx="50" cy="50" rx="38" ry="14"
          stroke={color} strokeWidth="4.5" fill="none" />
        <g transform="rotate(0 50 50)">
          <g style={{
            transformOrigin: '50px 50px',
            ...(animate && { animation: 'ei-spin 2.4s linear infinite' }),
          }}>
            <circle cx="88" cy="50" r="6" fill={color} />
          </g>
        </g>

        {/* Orbit 2 — tilted 60° */}
        <ellipse cx="50" cy="50" rx="38" ry="14"
          stroke={color} strokeWidth="4.5" fill="none"
          transform="rotate(60 50 50)" />
        <g transform="rotate(60 50 50)">
          <g style={{
            transformOrigin: '50px 50px',
            ...(animate && { animation: 'ei-spin 2.4s linear infinite', animationDelay: '-0.8s' }),
          }}>
            <circle cx="88" cy="50" r="6" fill={color} />
          </g>
        </g>

        {/* Orbit 3 — tilted 120° */}
        <ellipse cx="50" cy="50" rx="38" ry="14"
          stroke={color} strokeWidth="4.5" fill="none"
          transform="rotate(120 50 50)" />
        <g transform="rotate(120 50 50)">
          <g style={{
            transformOrigin: '50px 50px',
            ...(animate && { animation: 'ei-spin 2.4s linear infinite', animationDelay: '-1.6s' }),
          }}>
            <circle cx="88" cy="50" r="6" fill={color} />
          </g>
        </g>
      </svg>
    </>
  );
}
