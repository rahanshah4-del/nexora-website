import { useEffect, useId, useRef, useState } from 'react'
import { formatMoney, getDocumentType } from '../../engine/index.js'
import { resolveLayout } from '../../templates/specs.js'
import { useFitScale } from '../../ui/hooks.js'
import { RESULT_ACTIONS, comingNext, useResultActions } from '../../ui/resultActions.js'
import { useStudio } from '../../ui/StudioContext.js'
import Icon from '../Icon.jsx'
import Menu from '../Menu.jsx'
import { Paper } from '../Preview.jsx'
import ScaledPaper, { MM_TO_PX } from '../ScaledPaper.jsx'
import QuickEditPanel from './QuickEditPanel.jsx'

function ActionButton({ action, handler, variant = 'bar' }) {
  const { commands, pdfBusy } = useStudio()
  const live = Boolean(handler)
  const busy = action.id === 'pdf' && pdfBusy
  const onClick = live ? handler : () => comingNext(commands.toast, action)
  const icon = busy
    ? <span className={`ds-spinner ${variant === 'bar' && action.primary ? '' : 'ds-spinner--brand'} ${variant === 'bar' ? 'h-[18px] w-[18px]' : 'h-5 w-5'}`} aria-hidden="true" />
    : <Icon name={action.icon} className={variant === 'bar' ? 'h-[18px] w-[18px]' : 'h-5 w-5'} />
  if (variant === 'bar') {
    const primary = action.primary
    return (
      <button
        type="button"
        onClick={onClick}
        aria-disabled={live ? undefined : true}
        aria-busy={busy || undefined}
        data-action={action.id}
        title={live ? action.label : `${action.label} — coming next`}
        className={`relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
          primary
            ? live ? 'bg-brand text-white shadow-sm hover:bg-brand-deep' : 'bg-blue-50 text-brand/70 ring-1 ring-blue-100'
            : live ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-50'
        }`}
      >
        {icon}
        <span className="hidden xl:inline">{action.label}</span>
        <span className="xl:hidden">{action.short || action.label}</span>
        {live ? null : <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-slate-500">Soon</span>}
      </button>
    )
  }
  // Mobile bottom bar / sheet: icon over label, ≥ 44 px targets.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={live ? undefined : true}
      aria-busy={busy || undefined}
      data-action={action.id}
      className={`relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${live ? 'text-slate-700 active:bg-slate-100' : 'text-slate-400'}`}
    >
      {icon}
      <span className="max-w-full truncate">{action.short || action.label}</span>
      {live ? null : <span className="absolute right-1 top-1 rounded-full bg-slate-100 px-1 text-[9px] font-bold uppercase text-slate-500">Soon</span>}
    </button>
  )
}

function OverflowMenu() {
  const { commands, setView, setWizardStep, setDocumentsOpen } = useStudio()
  const [recent, setRecent] = useState([])
  const items = [
    { key: 'new', label: 'New document', icon: 'plus', onSelect: () => commands.newDocument() },
    ...(recent.length ? [
      { heading: 'Open recent' },
      ...recent.slice(0, 5).map((r) => ({ key: `open-${r.id}`, label: `${r.number || getDocumentType(r.type)?.label || 'Untitled'}${r.clientName ? ` · ${r.clientName}` : ''}`, icon: r.type, hint: formatMoney(r.total_minor, r.currency, 'en'), onSelect: () => commands.openDocument(r.id) })),
    ] : []),
    { key: 'all-documents', label: 'All documents…', icon: 'folder', keepFocus: true, onSelect: () => setDocumentsOpen(true) },
    { separator: true },
    { key: 'business', label: 'Edit business details', icon: 'building', onSelect: () => { setWizardStep(1); setView('wizard') } },
    { key: 'advanced', label: 'Advanced editor', icon: 'sliders', onSelect: () => setView('advanced') },
    { separator: true },
    { key: 'export', label: 'Export JSON backup', icon: 'download', onSelect: commands.exportBackup },
  ]
  return (
    <Menu
      label="More actions"
      buttonClassName="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      buttonContent={<Icon name="dots" className="h-5 w-5" />}
      items={items}
      onOpen={() => { commands.listRecent().then((list) => setRecent(list.slice(0, 8))).catch(() => {}) }}
      menuClassName="w-72"
    />
  )
}

