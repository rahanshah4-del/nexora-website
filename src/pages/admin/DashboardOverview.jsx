import { useEffect, useState } from 'react'
import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import {
  HiOutlineArrowPath, HiOutlineChartBarSquare, HiOutlineComputerDesktop, HiOutlineDocumentText,
  HiOutlineEnvelope, HiOutlineEnvelopeOpen, HiOutlineLifebuoy, HiOutlineSparkles, HiOutlineStar,
} from 'react-icons/hi2'
import { firestoreDb as db } from '../../lib/firebase.js'
import { getTempMailOverview } from '../../lib/tempMailAdmin.js'
import { getGeoLintStats } from '../../lib/geolint.js'
import { getLatestRelease } from '../../lib/desktopReleases.js'

/**
 * "Platform overview" on the Control Centre dashboard: one card per product area added after the
 * SaaS core (Temp Mail, GeoLint, Email Marketing, leads, support, reviews, blog, desktop app).
 * Each card loads on its own, so a slow or failing source shows "Unavailable" on that card only.
 * Eight cards fill two full rows on wide screens, so there is no empty slot.
 */

const TONES = {
  violet: 'bg-violet-100 text-violet-700',
  sky: 'bg-sky-100 text-sky-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
}

const num = (value) => (Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US') : '—')

async function count(name, ...conditions) {
  if (!db) throw new Error('Database is not available.')
  const ref = collection(db, name)
  const snap = await getCountFromServer(conditions.length ? query(ref, ...conditions) : ref)
  return snap.data().count
}

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }

const LOADERS = {
  tempMail: async () => {
    const o = await getTempMailOverview()
    return {
      pill: o?.settings?.enabled === false ? ['Paused', 'amber'] : ['Live', 'emerald'],
      metrics: [['Addresses (30d)', num(o?.totals?.created)], ['Mails received', num(o?.totals?.mail_received)], ['Active now', num(o?.activeAddresses)]],
    }
  },
  geolint: async () => {
    const s = await getGeoLintStats()
    return {
      pill: ['Live', 'emerald'],
      metrics: [['Total audits', num(s?.total)], ['Last 24 hours', num(s?.last24h)], ['Avg score', s?.averageScorePercent == null ? '—' : `${s.averageScorePercent}%`]],
    }
  },
  email: async () => {
    const [sent, queued, failed, subs] = await Promise.all([
      count('marketingEmailLogs', where('sentAt', '>=', startOfToday())),
      count('marketingEmailLogs', where('status', '==', 'queued')),
      count('marketingEmailLogs', where('status', '==', 'failed')),
      count('marketingSubscribers', where('status', '==', 'subscribed')),
    ])
    return {
      pill: failed > 0 ? [`${num(failed)} failed`, 'rose'] : ['Healthy', 'emerald'],
      metrics: [['Sent today', num(sent)], ['In queue', num(queued)], ['Subscribers', num(subs)]],
    }
  },
  leads: async () => {
    const [fresh, total] = await Promise.all([count('websiteLeads', where('status', '==', 'new')), count('websiteLeads')])
    return { pill: fresh > 0 ? [`${num(fresh)} new`, 'amber'] : ['All handled', 'emerald'], metrics: [['New leads', num(fresh)], ['All leads', num(total)], ['Handled', num(Math.max(0, total - fresh))]] }
  },
  reviews: async () => {
    const [pending, approved, total] = await Promise.all([count('reviews', where('status', '==', 'pending')), count('reviews', where('status', '==', 'approved')), count('reviews')])
    return { pill: pending > 0 ? [`${num(pending)} to review`, 'amber'] : ['Up to date', 'emerald'], metrics: [['Pending', num(pending)], ['Approved', num(approved)], ['Total', num(total)]] }
  },
  blog: async () => {
    const [published, total] = await Promise.all([count('blogPosts', where('status', '==', 'published')), count('blogPosts')])
    return { pill: ['Publishing', 'sky'], metrics: [['Published', num(published)], ['Drafts / scheduled', num(Math.max(0, total - published))], ['All posts', num(total)]] }
  },
  desktop: async () => {
    const latest = await getLatestRelease()
    if (!latest) return { pill: ['No release', 'amber'], metrics: [['Latest version', '—'], ['Size', '—'], ['Released', '—']] }
    const date = latest.releasedAt ? new Date(latest.releasedAt) : null
    return {
      pill: ['Published', 'emerald'],
      metrics: [['Latest version', `v${latest.version}`], ['Size', latest.sizeBytes ? `${(latest.sizeBytes / 1048576).toFixed(0)} MB` : '—'], ['Released', date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—']],
    }
  },
}

async function fetchAll() {
  const keys = Object.keys(LOADERS)
  const results = await Promise.allSettled(keys.map((key) => LOADERS[key]()))
  return Object.fromEntries(results.map((r, i) => [keys[i], r.status === 'fulfilled' ? r.value : { error: String(r.reason?.message || 'Could not load.') }]))
}

const CARDS = [
  { key: 'tempMail', tab: 'tempMail', title: 'Temp Mail', note: 'Free temporary inbox tool', icon: HiOutlineEnvelopeOpen, tone: 'sky' },
  { key: 'geolint', tab: 'geolint', title: 'GeoLint', note: 'AI-crawler audits and orders', icon: HiOutlineChartBarSquare, tone: 'violet' },
  { key: 'email', tab: 'emailMarketing', title: 'Email Marketing', note: 'Campaigns, automations, daily promotion', icon: HiOutlineEnvelope, tone: 'emerald' },
  { key: 'leads', tab: 'websiteLeads', title: 'Website Leads', note: 'Enquiries from the public site', icon: HiOutlineSparkles, tone: 'amber' },
  { key: 'support', tab: 'support', title: 'Support Tickets', note: 'Open client requests', icon: HiOutlineLifebuoy, tone: 'rose', local: true },
  { key: 'reviews', tab: 'reviews', title: 'Client Reviews', note: 'Moderation queue', icon: HiOutlineStar, tone: 'amber' },
  { key: 'blog', tab: 'blogCms', title: 'Blog CMS', note: 'Articles and scheduled posts', icon: HiOutlineDocumentText, tone: 'sky' },
  { key: 'desktop', tab: 'desktopReleases', title: 'Desktop App', note: 'Windows POS installer', icon: HiOutlineComputerDesktop, tone: 'violet' },
]

function Pill({ tone, children }) {
  const colors = { emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200', amber: 'bg-amber-50 text-amber-800 ring-amber-200', rose: 'bg-rose-50 text-rose-700 ring-rose-200', sky: 'bg-sky-50 text-sky-700 ring-sky-200', slate: 'bg-slate-100 text-slate-600 ring-slate-200' }
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${colors[tone] || colors.slate}`}>{children}</span>
}

function OverviewCard({ card, state, onOpen }) {
  const Icon = card.icon
  const metrics = state?.metrics || [['—', '—'], ['—', '—'], ['—', '—']]
  const failed = state?.error
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONES[card.tone]}`}><Icon className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-slate-950">{card.title}</h3>
            <p className="truncate text-xs font-semibold text-slate-500">{card.note}</p>
          </div>
        </div>
        {state?.pill ? <Pill tone={state.pill[1]}>{state.pill[0]}</Pill> : failed ? <Pill tone="slate">Unavailable</Pill> : <Pill tone="slate">Loading</Pill>}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {metrics.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl bg-slate-50 px-2.5 py-2">
            <dd className="truncate text-lg font-black tracking-tight text-slate-950">{failed ? '—' : value}</dd>
            <dt className="truncate text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</dt>
          </div>
        ))}
      </dl>
      {failed ? <p className="mt-3 line-clamp-2 text-xs font-semibold text-rose-600">{failed}</p> : null}
      <button type="button" onClick={onOpen} className="mt-4 inline-flex items-center justify-center self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800">Open {card.title}</button>
    </article>
  )
}

