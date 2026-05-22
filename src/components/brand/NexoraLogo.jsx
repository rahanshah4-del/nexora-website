import { useState } from 'react'
import logoUrl from '../../assets/logo/nexora-logo.svg'

export default function NexoraLogo({ className = '', compact = false, hideText = false, iconClassName = '', textClassName = '' }) {
  const [loadError, setLoadError] = useState(false)
  const iconSize = compact ? 'h-11 w-11' : 'h-14 w-14'

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-2 text-white shadow-sm ${iconSize}`}>
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
          <p className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-slate-950">NEXORA</p>
          <p className="truncate text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
            Software & Systems Studio
          </p>
        </div>
      )}
    </div>
  )
}
