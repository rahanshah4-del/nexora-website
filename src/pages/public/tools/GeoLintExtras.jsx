import { useState } from 'react'
import { geoBadgeUrl } from '../../../lib/geolint.js'
import { GEOLINT_PATH } from '../../../lib/geolintLaunch.js'
import { badgeEmbed } from '../../../lib/geolintSite.js'

const SITE = 'https://nexorasolution.online'

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { setCopied(false) }
  }
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <span className="text-[12px] font-medium text-slate-300">{label}</span>
        <button type="button" onClick={copy} className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-5 text-slate-100"><code>{value}</code></pre>
    </div>
  )
}

/** Shareable score badge: image preview plus HTML and Markdown embed code. */
export function BadgePanel({ report }) {
  const imageUrl = geoBadgeUrl(report?.id)
  const [broken, setBroken] = useState(false)
  if (!imageUrl) return null
  const earned = report?.score?.earned
  const max = report?.score?.evaluatedMax
  const score = max > 0 ? Math.round((earned / max) * 100) : 0
  const code = badgeEmbed({ imageUrl, toolUrl: `${SITE}${GEOLINT_PATH}/`, score })
  return (
    <div className="gl-card p-5">
      {broken ? (
        <p className="text-[14px] leading-6 text-slate-600">The badge is not available for this report right now. Run the audit again to get a fresh one.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <img src={imageUrl} alt={`GeoLint AI-readiness score ${score}/100`} height="22" className="h-[22px]" onError={() => setBroken(true)} />
            <p className="text-[13.5px] leading-6 text-slate-600">It shows the score of this audit and links to GeoLint. It is drawn from the saved audit, so the number cannot be changed by hand.</p>
          </div>
          <CopyField label="HTML" value={code.html} />
          <CopyField label="Markdown" value={code.markdown} />
          <p className="mt-3 text-[12.5px] leading-5 text-slate-500">The badge stays up while the audit is stored (90 days). Run a new audit and swap the code to show a newer score.</p>
        </>
      )}
    </div>
  )
}
