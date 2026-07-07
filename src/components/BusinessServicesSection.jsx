import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { HiOutlineArrowRight, HiOutlineCheckCircle, HiOutlineXMark } from 'react-icons/hi2'
import {
  businessServicePriceTypeLabel,
  enabledBusinessServices,
  formatBusinessServicePrice,
} from '../lib/businessServices.js'
import {
  addBusinessServiceRequestComment,
  getBusinessServicesOnce,
  listenBusinessServiceRequestComments,
  listenBusinessServiceRequestTimeline,
  listenMyBusinessServiceRequests,
  submitBusinessServiceRequest,
} from '../lib/businessServicesApi.js'
import { auth } from '../lib/firebase.js'
import { safeTrackMetaEventOnce } from '../lib/metaPixel.js'

const emptyForm = {
  companyName: '',
  contactNumber: '',
  email: '',
  supportDetails: '',
  engagementType: 'Part Time',
  preferredWorkingHours: '',
  notes: '',
}

const publicHighlights = [
  ['Operations Team', 'Daily admin support for data, calls, accounting, follow-ups and online work.'],
  ['Flexible Staffing', 'Full-time, part-time, one-time setup or custom business support plans.'],
  ['Managed by Nexora', 'Requests, scope and pricing stay connected with your Nexora business account.'],
]

const publicProcess = ['Request', 'Nexora Review', 'Proposal', 'Activation']
const SERVICES_CACHE_KEY = 'nexora-business-services-cache-v1'
const SERVICES_CACHE_TTL_MS = 10 * 60 * 1000

function readServicesCache() {
  if (typeof window === 'undefined') return null
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(SERVICES_CACHE_KEY) || 'null')
    if (!cached?.at || !Array.isArray(cached?.rows)) return null
    if (Date.now() - cached.at > SERVICES_CACHE_TTL_MS) return null
    return cached.rows
  } catch {
    return null
  }
}

