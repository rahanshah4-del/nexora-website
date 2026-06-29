import { HiOutlineArrowRight, HiOutlineCreditCard } from 'react-icons/hi2'

function upgradeStatusValue(request = {}) {
  const safe = request || {}
  return String(safe.approvalStatus || safe.status || safe.paymentStatus || 'pending').toLowerCase()
}

function upgradeTimelineSteps(request = {}) {
  const status = upgradeStatusValue(request)
  const rejected = ['rejected', 'declined', 'failed'].includes(status)
  const approved = ['approved', 'paid', 'active', 'completed'].includes(status)
  const reviewing = ['under_review', 'reviewing', 'in_review'].includes(status) || request.reviewOpenedAt
  return [
    { key: 'submitted', label: 'Submitted', done: true },
    { key: 'review', label: 'Nexora Review', done: reviewing || approved || rejected, active: !approved && !rejected && reviewing },
    { key: 'decision', label: rejected ? 'Rejected' : 'Approved', done: approved || rejected, active: rejected, rejected },
    { key: 'updated', label: 'Workspace Updated', done: approved, active: approved },
  ]
}

function isResolvedStatus(value = '') {
  return ['resolved', 'completed', 'closed'].includes(String(value || '').toLowerCase())
}

export default function UpgradeRequestTimelineCard({ request, moduleLabel = 'Workspace', onOpen, className = '', hideWhenResolved = false }) {
  if (!request) return null
  const status = upgradeStatusValue(request)
  const rejected = ['rejected', 'declined', 'failed'].includes(status)
  const approved = ['approved', 'paid', 'active', 'completed'].includes(status)
  const steps = upgradeTimelineSteps(request)
  const linkedTicket = Array.isArray(request.supportTickets) ? request.supportTickets[0] : null
  const ticketTimelineEntry = Array.isArray(request.timelineEntries)
    ? request.timelineEntries.find((entry) => entry?.type === 'support_ticket')
    : null
  const ticketStatus = linkedTicket?.status || ticketTimelineEntry?.status || ''
  const showTicketHistoryOnly = isResolvedStatus(status) || isResolvedStatus(ticketStatus)
  if (hideWhenResolved && showTicketHistoryOnly) return null
  if (showTicketHistoryOnly && !linkedTicket && !ticketTimelineEntry) return null
  const tone = rejected
    ? {
        wrap: 'border-rose-200 bg-rose-50/95 text-rose-900',
        icon: 'from-rose-500 to-red-600',
        pill: 'bg-rose-100 text-rose-700',
      }
    : approved
      ? {
          wrap: 'border-emerald-200 bg-emerald-50/95 text-emerald-900',
          icon: 'from-emerald-500 to-teal-600',
          pill: 'bg-emerald-100 text-emerald-700',
        }
      : {
          wrap: 'border-blue-200 bg-blue-50/95 text-blue-900',
          icon: 'from-blue-500 to-violet-600',
          pill: 'bg-blue-100 text-blue-700',
        }

  return (
    <section className={`overflow-hidden rounded-2xl border p-3 shadow-sm sm:p-4 ${tone.wrap} ${className}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-sm ${tone.icon}`}>
            <HiOutlineCreditCard className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black uppercase tracking-[0.12em]">{showTicketHistoryOnly ? 'Support ticket history' : 'Upgrade request timeline'}</p>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${tone.pill}`}>
                {(showTicketHistoryOnly ? ticketStatus || status : status).replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold opacity-80">
              {moduleLabel} · {request.requestedPlan || request.selectedPlan || request.plan || 'Plan'} · {request.transactionId || request.id}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Open request
          <HiOutlineArrowRight className="h-4 w-4" />
        </button>
      </div>

      {!showTicketHistoryOnly ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.key} className="min-w-0 rounded-xl bg-white/70 p-2 shadow-sm">
              <div className={`h-1.5 rounded-full ${
                step.rejected
                  ? 'bg-rose-500'
                  : step.done
                    ? approved || step.key !== 'decision'
                      ? 'bg-emerald-500'
                      : 'bg-blue-500'
                    : step.active
                      ? 'bg-blue-500'
                      : 'bg-slate-200'
              }`} />
              <p className="mt-2 truncate text-xs font-black text-slate-900">
                {index + 1}. {step.label}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {linkedTicket || ticketTimelineEntry ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/80 bg-white/75 p-3 text-xs font-bold text-slate-800 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Support ticket</p>
            <p className="mt-1 truncate">
              {linkedTicket?.ticketNumber || ticketTimelineEntry?.ticketNumber || 'Ticket'} · {linkedTicket?.subject || ticketTimelineEntry?.title || 'Created for rejected request'}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${
            ['resolved', 'completed', 'closed'].includes(String(linkedTicket?.status || '').toLowerCase())
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {linkedTicket?.status || ticketTimelineEntry?.status || 'Ticket created'}
          </span>
        </div>
      ) : null}
    </section>
  )
}
