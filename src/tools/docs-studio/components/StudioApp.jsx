import { useEffect } from 'react'
import { StudioContext, useStudio } from '../ui/StudioContext.js'
import { useStudioController } from '../ui/useStudioController.js'
import EditorSections from './EditorSections.jsx'
import Icon from './Icon.jsx'
import { ConfirmDialog, DocumentsDialog, Toasts } from './Overlays.jsx'
import { PreviewPane, PrintPortal } from './Preview.jsx'
import Toolbar from './Toolbar.jsx'
import TotalsPanel from './TotalsPanel.jsx'

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

export default function StudioApp({ boot }) {
  const studio = useStudioController(boot)
  // See studio.css: lets the sticky toolbar / preview / totals actually stick.
  useEffect(() => {
    document.documentElement.classList.add('ds-tool-page')
    return () => document.documentElement.classList.remove('ds-tool-page')
  }, [])
  const { mobileView } = studio
  return (
    <StudioContext.Provider value={studio}>
      <div className={`ds-studio bg-slate-50 ${mobileView === 'edit' ? 'pb-24' : 'pb-6'} lg:pb-10`} data-analytics-ignore>
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
        <PrintPortal />
        <Toasts />
        <ConfirmDialog />
        <DocumentsDialog />
      </div>
    </StudioContext.Provider>
  )
}