/** Sticky bar (lg+): every action; live ones enabled, the rest "Soon". */
function ActionBar({ onQuickEdit, panelOpen }) {
  const handlers = useResultActions()
  return (
    <div className="sticky top-14 z-30 hidden border-b border-slate-200/80 bg-white/90 backdrop-blur-xl lg:block" data-testid="action-bar">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-1 px-6">
        {RESULT_ACTIONS.map((action) => <ActionButton key={action.id} action={action} handler={handlers[action.id]} />)}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onQuickEdit}
          aria-pressed={panelOpen}
          className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${panelOpen ? 'bg-blue-50 text-brand' : 'text-slate-700 hover:bg-slate-100'}`}
          data-testid="quick-edit-toggle"
        >
          <Icon name="sliders" className="h-[18px] w-[18px]" />Quick edit
        </button>
        <OverflowMenu />
      </div>
    </div>
  )
}

/** Mobile: fixed bottom bar with the main actions and a "More" sheet for the rest. */
function MobileActions({ onQuickEdit }) {
  const handlers = useResultActions()
  const { commands, setView, setDocumentsOpen } = useStudio()
  const [sheet, setSheet] = useState(false)
  const sheetId = useId()
  const main = ['pdf', 'print', 'whatsapp', 'edit'].map((id) => RESULT_ACTIONS.find((a) => a.id === id))
  const rest = RESULT_ACTIONS.filter((a) => !main.includes(a))
  useEffect(() => {
    if (!sheet) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setSheet(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])
  const sheetItem = 'flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'
  return (
    <>
      <nav aria-label="Document actions" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden" data-testid="mobile-actions">
        <div className="mx-auto flex max-w-lg items-stretch gap-1">
          {main.map((action) => <ActionButton key={action.id} action={action} handler={handlers[action.id]} variant="tab" />)}
          <button type="button" onClick={() => setSheet(true)} aria-expanded={sheet} aria-controls={sheetId} className="flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <Icon name="dots" className="h-5 w-5" />More
          </button>
        </div>
      </nav>
      {sheet ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button type="button" aria-label="Close" className="absolute inset-0 h-full w-full cursor-default bg-black/40" onClick={() => setSheet(false)} tabIndex={-1} />
          <div id={sheetId} role="dialog" aria-modal="true" aria-label="More actions" className="ds-pop absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lift">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200" aria-hidden="true" />
            {rest.map((action) => {
              const handler = handlers[action.id]
              return (
                <button key={action.id} type="button" data-action={action.id} aria-disabled={handler ? undefined : true} className={`${sheetItem} ${handler ? '' : 'text-slate-400'}`} onClick={() => { setSheet(false); (handler || (() => comingNext(commands.toast, action)))() }}>
                  <Icon name={action.icon} className="h-5 w-5" />{action.label}{handler ? null : <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">Soon</span>}
                </button>
              )
            })}
            <div className="my-2 h-px bg-slate-100" />
            <button type="button" className={sheetItem} onClick={() => { setSheet(false); onQuickEdit() }}><Icon name="sliders" className="h-5 w-5" />Quick edit</button>
            <button type="button" className={sheetItem} onClick={() => { setSheet(false); commands.newDocument() }}><Icon name="plus" className="h-5 w-5" />New document</button>
            <button type="button" className={sheetItem} onClick={() => { setSheet(false); setDocumentsOpen(true) }}><Icon name="folder" className="h-5 w-5" />Open recent</button>
            <button type="button" className={sheetItem} onClick={() => { setSheet(false); setView('advanced') }}><Icon name="layout" className="h-5 w-5" />Advanced editor</button>
          </div>
        </div>
      ) : null}
    </>
  )
}

/** Large, centred, correctly scaled paper. */
function ResultPaper() {
  const { previewDocument } = useStudio()
  const { paper, kind } = resolveLayout(previewDocument)
  const widthPx = paper.widthMm * MM_TO_PX
  const [ref, scale] = useFitScale(widthPx, { max: kind === 'receipt' ? 1.4 : 1 })
  return (
    <div ref={ref} className="w-full" data-testid="result-paper">
      {scale > 0 ? (
        <ScaledPaper scale={scale} widthPx={widthPx} estimatedHeightPx={(paper.heightMm || paper.widthMm * 2) * MM_TO_PX} className="mx-auto" paperClassName="rounded-sm shadow-lift">
          <Paper />
        </ScaledPaper>
      ) : null}
    </div>
  )
}

export default function ResultView() {
  const { doc, totals } = useStudio()
  const headingRef = useRef(null)
  const [panelOpen, setPanelOpen] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1280px)').matches)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const config = getDocumentType(doc.type)
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }) }, [])
  const openQuickEdit = () => {
    if (window.matchMedia?.('(min-width: 1024px)').matches) setPanelOpen((v) => !v)
    else setDrawerOpen(true)
  }
  const client = doc.client.company || doc.client.name
  return (
    <div className="pb-28 lg:pb-12" data-testid="result-view">
      <ActionBar onQuickEdit={openQuickEdit} panelOpen={panelOpen} />
      <div className={`mx-auto grid max-w-[1500px] gap-6 px-3 pt-5 sm:px-4 lg:px-6 lg:pt-6 ${panelOpen ? 'lg:grid-cols-[minmax(0,1fr)_24rem]' : ''}`}>
        <section aria-labelledby="ds-result-title" className="min-w-0">
          <div className="mx-auto mb-4 flex max-w-[794px] flex-wrap items-end justify-between gap-2 px-1">
            <div className="min-w-0">
              <h2 id="ds-result-title" ref={headingRef} tabIndex={-1} className="font-display text-xl font-semibold text-slate-900 focus:outline-none sm:text-2xl">
                Your {config.label.toLowerCase()} is ready
              </h2>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {[doc.number, client, config.features.pricing ? formatMoney(totals.total, doc.currency, doc.locale) : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button type="button" onClick={openQuickEdit} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 lg:hidden" data-testid="quick-edit-open">
              <Icon name="sliders" className="h-4 w-4" />Quick edit
            </button>
          </div>
          <ResultPaper />
        </section>
        {panelOpen ? (
          <div className="hidden lg:block">
            <div className="sticky top-[8.5rem] max-h-[calc(100dvh-9.5rem)] overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-card">
              <QuickEditPanel onClose={() => setPanelOpen(false)} />
            </div>
          </div>
        ) : null}
      </div>
      <MobileActions onQuickEdit={() => setDrawerOpen(true)} />
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button type="button" aria-label="Close quick edit" tabIndex={-1} className="absolute inset-0 h-full w-full cursor-default bg-black/5" onClick={() => setDrawerOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Quick edit" className="ds-pop absolute inset-x-0 bottom-0 max-h-[72dvh] overflow-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-lift">
            <QuickEditPanel onClose={() => setDrawerOpen(false)} drawer />
          </div>
        </div>
      ) : null}
    </div>
  )
}
