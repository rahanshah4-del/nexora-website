import { useId } from 'react'

/**
 * Temp Mail's own full-colour mark: a sky-to-indigo glass tile with an envelope. `animated` plays the
 * "sending" loop: a letter slides up out of the envelope while small speed lines fly past (CSS in
 * index.css, switched off under prefers-reduced-motion).
 */
export default function TempMailIcon({ size = 36, animated = false, className = '' }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const id = (name) => `tmi-${name}-${uid}`
  const a = (name) => (animated ? name : undefined)
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id('tile')} x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0ea5e9" />
          <stop offset="0.55" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
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
        {/* speed lines */}
        <g stroke="#fff" strokeLinecap="round" strokeWidth="1.8">
          <line className={a('tm-icon-line tm-icon-line-1')} x1="4" y1="23" x2="10" y2="23" strokeOpacity={animated ? 0 : 0.5} />
          <line className={a('tm-icon-line tm-icon-line-2')} x1="3" y1="29" x2="9" y2="29" strokeOpacity={animated ? 0 : 0.5} />
          <line className={a('tm-icon-line tm-icon-line-3')} x1="5" y1="35" x2="10" y2="35" strokeOpacity={animated ? 0 : 0.5} />
        </g>
      </g>
      <rect x="1.5" y="1.5" width="45" height="45" rx="12.5" fill="none" stroke="#fff" strokeOpacity="0.28" />
      <g className={a('tm-icon-env')}>
        {/* envelope back */}
        <rect x="11" y="18" width="28" height="19" rx="3.2" fill="#bae6fd" />
        {/* letter */}
        <g className={a('tm-icon-letter')}>
          <rect x="15.5" y="13" width="19" height="15" rx="2" fill="#fff" stroke="#c7d2fe" strokeWidth="0.8" />
          <line x1="18.5" y1="17.5" x2="31.5" y2="17.5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="18.5" y1="21.5" x2="28" y2="21.5" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        {/* envelope front pocket */}
        <path d="M11 21.2 L24 30.4 L39 21.2 V33.8 a3.2 3.2 0 0 1 -3.2 3.2 H14.2 A3.2 3.2 0 0 1 11 33.8 Z" fill="#fff" />
        <path d="M11.6 21.4 L24 30 L38.4 21.4" fill="none" stroke="#818cf8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* spark */}
      <path className={a('tm-icon-spark')} d="M38.5 3.2l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z" fill={`url(#${id('spark')})`} stroke="#fff" strokeWidth="0.6" strokeOpacity="0.8" />
    </svg>
  )
}
