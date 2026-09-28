import { useRef, useState } from 'react'
import { DOCUMENT_TYPE_IDS, formatMoney, getDocumentType } from '../engine/index.js'
import { statusLabel } from '../templates/summary.js'
import { RESULT_ACTIONS, comingNext, useResultActions } from '../ui/resultActions.js'
import { useStudio } from '../ui/StudioContext.js'
import { Segmented } from './fields.jsx'
import Icon from './Icon.jsx'
import Menu from './Menu.jsx'

const toolButton = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:px-3'

const STATUS_TONES = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-sky-50 text-sky-700',
  issued: 'bg-sky-50 text-sky-700',
  dispatched: 'bg-sky-50 text-sky-700',
  partially_paid: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  applied: 'bg-emerald-50 text-emerald-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  received: 'bg-emerald-50 text-emerald-700',
  converted: 'bg-violet-50 text-violet-700',
  closed: 'bg-slate-100 text-slate-700',
  overdue: 'bg-rose-50 text-rose-700',
  void: 'bg-rose-50 text-rose-700',
  declined: 'bg-rose-50 text-rose-700',
  expired: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-rose-50 text-rose-700',
}

function TypeSwitcher() {
  const { doc, commands } = useStudio()
  const config = getDocumentType(doc.type)
  return (
    <Menu
      label="Document type"
      align="left"
      buttonClassName={`${toolButton} border border-slate-200 bg-white shadow-sm`}
      buttonContent={<><Icon name={doc.type} className="h-[18px] w-[18px] text-brand" /><span className="max-w-[8.5rem] truncate">{config.label}</span><Icon name="chevronDown" className="h-4 w-4 text-slate-400" /></>}
      items={[
        { heading: 'Switch this document to' },
        ...DOCUMENT_TYPE_IDS.map((type) => ({ key: type, label: getDocumentType(type).label, icon: type, active: type === doc.type, onSelect: () => commands.switchType(type) })),
      ]}
    />
  )
}

