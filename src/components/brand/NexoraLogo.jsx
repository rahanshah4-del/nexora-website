import { memo, useMemo, useState } from 'react'
import logoUrl from '../../assets/logo/nexora-logo.png'

const SIZE_MAP = {
  // xs fits the fixed 56px site header with breathing room top/bottom
  xs: { icon: 'h-10 w-10', imageSize: 40, title: 'text-sm tracking-[0.18em]', sub: 'text-[0.65rem] tracking-[0.2em]' },
  sm: { icon: 'h-12 w-12', imageSize: 48, title: 'text-sm tracking-[0.18em]', sub: 'text-[0.65rem] tracking-[0.2em]' },
  md: { icon: 'h-14 w-14', imageSize: 56, title: 'text-sm tracking-[0.18em]', sub: 'text-[0.65rem] tracking-[0.2em]' },
  lg: { icon: 'h-16 w-16', imageSize: 64, title: 'text-xl tracking-[0.22em]', sub: 'text-[0.7rem] tracking-[0.22em]' },
  xl: { icon: 'h-20 w-20', imageSize: 80, title: 'text-2xl tracking-[0.22em]', sub: 'text-xs tracking-[0.24em]' },
}

function NexoraLogo({ className = '', compact = false, size, hideText = false, invert = false, iconClassName = '', textClassName = '' }) {
  const [loadError, setLoadError] = useState(false)
  const resolved = useMemo(() => SIZE_MAP[size] || (compact ? SIZE_MAP.sm : SIZE_MAP.md), [size, compact])
  const titleColor = invert ? 'text-white' : 'text-slate-950'
  const subColor = invert ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* No frame/background — the logo art already carries its own rounded tile + transparent corners */}
      <div className={`flex shrink-0 items-center justify-center ${resolved.icon}`}>
        {!loadError ? (
          <img
            src={logoUrl}
            alt="Nexora Solution software company logo"
            width={resolved.imageSize}
            height={resolved.imageSize}
            decoding="async"
            fetchpriority="high"
            className={`h-full w-full object-contain ${iconClassName}`}
            onError={() => setLoadError(true)}
          />
        ) : (
          <span className="grid h-full w-full place-items-center rounded-2xl bg-slate-950 text-lg font-bold uppercase tracking-[0.18em] text-white">N</span>
        )}
      </div>
      {!hideText && (
        <div className={`min-w-0 ${textClassName}`}>
          <p className={`truncate font-black uppercase ${resolved.title} ${titleColor}`}>NEXORA SOLUTION</p>
          <p className={`truncate uppercase ${resolved.sub} ${subColor}`}>
            Software & Systems Studio
          </p>
        </div>
      )}
    </div>
  )
}

export default memo(NexoraLogo)