import { useRef, useEffect, useState } from 'react';

/**
 * ElectronIcon — atom logo with 3 electrons on tilted elliptical orbits.
 *
 * Props:
 *   size    number  — rendered width/height (default 20)
 *   color   string  — stroke/fill color (default '#a78bfa')
 *   animate boolean — when true, electrons orbit along their elliptical paths
 */

const ORBITS = [
  { tilt: 0,   phase: 0 },
  { tilt: 60,  phase: 1 / 3 },
  { tilt: 120, phase: 2 / 3 },
];

const DURATION = 2.4; // seconds per revolution

function electronPositions(elapsed) {
  return ORBITS.map(({ tilt, phase }) => {
    const angle = ((elapsed / DURATION) + phase) * 2 * Math.PI;
    const rad = tilt * Math.PI / 180;
    // Position on un-tilted horizontal ellipse (rx=38, ry=14)
    const ex = 38 * Math.cos(angle);
    const ey = 14 * Math.sin(angle);
    // Rotate by orbit tilt, then translate to center (50, 50)
    return {
      cx: ex * Math.cos(rad) - ey * Math.sin(rad) + 50,
      cy: ex * Math.sin(rad) + ey * Math.cos(rad) + 50,
    };
  });
}

export function ElectronIcon({ size = 20, color = '#a78bfa', animate = false }) {
  const [positions, setPositions] = useState(() => electronPositions(0));
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!animate) {
      setPositions(electronPositions(0));
      return;
    }

    const tick = (ts) => {
      if (startRef.current === null) startRef.current = ts;
      setPositions(electronPositions((ts - startRef.current) / 1000));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [animate]);

  return (
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

      {/* Orbits + electrons */}
      {ORBITS.map(({ tilt }, i) => (
        <g key={i}>
          <ellipse
            cx="50" cy="50" rx="38" ry="14"
            stroke={color} strokeWidth="2.5" fill="none"
            transform={`rotate(${tilt} 50 50)`}
          />
          <circle
            cx={positions[i].cx}
            cy={positions[i].cy}
            r="5"
            fill={color}
          />
        </g>
      ))}
    </svg>
  );
}
