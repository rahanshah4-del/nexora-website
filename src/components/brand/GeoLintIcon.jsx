import { useId } from 'react'

/**
 * GeoLint's own full-colour mark (the free tools use single-colour line icons,
 * so this one stands apart): an indigo-to-violet glass tile with a radar, an
 * emerald sweep, three coloured "crawler" nodes and a gold spark. `animated`
 * turns on the slow sweep (CSS in index.css, off under prefers-reduced-motion).
 */
export default function GeoLintIcon({ size = 36, animated = false, className = '' }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const id = (name) => `gli-${name}-${uid}`
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id('tile')} x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4338ca" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
        <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('sweep')} cx="24" cy="24" r="15" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#34d399" stopOpacity="0.15" />
          <stop offset="1" stopColor="#6ee7b7" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id={id('spark')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <clipPath id={id('clip')}><rect x="1" y="1" width="46" height="46" rx="13" /></clipPath>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill={`url(#${id('tile')})`} />
      <g clipPath={`url(#${id('clip')})`}>
        <circle cx="40" cy="6" r="18" fill="#22d3ee" opacity="0.28" />
        <rect x="1" y="1" width="46" height="24" fill={`url(#${id('gloss')})`} />
      </g>
      <rect x="1.5" y="1.5" width="45" height="45" rx="12.5" fill="none" stroke="#fff" strokeOpacity="0.28" />
      {/* radar rings */}
      <circle cx="24" cy="24" r="15" fill="#0b1226" fillOpacity="0.28" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.3" />
      <circle cx="24" cy="24" r="9.5" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="24" cy="24" r="4.2" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1" />
      {/* sweep wedge */}
      <g className={animated ? 'gl-icon-sweep' : undefined}>
        <path d="M24 24 L24 9 A15 15 0 0 1 37 16.5 Z" fill={`url(#${id('sweep')})`} />
        <path d="M24 24 L24 9" stroke="#a7f3d0" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <circle cx="24" cy="24" r="2.6" fill="#fff" />
      {/* crawler nodes */}
      <circle cx="13.6" cy="30.2" r="2.2" fill="#fbbf24" stroke="#fff" strokeWidth="1" />
      <circle cx="33.2" cy="31.6" r="2.2" fill="#22d3ee" stroke="#fff" strokeWidth="1" />
      <circle cx="31.6" cy="14.8" r="2" fill="#f472b6" stroke="#fff" strokeWidth="1" />
      {/* spark */}
      <path d="M38.5 3.2l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z" fill={`url(#${id('spark')})`} stroke="#fff" strokeWidth="0.6" strokeOpacity="0.8" />
    </svg>
  )
}