function writeServicesCache(rows) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify({ at: Date.now(), rows }))
  } catch {
    // Ignore storage pressure; default services still render.
  }
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export default function BusinessServicesSection({ compact = false, variant = compact ? 'compact' : 'public' }) {
  const [searchParams] = useSearchParams()
  const [services, setServices] = useState(() => enabledBusinessServices())
  const [myRequests, setMyRequests] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [comments, setComments] = useState([])
  const [commentDraft, setCommentDraft] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [commentSaving, setCommentSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const cached = readServicesCache()
    if (cached) setServices(cached)
    getBusinessServicesOnce({})
      .then((rows) => {
        if (cancelled) return
        setServices(rows)
        writeServicesCache(rows)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!auth?.currentUser) return undefined
    return listenMyBusinessServiceRequests(setMyRequests, () => {})
  }, [])

  useEffect(() => {
    const requestId = searchParams.get('request')
    if (!requestId || selectedRequest?.id === requestId) return
    const match = myRequests.find((request) => request.id === requestId)
    if (match) setSelectedRequest(match)
  }, [myRequests, searchParams, selectedRequest?.id])

  useEffect(() => {
    if (!selectedRequest?.id) return undefined
    const offTimeline = listenBusinessServiceRequestTimeline(selectedRequest.id, setTimeline, () => {})
    const offComments = listenBusinessServiceRequestComments(selectedRequest.id, setComments, () => {})
    return () => {
      offTimeline?.()
      offComments?.()
    }
  }, [selectedRequest?.id])

  useEffect(() => {
    const modalOpen = Boolean(selectedService || selectedRequest)
    if (!modalOpen) return undefined
    document.documentElement.classList.add('business-service-modal-open')
    document.body.classList.add('business-service-modal-open')
    return () => {
      document.documentElement.classList.remove('business-service-modal-open')
      document.body.classList.remove('business-service-modal-open')
    }
  }, [selectedRequest, selectedService])

  const visibleServices = useMemo(() => enabledBusinessServices(services), [services])

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const openRequest = (service) => {
    setSelectedService(service)
    setForm(emptyForm)
    setMessage('')
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!selectedService) return
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const requestId = await submitBusinessServiceRequest(selectedService, form)
      if (variant === 'public' || variant === 'workspace') {
        safeTrackMetaEventOnce('Lead', undefined, `nexora_meta_lead:${requestId}`, 'session')
      }
      setMessage('Your service request has been submitted. Nexora team will contact you soon.')
      setForm(emptyForm)
    } catch (submitError) {
      setError(submitError?.message || 'Unable to submit service request right now.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitComment = async (event) => {
    event.preventDefault()
    if (!selectedRequest) return
    setCommentSaving(true)
    setError('')
    try {
      await addBusinessServiceRequestComment(selectedRequest.id, selectedRequest, commentDraft)
      setCommentDraft('')
    } catch (commentError) {
      setError(commentError?.message || 'Unable to add comment right now.')
    } finally {
      setCommentSaving(false)
    }
  }

  const dateLabel = (value) => {
    const date = value?.toDate?.() || (value ? new Date(value) : null)
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
  }

  const isWorkspace = variant === 'workspace'
  const isCompact = compact || isWorkspace
  const cardClass = isCompact
    ? 'flex min-h-[13.5rem] flex-col rounded-2xl border border-blue-100 bg-white p-4 shadow-sm'
    : 'flex min-h-[16rem] flex-col rounded-[1.35rem] border border-blue-100 bg-white/95 p-5 shadow-[0_26px_70px_-48px_rgba(37,99,235,0.42)]'
  const gridClass = isCompact ? 'mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
  const sectionClass = isWorkspace
    ? 'mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'
    : isCompact
      ? 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'
      : 'relative overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_45%,#eef7ff_100%)] py-16 sm:py-20 lg:py-24'

  return (
    <section id="business-services" className={sectionClass}>
      {!isCompact ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <div className="pointer-events-none absolute left-[8%] top-12 hidden h-40 w-40 rotate-3 bg-[radial-gradient(circle,#bfdbfe_1px,transparent_1px)] [background-size:16px_16px] opacity-50 lg:block" />
          <div className="pointer-events-none absolute right-[10%] bottom-10 hidden h-40 w-40 -rotate-6 bg-[radial-gradient(circle,#c7d2fe_1px,transparent_1px)] [background-size:16px_16px] opacity-50 lg:block" />
        </>
      ) : null}
      <div className={isCompact ? '' : 'relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8'}>
        {isCompact ? (
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              <span aria-hidden="true">💼</span>
              Business Services
              <span aria-hidden="true">⚙️</span>
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              Need Back Office Support? <span aria-hidden="true">🤝</span>
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              Nexora doesn&apos;t just provide software — we can also help manage your daily business operations.
            </p>
          </div>
        ) : (
          <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                <span aria-hidden="true">💼</span>
                Business Services
                <span aria-hidden="true">⚙️</span>
              </p>
              <h2 className="website-section-heading mt-5 text-4xl font-black leading-[1.04] tracking-tight text-slate-950 sm:text-5xl lg:text-[4.35rem]">
                Need Back Office Support? <span aria-hidden="true">🤝</span>
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Nexora doesn&apos;t just provide software — we can also help manage your daily business operations.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
                {publicHighlights.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-[0_18px_56px_-44px_rgba(37,99,235,0.42)]">
                    <HiOutlineCheckCircle className="h-5 w-5 text-blue-600" />
                    <p className="mt-3 text-sm font-black text-slate-950">{title}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-blue-100 bg-white/90 p-5 shadow-[0_32px_90px_-58px_rgba(37,99,235,0.48)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Managed Support Desk</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">From request to active support</h3>
                </div>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-950 text-2xl text-white" aria-hidden="true">⚡</span>
              </div>
              <div className="mt-6 grid gap-3">
                {publicProcess.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-sm font-black text-white">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">{step}</p>
                      <p className="text-xs font-semibold text-slate-500">{index === 0 ? 'Client selects service and shares details.' : index === 1 ? 'Nexora team reviews staff, timing and scope.' : index === 2 ? 'Pricing and support plan are shared.' : 'Approved service goes live with your team.'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
                <p className="text-sm font-black">Popular requests</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Data entry', 'Bookkeeping', 'VA', 'Customer support', 'Website management'].map((item) => (
                    <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-blue-50">{item}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={gridClass}>
          {visibleServices.map((service) => (
            <article
              key={service.id}
              className={cardClass}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-black text-slate-950">
                  <span aria-hidden="true">✨ </span>
                  {service.title}
                </h3>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${service.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {service.enabled ? 'Available' : 'Paused'}
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{service.description}</p>
              <div className={`${isCompact ? 'mt-4 flex-col items-stretch' : 'mt-5 items-end justify-between'} flex gap-3`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Starting price</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{formatBusinessServicePrice(service)}</p>
                  <p className="mt-0.5 text-xs font-bold text-blue-700">{businessServicePriceTypeLabel(service.priceType)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openRequest(service)}
                  className={`${isCompact ? 'w-full' : ''} inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-black text-white hover:bg-blue-700`}
                >
                  Request Service
                  <HiOutlineArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {isCompact && myRequests.length ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">My Business Service Requests</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Track status, timeline, remarks, and comments.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">{myRequests.length} request{myRequests.length === 1 ? '' : 's'}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {myRequests.slice(0, 5).map((request) => (
                <button
                  type="button"
                  key={request.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-blue-200 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => setSelectedRequest(request)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950">{request.serviceTitle || 'Business service'}</span>
                    <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{request.latestAdminRemark || request.supportDetails || 'Request submitted'}</span>
                  </span>
                  <span className="inline-flex shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{request.status || 'New'}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {selectedService ? (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="mx-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.25rem] bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-[1.35rem]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-4 pb-4 pt-4 sm:px-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Request Service</p>
                <h3 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{selectedService.title}</h3>
              </div>
              <button type="button" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-black text-slate-700 sm:w-9 sm:px-0" onClick={() => setSelectedService(null)} aria-label="Close">
                <span className="sm:hidden" aria-hidden="true">⬅️</span>
                <span className="sm:hidden">Back</span>
                <HiOutlineXMark className="hidden h-5 w-5 sm:block" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5 sm:pb-5">
              {message ? (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                  <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  {message}
                </div>
              ) : null}
              {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}

              <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
              <Field label="Service Type">
                <input className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700" value={selectedService.title} readOnly />
              </Field>
              <Field label="Company Name">
                <input required maxLength={160} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" value={form.companyName} onChange={(event) => updateForm('companyName', event.target.value)} />
              </Field>
              <Field label="Contact Number">
                <input required maxLength={40} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" value={form.contactNumber} onChange={(event) => updateForm('contactNumber', event.target.value)} />
              </Field>
              <Field label="Email">
                <input required type="email" maxLength={254} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" value={form.email} onChange={(event) => updateForm('email', event.target.value)} />
              </Field>
              <Field label="Full Time / Part Time">
                <select className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" value={form.engagementType} onChange={(event) => updateForm('engagementType', event.target.value)}>
                  <option>Part Time</option>
                  <option>Full Time</option>
                </select>
              </Field>
              <Field label="Preferred Working Hours">
                <input maxLength={120} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" value={form.preferredWorkingHours} onChange={(event) => updateForm('preferredWorkingHours', event.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Required Staff / Support Details">
                  <textarea required maxLength={1500} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-300" value={form.supportDetails} onChange={(event) => updateForm('supportDetails', event.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Additional Notes">
                  <textarea maxLength={1000} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-300" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700" onClick={() => setSelectedService(null)}>Cancel</button>
                <button type="submit" disabled={submitting} className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-60">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
        </ModalPortal>
      ) : null}
      {selectedRequest ? (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="mx-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.25rem] bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-[1.35rem]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-4 pb-4 pt-4 sm:px-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Request Timeline</p>
                <h3 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{selectedRequest.serviceTitle}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Current status: {selectedRequest.status || 'New'}</p>
              </div>
              <button type="button" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-black text-slate-700 sm:w-9 sm:px-0" onClick={() => setSelectedRequest(null)} aria-label="Close">
                <span className="sm:hidden" aria-hidden="true">⬅️</span>
                <span className="sm:hidden">Back</span>
                <HiOutlineXMark className="hidden h-5 w-5 sm:block" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5 sm:pb-5">
              {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div>
                <p className="text-sm font-black text-slate-950">Progress</p>
                <div className="mt-3 space-y-3">
                  {timeline.length ? timeline.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-black text-slate-950">{item.title}</p>
                        <span className="shrink-0 text-[11px] font-bold text-slate-400">{dateLabel(item.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-blue-700">{item.actor || 'system'}</p>
                    </div>
                  )) : <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Timeline loading...</div>}
                </div>
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">Comments</p>
                <div className="mt-3 max-h-64 space-y-3 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {comments.length ? comments.map((item) => (
                    <div key={item.id} className="rounded-xl bg-white p-3">
                      <p className="text-sm leading-6 text-slate-700">{item.message}</p>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">{item.actor || 'client'} · {dateLabel(item.createdAt)}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">No comments yet.</p>}
                </div>
                <form className="mt-3" onSubmit={submitComment}>
                  <textarea
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-300"
                    placeholder="Write a comment for Nexora team..."
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                  />
                  <button type="submit" disabled={commentSaving || !commentDraft.trim()} className="mt-2 min-h-10 w-full rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-60">
                    {commentSaving ? 'Sending...' : 'Add Comment'}
                  </button>
                </form>
              </div>
            </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      ) : null}
    </section>
  )
}