function StatusPill() {
  const { doc, actions } = useStudio()
  const config = getDocumentType(doc.type)
  return (
    <Menu
      label={`Status: ${statusLabel(doc.status)}`}
      align="left"
      menuClassName="w-48"
      buttonClassName={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${STATUS_TONES[doc.status] || STATUS_TONES.draft}`}
      buttonContent={<>{statusLabel(doc.status)}<Icon name="chevronDown" className="h-3 w-3" /></>}
      items={config.statuses.map((s) => ({ key: s, label: statusLabel(s), active: s === doc.status, onSelect: () => actions.set('status', s) }))}
    />
  )
}

function SaveIndicator() {
  const { saveState, storageKind } = useStudio()
  if (storageKind === 'memory') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600" title="Your browser isn't saving data"><Icon name="cloudOff" className="h-4 w-4" /><span className="hidden sm:inline">Not stored</span></span>
  }
  if (saveState === 'error') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600" role="status"><Icon name="alert" className="h-4 w-4" /><span className="hidden sm:inline">Not saved</span></span>
  }
  const saving = saveState === 'saving'
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500" role="status" aria-live="polite">
      {saving ? <span className="ds-pulse h-2 w-2 rounded-full bg-brand" aria-hidden="true" /> : <Icon name="check" className="h-4 w-4 text-emerald-600" />}
      <span className="hidden sm:inline">{saving ? 'Saving…' : 'Saved'}</span>
      <span className="sr-only sm:hidden">{saving ? 'Saving' : 'Saved'}</span>
    </span>
  )
}

function IssuesBadge() {
  const { issues, scrollToFirstIssue } = useStudio()
  if (!issues.length) return null
  const errors = issues.filter((i) => i.severity === 'error').length
  return (
    <button
      type="button"
      onClick={scrollToFirstIssue}
      aria-label={`${issues.length} issue${issues.length === 1 ? '' : 's'} — go to the first one`}
      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${errors ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
    >
      <Icon name="alert" className="h-3.5 w-3.5" />
      {issues.length}<span className="hidden sm:inline"> issue{issues.length === 1 ? '' : 's'}</span>
    </button>
  )
}

function MoreMenu() {
  const { doc, totals, commands, setDocumentsOpen } = useStudio()
  const fileRef = useRef(null)
  const [recent, setRecent] = useState([])
  const conversions = commands.conversionTargets()
  const items = [
    { heading: 'New document' },
    ...DOCUMENT_TYPE_IDS.map((type) => ({ key: `new-${type}`, label: getDocumentType(type).label, icon: type, onSelect: () => commands.newDocument(type) })),
    { separator: true },
    { key: 'duplicate', label: 'Duplicate', icon: 'copy', onSelect: commands.duplicate },
    ...(doc.type === 'invoice' && doc.status !== 'paid' && totals.balanceDue > 0 ? [{ key: 'mark-paid', label: 'Mark as paid', icon: 'check', onSelect: commands.markAsPaid }] : []),
    { heading: 'Convert to…' },
    ...(conversions.length
      ? conversions.map((type) => ({ key: `convert-${type}`, label: getDocumentType(type).label, icon: type, onSelect: () => commands.convertTo(type) }))
      : [{ key: 'convert-none', label: 'No conversions for this type', disabled: true }]),
    ...(recent.length ? [
      { separator: true },
      { heading: 'Open recent' },
      ...recent.slice(0, 5).map((r) => ({ key: `open-${r.id}`, label: `${r.number || getDocumentType(r.type)?.label || 'Untitled'}${r.clientName ? ` · ${r.clientName}` : ''}`, icon: r.type, hint: formatMoney(r.total_minor, r.currency, 'en'), onSelect: () => commands.openDocument(r.id) })),
      { key: 'all-documents', label: 'All documents…', icon: 'folder', keepFocus: true, onSelect: () => setDocumentsOpen(true) },
    ] : []),
    { separator: true },
    { key: 'export', label: 'Export JSON backup', icon: 'download', onSelect: commands.exportBackup },
    { key: 'import', label: 'Import JSON…', icon: 'upload', keepFocus: true, onSelect: () => fileRef.current?.click() },
    { separator: true },
    { key: 'clear', label: 'Clear all data', icon: 'trash', danger: true, onSelect: commands.requestClearAll },
  ]
  return (
    <>
      <Menu
        label="More actions"
        buttonClassName={`${toolButton} w-10 px-0 sm:w-10 sm:px-0`}
        buttonContent={<Icon name="dots" className="h-5 w-5" />}
        items={items}
        onOpen={() => { commands.listRecent().then((list) => setRecent(list.slice(0, 8))).catch(() => {}) }}
        menuClassName="w-72"
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) commands.importFile(file) }}
      />
    </>
  )
}

function QuickAction() {
  const { doc, totals, commands } = useStudio()
  const quick = 'hidden h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 md:inline-flex'
  if (doc.type === 'quotation' && doc.status === 'accepted') {
    return <button type="button" onClick={() => commands.convertTo('invoice')} className={`${quick} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}><Icon name="invoice" className="h-3.5 w-3.5" />Create invoice</button>
  }
  if (doc.type === 'invoice' && doc.status !== 'paid' && doc.status !== 'void' && totals.balanceDue > 0) {
    return <button type="button" onClick={commands.markAsPaid} className={`${quick} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}><Icon name="check" className="h-3.5 w-3.5 text-emerald-600" />Mark as paid</button>
  }
  return null
}

export default function Toolbar() {
  const { doc, commands, mobileView, setMobileView, pdfBusy, setView } = useStudio()
  // Same PDF action as the result screen: "coming next" until Step 3B wires it up.
  const pdfAction = RESULT_ACTIONS.find((a) => a.id === 'pdf')
  const pdfHandler = useResultActions().pdf || (() => comingNext(commands.toast, pdfAction))
  return (
    <div className="ds-toolbar sticky top-14 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl" data-analytics-ignore>
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-1.5 px-3 sm:gap-2 sm:px-4 lg:px-6">
        <button type="button" onClick={() => setView('result')} className={`${toolButton} border border-slate-200 bg-white shadow-sm`} data-testid="advanced-done">
          <Icon name="arrowLeft" className="h-[18px] w-[18px]" /><span className="hidden sm:inline">Done</span><span className="sr-only sm:hidden">Done — back to the preview</span>
        </button>
        <TypeSwitcher />
        <p className="hidden min-w-0 truncate text-sm font-semibold tabular-nums text-slate-500 md:block" title="Document number">{doc.number || '—'}</p>
        <div className="hidden sm:block"><StatusPill /></div>
        <IssuesBadge />
        <QuickAction />
        <div className="min-w-0 flex-1" />
        <SaveIndicator />
        <button type="button" onClick={commands.print} className={toolButton} aria-label="Print (Ctrl+P)" title="Print (Ctrl+P)">
          <Icon name="printer" className="h-[18px] w-[18px]" /><span className="hidden md:inline">Print</span>
        </button>
        <button
          type="button"
          onClick={pdfHandler}
          aria-busy={pdfBusy || undefined}
          disabled={pdfBusy}
          data-testid="download-pdf"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80 sm:px-3.5"
        >
          {pdfBusy ? <span className="ds-spinner h-[18px] w-[18px]" aria-hidden="true" /> : <Icon name="download" className="h-[18px] w-[18px]" />}
          <span className="hidden sm:inline">{pdfBusy ? 'Creating PDF…' : 'Download PDF'}</span>
          <span className="sr-only sm:hidden">{pdfBusy ? 'Creating PDF' : 'Download PDF'}</span>
        </button>
        <MoreMenu />
      </div>
      <div className="px-3 pb-2 sm:px-4 lg:hidden">
        <Segmented
          label="View"
          srOnlyLabel
          value={mobileView}
          onChange={setMobileView}
          options={[{ value: 'edit', label: 'Edit', icon: 'pencil' }, { value: 'preview', label: 'Preview', icon: 'eye' }]}
        />
      </div>
    </div>
  )
}
