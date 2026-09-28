import { useEffect, useLayoutEffect, useRef } from 'react'
import { THERMAL_PAPER_SIZES } from '../engine/index.js'
import { StudioContext, useStudio } from '../ui/StudioContext.js'
import { useStudioController } from '../ui/useStudioController.js'
import CreationStage from './CreationStage.jsx'
import EditorSections from './EditorSections.jsx'
import Icon from './Icon.jsx'
import { ConfirmDialog, DocumentsDialog, Toasts } from './Overlays.jsx'
import { PreviewPane, PrintPortal } from './Preview.jsx'
import Toolbar from './Toolbar.jsx'
import TotalsPanel from './TotalsPanel.jsx'
import ResultView from './result/ResultView.jsx'
import Wizard from './wizard/Wizard.jsx'

function Banners() {
  const { storageFallback, isSample, commands } = useStudio()
  if (!storageFallback && !isSample) return null
  return (
    <div className="mx-auto max-w-[1600px] space-y-2 px-3 pt-3 sm:px-4 lg:px-6">
      {storageFallback ? (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Icon name="cloudOff" className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">Your browser isn’t saving data — export a backup before leaving.</span>
          <button type="button" onClick={commands.exportBackup} className="rounded-lg px-2 py-1 font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">Export backup</button>
        </div>
      ) : null}
      {isSample ? (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/20 bg-blue-50 px-3 py-2 text-sm text-slate-700">
          <Icon name="sparkles" className="h-4 w-4 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">This is sample data – <strong className="font-semibold">Clear</strong> to start fresh.</span>
          <button type="button" onClick={commands.startFresh} className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-brand shadow-sm ring-1 ring-brand/20 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">Clear</button>
          <button type="button" onClick={commands.dismissSample} aria-label="Keep the sample and dismiss this message" className="rounded-lg p-1 text-slate-500 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"><Icon name="x" className="h-4 w-4" /></button>
        </div>
      ) : null}
    </div>
  )
}

/** The full editor (every field + live preview), reachable from the result screen. */
function AdvancedEditor() {
  const { mobileView } = useStudio()
  return (
    <>
      <Toolbar />
      <Banners />
      <div className="mx-auto max-w-[1600px] px-3 pt-4 sm:px-4 lg:grid lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-6 lg:px-6">
        <div className={`${mobileView === 'edit' ? '' : 'hidden'} min-w-0 lg:block`}>
          <EditorSections />
          <TotalsPanel />
        </div>
        <div className={`${mobileView === 'preview' ? '' : 'hidden'} min-w-0 lg:sticky lg:top-[7.5rem] lg:flex lg:max-h-[calc(100dvh-8.5rem)] lg:flex-col lg:self-start`}>
          <PreviewPane />
        </div>
      </div>
    </>
  )
}

/**
 * Keeps the document's thermal paper in step with a switch outside the editor
 * (the thermal receipt page's 58/80 mm toggle), in both directions. The first
 * run only reports: a resumed 58 mm receipt must not be reset to the page's 80.
 */
function usePaperSync(studio, paperSize, onPaperSizeChange) {
  const { doc, actions } = studio
  const current = doc.appearance.paperSize
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (paperSize && paperSize !== current) actions.setAppearance({ paperSize })
    // Only an outside change should move the document's paper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperSize])
  useEffect(() => {
    if (THERMAL_PAPER_SIZES.includes(current)) onPaperSizeChange?.(current)
  }, [current, onPaperSizeChange])
}

export default function StudioApp({ boot, paperSize, onPaperSizeChange }) {
  const studio = useStudioController(boot)
  usePaperSync(studio, paperSize, onPaperSizeChange)
  // See studio.css: lets the sticky toolbar / preview / totals actually stick.
  useEffect(() => {
    document.documentElement.classList.add('ds-tool-page')
    return () => document.documentElement.classList.remove('ds-tool-page')
  }, [])
  const { view, mobileView } = studio
  // Switching views (wizard → creating → result → advanced) swaps content of
  // very different heights: bring the top of the tool into view, otherwise a
  // phone that tapped "Create" at the bottom of step 3 is left in the footer.
  const rootRef = useRef(null)
  const firstView = useRef(true)
  useLayoutEffect(() => {
    if (firstView.current) {
      firstView.current = false
      return
    }
    const top = rootRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) window.scrollTo({ top: window.scrollY + top - 64, behavior: 'instant' })
  }, [view])
  const padding = view === 'advanced' ? `${mobileView === 'edit' ? 'pb-24' : 'pb-6'} lg:pb-10` : ''
  return (
    <StudioContext.Provider value={studio}>
      <div ref={rootRef} className={`ds-studio ds-${view === 'creating' ? 'wizard' : view} bg-slate-50 ${padding}`} data-view={view} data-analytics-ignore>
        {view === 'wizard' ? <Wizard /> : null}
        {view === 'creating' ? <CreationStage /> : null}
        {view === 'result' ? <ResultView /> : null}
        {view === 'advanced' ? <AdvancedEditor /> : null}
        <PrintPortal />
        <Toasts />
        <ConfirmDialog />
        <DocumentsDialog />
      </div>
    </StudioContext.Provider>
  )
}
