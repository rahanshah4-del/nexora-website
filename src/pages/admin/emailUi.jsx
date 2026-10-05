// Small pieces shared by the Email Marketing screens.

const BADGE_COLORS = {
  completed: 'bg-emerald-50 text-emerald-700',
  sending: 'bg-amber-50 text-amber-700',
  queued: 'bg-blue-50 text-blue-700',
  sent: 'bg-slate-100 text-slate-700',
  delivered: 'bg-sky-50 text-sky-700',
  opened: 'bg-emerald-50 text-emerald-700',
  clicked: 'bg-violet-50 text-violet-700',
  bounced: 'bg-rose-50 text-rose-700',
  complained: 'bg-rose-50 text-rose-700',
  skipped: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-500',
  failed: 'bg-rose-50 text-rose-700',
  draft: 'bg-slate-100 text-slate-600',
  subscribed: 'bg-emerald-50 text-emerald-700',
  unsubscribed: 'bg-rose-50 text-rose-700',
}

export function StatusBadge({ status }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>{status || '—'}</span>
}

/** Fill the per-person placeholders so the preview looks like the real email. */
function previewHtml(html) {
  return String(html || '').replaceAll('{{name}}', 'Ahmed').replaceAll('{{unsubscribe}}', '#')
}

export function EmailPreview({ html, height = 560 }) {
  if (!html) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
      <p className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Preview</p>
      <iframe title="Email preview" sandbox="" srcDoc={previewHtml(html)} style={{ height }} className="w-full rounded-lg border-0 bg-white" />
    </div>
  )
}
