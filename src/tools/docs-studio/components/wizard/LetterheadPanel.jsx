import { useId, useRef, useState } from 'react'
import { LETTERHEAD_LIMITS } from '../../engine/index.js'
import { ACCEPTED_LETTERHEAD_TYPES } from '../../io/letterhead.js'
import DocumentPaper from '../../templates/DocumentPaper.jsx'
import { PAPERS } from '../../templates/specs.js'
import { useFitScale } from '../../ui/hooks.js'
import { asCreated } from '../../ui/starter.js'
import { useStudio } from '../../ui/StudioContext.js'
import { Segmented, Toggle } from '../fields.jsx'
import Icon from '../Icon.jsx'
import LetterheadFitNotice from '../LetterheadFitNotice.jsx'
import ScaledPaper, { MM_TO_PX } from '../ScaledPaper.jsx'

/**
 * Upload zone for a letterhead (PNG, JPG, or PDF — first page). `highlight`:
 * the letterhead page's starting point, drawn as the step's focal point.
 */
export function LetterheadDrop({ compact = false, highlight = false }) {
  const { commands, letterheadBusy } = useStudio()
  const [dragging, setDragging] = useState(false)
  const upload = (file) => { if (file) commands.uploadLetterhead(file) }
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files?.[0]) }}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-center transition-colors ${compact ? 'p-4' : 'p-6 sm:p-8'} ${dragging ? 'border-brand bg-blue-50' : highlight ? 'border-brand/60 bg-blue-50/70 ring-4 ring-brand/10' : 'border-slate-200 bg-slate-50'}`}
      aria-busy={letterheadBusy || undefined}
      data-highlight={highlight || undefined}
    >
      {highlight ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Start here: upload your letterhead</p> : null}
      <span className="flex h-[48px] w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-sm ring-1 ring-slate-200">
        {letterheadBusy ? <span className="ds-spinner ds-spinner--brand h-5 w-5" aria-hidden="true" /> : <Icon name="letterhead" className="h-6 w-6" />}
      </span>
      <div>
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand/40 hover:bg-slate-50">
          <Icon name="upload" className="h-4 w-4" />
          {letterheadBusy ? 'Preparing your letterhead…' : 'Upload letterhead'}
          <input type="file" accept={ACCEPTED_LETTERHEAD_TYPES} className="sr-only" disabled={letterheadBusy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} data-testid="letterhead-input" />
        </label>
        <p className="mt-2 text-xs text-slate-500">PNG, JPG or PDF (first page), up to 10 MB. It stays in this browser.</p>
      </div>
    </div>
  )
}

const GUIDES = [
  { key: 'topMm', label: 'Top', axis: 'y', sign: 1 },
  { key: 'bottomMm', label: 'Bottom', axis: 'y', sign: -1 },
  { key: 'leftMm', label: 'Left', axis: 'x', sign: 1 },
  { key: 'rightMm', label: 'Right', axis: 'x', sign: -1 },
]

const clampMm = (key, value) => {
  const [min, max] = LETTERHEAD_LIMITS[key]
  return Math.round(Math.min(max, Math.max(min, value)) * 2) / 2
}

/**
 * Draggable safe-area guides over the first page, in the paper's own (unscaled)
 * coordinates. Each guide is a keyboard-operable slider (arrows ±1 mm, Shift ±5).
 */
function Guides({ letterhead, paper, scale, onChange }) {
  const drag = useRef(null)
  const hit = 44 / scale // ≥ 44 px touch target at any zoom
  const pos = (g) => {
    const v = letterhead[g.key]
    if (g.key === 'bottomMm') return paper.heightMm - v
    if (g.key === 'rightMm') return paper.widthMm - v
    return v
  }
  const onPointerDown = (g) => (event) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drag.current = { g, start: g.axis === 'y' ? event.clientY : event.clientX, value: letterhead[g.key] }
  }
  const onPointerMove = (event) => {
    const d = drag.current
    if (!d) return
    const deltaMm = ((d.g.axis === 'y' ? event.clientY : event.clientX) - d.start) / scale / MM_TO_PX
    onChange({ [d.g.key]: clampMm(d.g.key, d.value + d.g.sign * deltaMm) })
  }
  const onPointerUp = () => { drag.current = null }
  const onKeyDown = (g) => (event) => {
    const step = event.shiftKey ? 5 : 1
    const forward = g.axis === 'y' ? ['ArrowDown', 'ArrowRight'] : ['ArrowRight', 'ArrowDown']
    const back = g.axis === 'y' ? ['ArrowUp', 'ArrowLeft'] : ['ArrowLeft', 'ArrowUp']
    let next = null
    if (forward.includes(event.key)) next = letterhead[g.key] + g.sign * step
    else if (back.includes(event.key)) next = letterhead[g.key] - g.sign * step
    else if (event.key === 'Home') next = LETTERHEAD_LIMITS[g.key][0]
    else if (event.key === 'End') next = LETTERHEAD_LIMITS[g.key][1]
    if (next === null) return
    event.preventDefault()
    onChange({ [g.key]: clampMm(g.key, next) })
  }
  const { topMm, bottomMm, leftMm, rightMm } = letterhead
  return (
    <div className="ds-guides" style={{ height: `${paper.heightMm}mm` }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      {/* Shaded margins outside the safe area */}
      <div className="ds-guides-shade" style={{ top: 0, left: 0, right: 0, height: `${topMm}mm` }} />
      <div className="ds-guides-shade" style={{ bottom: 0, left: 0, right: 0, height: `${bottomMm}mm` }} />
      <div className="ds-guides-shade" style={{ top: `${topMm}mm`, bottom: `${bottomMm}mm`, left: 0, width: `${leftMm}mm` }} />
      <div className="ds-guides-shade" style={{ top: `${topMm}mm`, bottom: `${bottomMm}mm`, right: 0, width: `${rightMm}mm` }} />
      {GUIDES.map((g) => {
        const [min, max] = LETTERHEAD_LIMITS[g.key]
        const horizontal = g.axis === 'y'
        const at = `${pos(g)}mm`
        return (
          <div
            key={g.key}
            role="slider"
            tabIndex={0}
            aria-label={`${g.label} safe margin`}
            aria-orientation={horizontal ? 'vertical' : 'horizontal'}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={letterhead[g.key]}
            aria-valuetext={`${letterhead[g.key]} mm`}
            data-guide={g.key}
            onPointerDown={onPointerDown(g)}
            onKeyDown={onKeyDown(g)}
            className={`ds-guide ${horizontal ? 'ds-guide--h' : 'ds-guide--v'}`}
            style={horizontal ? { top: at, height: `${hit}px` } : { left: at, width: `${hit}px` }}
          >
            <span className="ds-guide-line" />
            {horizontal ? (
              <span className="ds-guide-chip" style={{ transform: `translate(-50%, -50%) scale(${1 / scale})` }}>{g.label} · {letterhead[g.key]} mm</span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function MmInput({ label, value, name, onChange }) {
  const id = useId()
  const [min, max] = LETTERHEAD_LIMITS[name]
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step="0.5"
          value={value}
          onChange={(e) => { if (e.target.value !== '') onChange({ [name]: clampMm(name, Number(e.target.value)) }) }}
          className="block h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-right text-base tabular-nums text-slate-900 shadow-sm focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:text-sm"
          data-analytics-ignore
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400" aria-hidden="true">mm</span>
      </div>
    </div>
  )
}

/** Letterhead preview (with guides) and settings. */
export default function LetterheadPanel() {
  const { doc, previewDocument, totals, logoUrl, letterheadUrl, amountInWords, actions, commands } = useStudio()
  const letterhead = doc.appearance.letterhead
  const paper = PAPERS[doc.appearance.paperSize]?.kind === 'page' ? PAPERS[doc.appearance.paperSize] : PAPERS.A4
  const paperDoc = { ...asCreated(previewDocument), appearance: { ...previewDocument.appearance, paperSize: paper.id } }
  const widthPx = paper.widthMm * MM_TO_PX
  const [ref, scale] = useFitScale(widthPx, { max: 0.62 })
  if (!letterhead) return null
  const set = (patch) => actions.setLetterhead(patch)
  return (
    <div className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
      <div ref={ref} className="min-w-0" data-testid="letterhead-preview">
        <p className="mb-2 text-xs text-slate-500">Drag the blue lines to keep your text clear of the letterhead’s header and footer.</p>
        <div className="mb-2"><LetterheadFitNotice /></div>
        {scale > 0 ? (
          <ScaledPaper scale={scale} widthPx={widthPx} estimatedHeightPx={paper.heightMm * MM_TO_PX} className="mx-auto" paperClassName="rounded-sm shadow-lift">
            <div className="relative">
              <DocumentPaper doc={paperDoc} totals={totals} logoUrl={logoUrl} letterheadUrl={letterheadUrl} amountWords={amountInWords} />
              <Guides letterhead={letterhead} paper={paper} scale={scale} onChange={set} />
            </div>
          </ScaledPaper>
        ) : null}
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">Safe area</p>
          <p className="text-xs text-slate-500">Space kept free at each edge.</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <MmInput label="Top" name="topMm" value={letterhead.topMm} onChange={set} />
            <MmInput label="Bottom" name="bottomMm" value={letterhead.bottomMm} onChange={set} />
            <MmInput label="Left" name="leftMm" value={letterhead.leftMm} onChange={set} />
            <MmInput label="Right" name="rightMm" value={letterhead.rightMm} onChange={set} />
          </div>
        </div>
        <Toggle
          label="Hide my business header block"
          description="Your letterhead already shows your name and address."
          checked={letterhead.hideBusinessHeader}
          onChange={(v) => set({ hideBusinessHeader: v })}
        />
        <Segmented
          label="Use the letterhead on"
          size="sm"
          value={letterhead.pages}
          onChange={(v) => set({ pages: v })}
          options={[{ value: 'all', label: 'All pages' }, { value: 'first', label: 'First page only' }]}
        />
        <Toggle
          label="My paper is already printed"
          description="For pre-printed letterhead stationery: the preview keeps the letterhead for positioning, but printing and the PDF leave it out."
          checked={letterhead.preprinted}
          onChange={(v) => set({ preprinted: v })}
        />
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-brand shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand/40 hover:bg-slate-50">
            <Icon name="upload" className="h-4 w-4" />Replace
            <input type="file" accept={ACCEPTED_LETTERHEAD_TYPES} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) commands.uploadLetterhead(f); e.target.value = '' }} />
          </label>
          <button type="button" onClick={commands.removeLetterhead} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
            <Icon name="trash" className="h-4 w-4" />Remove
          </button>
        </div>
        {letterhead.pdfAssetId ? <p className="text-xs text-slate-500">PDF letterhead: shown here from its first page; the original file is kept for sharper PDF downloads.</p> : null}
      </div>
    </div>
  )
}
