import { useEffect, useMemo, useState } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import {
  businessServicePriceTypeLabel,
  businessServicePriceTypes,
  businessServiceRequestStatuses,
  defaultBusinessServices,
  formatBusinessServicePrice,
} from '../../lib/businessServices.js'
import {
  listenBusinessServiceRequestComments,
  listenBusinessServiceRequestTimeline,
  listenBusinessServiceRequests,
  listenBusinessServices,
  saveBusinessService,
  updateBusinessServiceRequestStatus,
} from '../../lib/businessServicesApi.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'

const emptyDraft = {
  title: '',
  description: '',
  startingPrice: 0,
  priceType: 'monthly',
  enabled: true,
  featured: false,
  sortOrder: 100,
}

function textDate(value) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export default function AdminBusinessServices() {
  const [services, setServices] = useState([])
  const [requests, setRequests] = useState([])
  const [draft, setDraft] = useState(emptyDraft)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [requestTimeline, setRequestTimeline] = useState([])
  const [requestComments, setRequestComments] = useState([])
  const [remarkDrafts, setRemarkDrafts] = useState({})
  const [editingId, setEditingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => listenBusinessServices({ includeDisabled: true }, (rows) => {
    setServices(rows)
    setLoading(false)
  }, (loadError) => {
    setError(clientSafeMessage(loadError, 'Unable to load business services.'))
    setLoading(false)
  }), [])

  useEffect(() => listenBusinessServiceRequests(setRequests, (loadError) => {
    setError(clientSafeMessage(loadError, 'Unable to load service requests.'))
  }), [])

  useEffect(() => {
    if (!selectedRequest?.id) return undefined
    const offTimeline = listenBusinessServiceRequestTimeline(selectedRequest.id, setRequestTimeline, () => {})
    const offComments = listenBusinessServiceRequestComments(selectedRequest.id, setRequestComments, () => {})
    return () => {
      offTimeline?.()
      offComments?.()
    }
  }, [selectedRequest?.id])

  const stats = useMemo(() => ({
    totalServices: services.length,
    enabledServices: services.filter((service) => service.enabled).length,
    pendingRequests: requests.filter((request) => request.status === 'New' || request.status === 'Under Review').length,
  }), [requests, services])

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const editService = (service) => {
    setEditingId(service.id)
    setDraft({
      ...service,
      startingPrice: Number(service.startingPrice || 0),
      createdAt: service.createdAt,
    })
    setNotice('')
    setError('')
  }

  const resetDraft = () => {
    setEditingId('')
    setDraft(emptyDraft)
  }

  const seedDefaults = async () => {
    setSaving(true)
    setError('')
    try {
      await Promise.all(defaultBusinessServices.map((service) => saveBusinessService({
        ...service,
        createdAt: serverTimestamp(),
      })))
      setNotice('Default business services saved.')
    } catch (seedError) {
      setError(clientSafeMessage(seedError, 'Unable to save default services.'))
    } finally {
      setSaving(false)
    }
  }

  const submitService = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await saveBusinessService({
        ...draft,
        id: editingId || draft.id,
        startingPrice: Number(draft.startingPrice || 0),
      })
      setNotice(editingId ? 'Business service updated.' : 'Business service added.')
      resetDraft()
    } catch (saveError) {
      setError(clientSafeMessage(saveError, 'Unable to save business service.'))
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (request, status) => {
    setError('')
    try {
      const remark = remarkDrafts[request.id] || ''
      await updateBusinessServiceRequestStatus(request.id, status, remark, request)
      setRemarkDrafts((current) => ({ ...current, [request.id]: '' }))
      setNotice('Service request status updated.')
    } catch (statusError) {
      setError(clientSafeMessage(statusError, 'Unable to update request status.'))
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Admin</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Business Services</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">Manage Back Office Add-ons, pricing, availability, and client service requests.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
            <span className="rounded-full border border-slate-200 px-3 py-1.5">Services: {stats.totalServices}</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">Enabled: {stats.enabledServices}</span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700">Open Requests: {stats.pendingRequests}</span>
          </div>
        </div>
      </section>

      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{notice}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.35fr]">
        <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitService}>
          <h2 className="text-lg font-black text-slate-950">{editingId ? 'Edit Service' : 'Add New Service'}</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Service Title">
              <input required maxLength={100} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} />
            </Field>
            <Field label="Description">
              <textarea required maxLength={500} rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-300" value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starting Price">
                <input type="number" min="0" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" value={draft.startingPrice} onChange={(event) => updateDraft('startingPrice', event.target.value)} />
              </Field>
              <Field label="Price Type">
                <select className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" value={draft.priceType} onChange={(event) => updateDraft('priceType', event.target.value)}>
                  {businessServicePriceTypes.map((type) => <option key={type} value={type}>{businessServicePriceTypeLabel(type)}</option>)}
                </select>
              </Field>
              <Field label="Sort Order">
                <input type="number" min="0" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300" value={draft.sortOrder} onChange={(event) => updateDraft('sortOrder', event.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3 pt-6">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={draft.enabled} onChange={(event) => updateDraft('enabled', event.target.checked)} />
                  Enabled
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={draft.featured} onChange={(event) => updateDraft('featured', event.target.checked)} />
                  Featured
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-60">
                {saving ? 'Saving...' : editingId ? 'Update Service' : 'Add Service'}
              </button>
              <button type="button" className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700" onClick={resetDraft}>Clear</button>
              <button type="button" disabled={saving} className="min-h-11 rounded-xl border border-blue-200 px-4 text-sm font-bold text-blue-700 disabled:opacity-60" onClick={seedDefaults}>Save Defaults</button>
            </div>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-black text-slate-950">Service Catalog</h2>
          </div>
          {loading ? (
            <div className="p-5 text-sm text-slate-500">Loading services...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {services.map((service) => (
                <div key={service.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">{service.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${service.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{service.enabled ? 'Enabled' : 'Disabled'}</span>
                      {service.featured ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700">Featured</span> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
                    <p className="mt-2 text-sm font-black text-slate-950">{formatBusinessServicePrice(service)} <span className="text-xs text-slate-500">/ {businessServicePriceTypeLabel(service.priceType)}</span></p>
                  </div>
                  <button type="button" className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700" onClick={() => editService(service)}>Edit</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">Client Service Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[1050px]">
            <div className="grid grid-cols-[1fr_0.8fr_0.9fr_1fr_1.2fr_0.9fr_1.1fr_0.7fr] gap-3 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
              <div>Client</div>
              <div>Contact</div>
              <div>Email</div>
              <div>Service</div>
              <div>Details</div>
              <div>Status</div>
              <div>Admin Remark</div>
              <div>Created</div>
            </div>
            {requests.length ? requests.map((request) => (
              <div key={request.id} className="grid grid-cols-[1fr_0.8fr_0.9fr_1fr_1.2fr_0.9fr_1.1fr_0.7fr] gap-3 border-t border-slate-100 px-5 py-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{request.companyName || '-'}</p>
                  <p className="mt-1 text-xs text-slate-500">{request.engagementType || '-'}</p>
                </div>
                <div className="truncate text-slate-700">{request.contactNumber || '-'}</div>
                <div className="truncate text-slate-700">{request.email || '-'}</div>
                <div className="truncate font-bold text-slate-800">{request.serviceTitle || '-'}</div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-slate-600">{request.supportDetails || '-'}</p>
                  {request.preferredWorkingHours ? <p className="mt-1 text-xs text-slate-400">{request.preferredWorkingHours}</p> : null}
                </div>
                <div>
                  <select className="h-10 w-full rounded-xl border border-slate-200 px-2 text-xs font-bold" value={request.status || 'New'} onChange={(event) => updateStatus(request, event.target.value)}>
                    {businessServiceRequestStatuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
                <div>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs outline-none focus:border-blue-300"
                    placeholder={request.latestAdminRemark || 'Remark for client notification'}
                    value={remarkDrafts[request.id] || ''}
                    onChange={(event) => setRemarkDrafts((current) => ({ ...current, [request.id]: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">{textDate(request.createdAt)}</p>
                  <button type="button" className="h-8 rounded-lg border border-blue-200 px-3 text-xs font-black text-blue-700" onClick={() => setSelectedRequest(request)}>View</button>
                </div>
              </div>
            )) : (
              <div className="px-5 py-8 text-sm text-slate-500">No service requests yet.</div>
            )}
          </div>
        </div>
      </section>
      {selectedRequest ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Business Service Request</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedRequest.serviceTitle}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{selectedRequest.companyName} · {selectedRequest.email}</p>
              </div>
              <button type="button" className="h-9 rounded-xl border border-slate-200 px-3 text-sm font-bold" onClick={() => setSelectedRequest(null)}>Close</button>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">Request Details</p>
                  <dl className="mt-3 grid gap-2 text-sm">
                    {[
                      ['Status', selectedRequest.status || 'New'],
                      ['Contact', selectedRequest.contactNumber || '-'],
                      ['Support', selectedRequest.supportDetails || '-'],
                      ['Working hours', selectedRequest.preferredWorkingHours || '-'],
                      ['Notes', selectedRequest.notes || '-'],
                      ['Latest client comment', selectedRequest.latestClientComment || '-'],
                      ['Latest admin remark', selectedRequest.latestAdminRemark || '-'],
                    ].map(([label, value]) => (
                      <div key={label} className="grid gap-1 border-b border-slate-200 pb-2 last:border-b-0">
                        <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</dt>
                        <dd className="text-slate-700">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-950">Client Comments</p>
                  <div className="mt-3 space-y-3">
                    {requestComments.length ? requestComments.map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-sm leading-6 text-slate-700">{item.message}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">{item.actorEmail || item.actor || 'client'} · {textDate(item.createdAt)}</p>
                      </div>
                    )) : <p className="text-sm text-slate-500">No comments yet.</p>}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-950">Timeline</p>
                <div className="mt-3 space-y-3">
                  {requestTimeline.length ? requestTimeline.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-black text-slate-950">{item.title}</p>
                        <span className="shrink-0 text-[11px] font-bold text-slate-400">{textDate(item.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-blue-700">{item.actor || 'system'} {item.status ? `· ${item.status}` : ''}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">Timeline loading...</p>}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
