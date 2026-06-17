import { useState } from 'react'
import logoUrl from '../../assets/logo/nexora-logo.svg'

const SIZE_MAP = {
  sm: { icon: 'h-11 w-11', title: 'text-sm tracking-[0.18em]', sub: 'text-[0.65rem] tracking-[0.2em]' },
  md: { icon: 'h-14 w-14', title: 'text-sm tracking-[0.18em]', sub: 'text-[0.65rem] tracking-[0.2em]' },
  lg: { icon: 'h-16 w-16', title: 'text-xl tracking-[0.22em]', sub: 'text-[0.7rem] tracking-[0.22em]' },
  xl: { icon: 'h-20 w-20', title: 'text-2xl tracking-[0.22em]', sub: 'text-xs tracking-[0.24em]' },
}

export default function NexoraLogo({ className = '', compact = false, size, hideText = false, invert = false, iconClassName = '', textClassName = '' }) {
  const [loadError, setLoadError] = useState(false)
  const resolved = SIZE_MAP[size] || (compact ? SIZE_MAP.sm : SIZE_MAP.md)
  const titleColor = invert ? 'text-white' : 'text-slate-950'
  const subColor = invert ? 'text-slate-400' : 'text-slate-500'
  const iconBorder = invert ? 'border-white/15' : 'border-slate-200'

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-3xl border ${iconBorder} bg-slate-950 p-2 text-white shadow-sm ${resolved.icon}`}>
        {!loadError ? (
          <img
            src={logoUrl}
            alt="Nexora logo"
            className={`h-full w-full object-contain ${iconClassName}`}
            onError={() => setLoadError(true)}
          />
        ) : (
          <span className="text-lg font-bold uppercase tracking-[0.18em]">N</span>
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