/** @param {{ supportTickets: Array<object>, onOpen: (tab: string) => void }} props */
export default function DashboardOverview({ supportTickets = [], onOpen }) {
  const [states, setStates] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    fetchAll().then((result) => { if (live) setStates(result) })
    return () => { live = false }
  }, [])
  const refresh = () => {
    setBusy(true)
    fetchAll().then(setStates).finally(() => setBusy(false))
  }

  const open = supportTickets.filter((t) => ['open', 'pending', 'in_progress', 'new'].includes(String(t.status || 'open').toLowerCase().replace(/\s+/g, '_')))
  const urgent = open.filter((t) => ['urgent', 'critical', 'high'].includes(String(t.priority || '').toLowerCase()))
  const supportState = {
    pill: urgent.length ? [`${urgent.length} urgent`, 'rose'] : open.length ? [`${open.length} open`, 'amber'] : ['All clear', 'emerald'],
    metrics: [['Open', num(open.length)], ['Urgent', num(urgent.length)], ['All tickets', num(supportTickets.length)]],
  }

  return (
    <section aria-labelledby="platform-overview-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="platform-overview-title" className="text-base font-black text-slate-950">Platform overview</h2>
          <p className="text-xs font-semibold text-slate-500">Everything beyond the SaaS core, at a glance. Open a card for the full panel.</p>
        </div>
        <button type="button" onClick={refresh} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 disabled:opacity-60">
          <HiOutlineArrowPath className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />{busy ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((card) => <OverviewCard key={card.key} card={card} state={card.local ? supportState : states[card.key]} onOpen={() => onOpen(card.tab)} />)}
      </div>
    </section>
  )
}
