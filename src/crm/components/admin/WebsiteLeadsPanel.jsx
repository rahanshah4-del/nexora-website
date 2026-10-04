import { useEffect, useMemo, useState } from 'react'
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { HiOutlineChatBubbleLeftRight, HiOutlineEnvelope } from 'react-icons/hi2'
import { db } from '../../lib/firebase.js'
import { WEBSITE_LEADS_COLLECTION, WEBSITE_LEAD_STATUSES } from '../../../lib/websiteLeads.js'

const STATUS_STYLES = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
}

function timeLabel(value) {
  if (!value) return ''
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function whatsappLink(phone = '') {
  let digits = String(phone).replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `92${digits.slice(1)}`
  return digits ? `https://wa.me/${digits}` : ''
}

export default function WebsiteLeadsPanel() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('new')
  const [saving, setSaving] = useState('')

  useEffect(() => {
    if (!db) { setLoading(false); return undefined }
    const q = query(collection(db, WEBSITE_LEADS_COLLECTION), orderBy('createdAt', 'desc'), limit(200))
    return onSnapshot(q, (snap) => {
      setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
      setError('')
    }, (err) => {
      setLoading(false)
      setError(err?.code === 'permission-denied'
        ? 'Permission denied — deploy the latest firestore.rules (websiteLeads) first.'
        : `Could not load leads: ${err?.message || err}`)
    })
  }, [])

  const counts = useMemo(() => WEBSITE_LEAD_STATUSES.reduce((acc, status) => ({ ...acc, [status]: leads.filter((l) => (l.status || 'new') === status).length }), {}), [leads])
  const shown = filter === 'all' ? leads : leads.filter((l) => (l.status || 'new') === filter)

  async function setStatus(id, status) {
    setSaving(id)
    try {
      await updateDoc(doc(db, WEBSITE_LEADS_COLLECTION, id), { status, updatedAt: serverTimestamp() })
    } catch (err) {
      setError(`Could not update lead: ${err?.message || err}`)
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Website Leads</h2>
        <p className="mt-1 text-sm text-slate-500">
          {loading ? 'Loading leads…' : `${leads.length} total · ${counts.new || 0} new · ${counts.contacted || 0} contacted · ${counts.closed || 0} closed`} — from the /contact/ form.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['new', 'contacted', 'closed', 'all'].map((key) => (
            <button key={key} type="button" onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${filter === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
              {key}{key !== 'all' ? ` (${counts[key] || 0})` : ''}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{error}</p> : null}

      {!loading && !shown.length ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No {filter === 'all' ? '' : filter} leads.</p>
      ) : null}

      <div className="grid gap-4">
        {shown.map((lead) => {
          const status = lead.status || 'new'
          const wa = whatsappLink(lead.phone)
          return (
            <article key={lead.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-slate-950">{lead.name}{lead.businessName ? <span className="font-medium text-slate-500"> · {lead.businessName}</span> : null}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{timeLabel(lead.createdAt)}{lead.module ? ` · ${lead.module}` : ''}{lead.businessSize ? ` · ${lead.businessSize}` : ''}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLES[status] || STATUS_STYLES.new}`}>{status}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{lead.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
                    <HiOutlineChatBubbleLeftRight className="h-4 w-4" /> {lead.phone}
                  </a>
                ) : null}
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                    <HiOutlineEnvelope className="h-4 w-4" /> {lead.email}
                  </a>
                ) : null}
                <span className="ml-auto flex gap-2">
                  {WEBSITE_LEAD_STATUSES.filter((s) => s !== status).map((next) => (
                    <button key={next} type="button" disabled={saving === lead.id} onClick={() => setStatus(lead.id, next)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold capitalize text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      Mark {next}
                    </button>
                  ))}
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
