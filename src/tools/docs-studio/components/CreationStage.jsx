import { useCallback, useEffect, useRef, useState } from 'react'
import { getDocumentType } from '../engine/index.js'
import DocumentPaper from '../templates/DocumentPaper.jsx'
import { resolveLayout } from '../templates/specs.js'
import { useFitScale, usePrefersReducedMotion } from '../ui/hooks.js'
import { useStudio } from '../ui/StudioContext.js'
import ScaledPaper, { MM_TO_PX } from './ScaledPaper.jsx'

// Timeline (ms): the paper appears, sections build in (studio.css .ds-build),
// a shimmer passes, it settles, "Ready!", then the result screen.
const READY_AT = 1250
const DONE_AT = 1600

/**
 * The short "creating" moment between the wizard and the result. Skippable
 * (button, click, Escape); with reduced motion it goes straight to the result.
 */
export default function CreationStage() {
  const { previewDocument, totals, logoUrl, letterheadUrl, amountInWords, setView } = useStudio()
  const reduced = usePrefersReducedMotion()
  const [phase, setPhase] = useState('building')
  const skipRef = useRef(null)
  const { paper } = resolveLayout(previewDocument)
  const widthPx = paper.widthMm * MM_TO_PX
  const heightPx = (paper.heightMm || paper.widthMm * 2.2) * MM_TO_PX
  const maxHeight = typeof window === 'undefined' ? 700 : Math.max(320, window.innerHeight * 0.66)
  const [fitRef, scale] = useFitScale(widthPx, { max: 0.8, heightPx, maxHeightPx: maxHeight })
  const label = getDocumentType(previewDocument.type).label.toLowerCase()

  const finish = useCallback(() => setView('result'), [setView])

  useEffect(() => {
    if (reduced) {
      finish()
      return undefined
    }
    skipRef.current?.focus({ preventScroll: true })
    const ready = setTimeout(() => setPhase('ready'), READY_AT)
    const done = setTimeout(finish, DONE_AT)
    const onKey = (event) => { if (event.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(ready)
      clearTimeout(done)
      window.removeEventListener('keydown', onKey)
    }
  }, [reduced, finish])

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-12 pt-8 sm:pt-10" data-testid="creation-stage">
      <p role="status" aria-live="polite" className="font-display text-lg font-semibold text-slate-900 sm:text-xl">
        {phase === 'ready' ? 'Ready!' : `Creating your ${label}…`}
      </p>
      <button ref={skipRef} type="button" onClick={finish} className="mt-1 min-h-[44px] rounded-lg px-3 text-sm font-semibold text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        Skip
      </button>
      <div ref={fitRef} className="mt-4 flex w-full justify-center" onClick={finish} aria-hidden="true">
        {scale > 0 ? (
          <ScaledPaper
            scale={scale}
            widthPx={widthPx}
            estimatedHeightPx={heightPx}
            className="ds-build-frame"
            paperClassName={`ds-build rounded-sm shadow-lift ${phase === 'ready' ? 'ds-build-ready' : ''}`}
          >
            <DocumentPaper doc={previewDocument} totals={totals} logoUrl={logoUrl} letterheadUrl={letterheadUrl} amountWords={amountInWords} />
          </ScaledPaper>
        ) : null}
      </div>
    </div>
  )
}
