import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDoc,
  arrayUnion,
  collection,
  collectionGroup,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCreditCard,
  HiOutlineEnvelope,
  HiOutlineKey,
  HiOutlineLockClosed,
  HiOutlineMagnifyingGlass,
  HiOutlineMinus,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlinePlusCircle,
  HiOutlinePower,
  HiOutlineRectangleStack,
  HiOutlineShieldCheck,
  HiOutlineSquares2X2,
  HiOutlineTicket,
  HiOutlineXMark,
} from 'react-icons/hi2'
import { db } from '../../lib/firebase.js'
import useAuth from '../../context/useAuth.js'
import { clientSafeMessage } from '../../lib/errorHandler.js'
import { isBackendAdminEmail } from '../../lib/roles.js'
import { sendWorkerEmail } from '../../lib/transactionalEmail.js'
import { labelForBusinessType } from '../../crm/data/moduleAccess.js'
import { resolveClientShortId } from '../../lib/clientIds.js'
import { listWorkerUpgradeRequests, updateWorkerUpgradeRequestStatus } from '../../lib/upgradeWorker.js'
import { adminForceLogoutUser, adminListPasskeySecurity, adminUpdatePasskey } from '../../lib/passkeys.js'
import { buildApprovedSubscriptionPayload } from '../../lib/subscriptionApproval.js'

function needsBackendWarning(actionId = '') {
  return /approve|reject|delete|remove|block|deactivate|disable|resolve|close|complete|paid|reset|logout|toggle/i.test(String(actionId))
}

function backendWarningMessage(actionId = '') {
  const id = String(actionId)
  if (/delete|remove/i.test(id)) return 'Warning: this will remove backend data. Continue?'
  if (/approve|paid/i.test(id)) return 'Warning: this will approve or mark a payment as paid. Continue?'
  if (/reject/i.test(id)) return 'Warning: this will reject the request and notify/update the client record. Continue?'
  if (/block|deactivate|disable/i.test(id)) return 'Warning: this may disable client access. Continue?'
  if (/resolve|close|complete/i.test(id)) return 'Warning: this will change the request/ticket status. Continue?'
  return 'Warning: this backend action will update live data. Continue?'
}

const modules = ['General CRM', 'School ERP', 'Retail / POS', 'Property ERP', 'Restaurant POS', 'WhatsApp CRM', 'Transport / Rental']
const moduleVisuals = {
  'General CRM': { emoji: '📈', accent: 'border-sky-400/40 bg-sky-500/10 text-sky-200', light: 'border-sky-200 bg-sky-50 text-sky-800', description: 'Sales hub, leads, customers, invoices, tasks.' },
  'School ERP': { emoji: '🎓', accent: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200', light: 'border-emerald-200 bg-emerald-50 text-emerald-800', description: 'Students, attendance, fees, reports, parents.' },
  'Retail / POS': { emoji: '🛒', accent: 'border-amber-400/40 bg-amber-500/10 text-amber-200', light: 'border-amber-200 bg-amber-50 text-amber-800', description: 'Inventory, products, POS billing, purchases.' },
  'Property ERP': { emoji: '🏢', accent: 'border-violet-400/40 bg-violet-500/10 text-violet-200', light: 'border-violet-200 bg-violet-50 text-violet-800', description: 'Tenants, rent, contracts, maintenance, owners.' },
  'Restaurant POS': { emoji: '🍽️', accent: 'border-rose-400/40 bg-rose-500/10 text-rose-200', light: 'border-rose-200 bg-rose-50 text-rose-800', description: 'Tables, KOT, kitchen display, menu, orders.' },
  'WhatsApp CRM': { emoji: '💬', accent: 'border-teal-400/40 bg-teal-500/10 text-teal-200', light: 'border-teal-200 bg-teal-50 text-teal-800', description: 'WhatsApp leads, inbox, templates, follow-ups.' },
  'Transport / Rental': { emoji: '🚚', accent: 'border-orange-400/40 bg-orange-500/10 text-orange-200', light: 'border-orange-200 bg-orange-50 text-orange-800', description: 'Fleet, bookings, rentals, customers, dues.' },
}
const resolvedStatuses = new Set(['resolved', 'completed', 'closed'])
const openStatuses = new Set(['open', 'pending', 'in_progress', 'new'])

function normalizeSnapDoc(docSnap) {
  return {
    id: docSnap.id,
    ref: docSnap.ref,
    path: docSnap.ref.path,
    ...docSnap.data(),
  }
}

function toDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function dateLabel(value) {
  const date = toDate(value)
  return date ? date.toLocaleDateString() : '-'
}

function dateTimeLabel(value) {
  const date = toDate(value)
  return date ? date.toLocaleString() : '-'
}

function relativeTimeLabel(value, now = Date.now()) {
  const date = toDate(value)
  if (!date) return '-'
  const diffMs = Math.max(0, Number(now) - date.getTime())
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 20) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function clean(value) {
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value.trim() : String(value).trim()
}

function escapeHtml(value) {
  return clean(String(value ?? ''))
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function lower(value) {
  return clean(value).toLowerCase()
}

function statusValue(value, fallback = 'unknown') {
  return String(value || fallback).trim().toLowerCase().replace(/\s+/g, '_')
}

function money(value, currency = 'PKR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0) || 0)
}

function firstValue(...values) {
  return values.map(clean).find(Boolean) || ''
}

function emailFor(row = {}) {
  return firstValue(row.email, row.ownerEmail, row.userEmail, row.clientEmail, row.contactEmail, row.customerEmail)
}

function phoneFor(row = {}) {
  return firstValue(row.phone, row.phoneNumber, row.mobile, row.whatsapp, row.senderNumber, row.userPhone)
}

function ipFor(row = {}) {
  const source = row || {}
  return firstValue(
    source.ipAddress,
    source.lastIpAddress,
    source.lastLoginIp,
    source.loginIp,
    source.clientIp,
    source.clientIPAddress,
    source.ip,
    source.requestIp,
    source.remoteAddress,
    source.lastSeenIp,
    source.visitorIp,
    source.networkIp,
    source.publicIp,
    source.lastKnownIp,
  )
}

function workspaceName(row = {}) {
  return firstValue(row.companyName, row.workspaceName, row.businessName, row.name, row.ownerName, row.email, row.id) || 'Client workspace'
}

function workspaceIdFor(row = {}) {
  return row.workspaceId || row.id || row.ownerId || row.userId || row.uid || ''
}

function normalizeBusinessType(type) {
  const value = lower(type)
  return modules.find((module) => lower(module) === value) || modules.find((module) => value && lower(module).includes(value)) || 'General CRM'
}

function workspaceBusinessType(row = {}) {
  return normalizeBusinessType(row.primaryBusinessType || row.selectedBusinessType || row.currentBusinessType || row.businessType || row.module)
}

function moduleAccessDetails(row = {}) {
  const primary = workspaceBusinessType(row)
  const allowed = row.allModulesAccess === true ? modules : Array.from(
    new Set([primary, ...(Array.isArray(row.allowedBusinessTypes) ? row.allowedBusinessTypes : [])].map(normalizeBusinessType)),
  )
  return {
    primary,
    allowed,
    all: row.allModulesAccess === true || allowed.length === modules.length,
    special: row.specialModuleAccess === true || allowed.length > 1,
  }
}

function clientBlocked(row = {}) {
  return ['blocked', 'disabled', 'inactive'].includes(statusValue(row.status || row.accountStatus, 'active'))
    || row.workspaceAccessDenied === true
}

function moduleSlug(moduleName) {
  return lower(moduleName).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'module'
}

function ownerIdForClient(row = {}) {
  return firstValue(row.ownerUserId, row.ownerId, row.userId, row.uid)
}

function searchTextForClient(client = {}) {
  return [
    client.clientName,
    client.companyName,
    client.contactPerson,
    client.email,
    client.phone,
    client.shortClientId,
    client.workspaceId,
    client.ownerId,
    client.userId,
    client.uid,
    client.ownerUserId,
    client.businessType,
    client.selectedBusinessType,
    client.primaryBusinessType,
    client.plan,
    client.selectedPlan,
    client.subscriptionStatus,
    client.planStatus,
    client.behaviorScore,
    client.behaviorLevel,
    client.behaviorPriority,
    client.behaviorTopModule,
  ].map(lower).join(' ')
}

function behaviorScoreForClient(client = {}, events = [], sessions = []) {
  if (!client?.id) return { score: 0, level: 'not_interested', priority: 'Watch', topModule: '-', events: 0, clicks: 0, lastEventAt: null }
  const ids = new Set([client.id, client.workspaceId, client.ownerId, client.userId, client.uid, client.ownerUserId].filter(Boolean).map(String))
  const emails = [client.email, client.ownerEmail, client.userEmail, client.clientEmail].map(lower).filter(Boolean)
  const phones = [client.phone, client.phoneNumber, client.mobile].map((value) => clean(value).replace(/\D+/g, '')).filter(Boolean)
  const weights = {
    signup_completed: 42,
    workspace_selected: 36,
    upgrade_request_submitted: 40,
    start_free_trial_click: 26,
    signup_started: 24,
    pricing_click: 20,
    business_service_request_submitted: 22,
    module_click: 14,
    login_completed: 10,
    button_click: 5,
    page_view: 1,
  }
  const matches = (row = {}) => {
    const rowIds = [row.workspaceId, row.ownerId, row.userId, row.uid, row.visitorId, row.sessionId].filter(Boolean).map(String)
    if (rowIds.some((id) => ids.has(id))) return true
    const rowEmails = [row.email, row.ownerEmail, row.userEmail, row.clientEmail, row.customerEmail].map(lower).filter(Boolean)
    if (rowEmails.some((email) => emails.includes(email))) return true
    const rowPhones = [row.phone, row.phoneNumber, row.mobile].map((value) => clean(value).replace(/\D+/g, '')).filter(Boolean)
    return rowPhones.some((phone) => phones.includes(phone))
  }
  const modulesMap = new Map()
  let score = 0
  let clicks = 0
  let matchedEvents = 0
  let durationMs = 0
  let lastEventAt = null
  events.filter(matches).forEach((row) => {
    const eventType = row.eventType || 'event'
    const date = toDate(row.timestamp || row.createdAt)
    matchedEvents += 1
    score += weights[eventType] || 2
    durationMs += Number(row.sessionDurationMs || 0) || 0
    if (date && (!lastEventAt || date.getTime() > lastEventAt.getTime())) lastEventAt = date
    if (['button_click', 'module_click', 'pricing_click', 'start_free_trial_click'].includes(eventType)) clicks += 1
    const moduleName = row.moduleName || row.buttonLabel || row.businessType || row.module || ''
    if (moduleName) modulesMap.set(moduleName, (modulesMap.get(moduleName) || 0) + (eventType === 'module_click' ? 3 : 1))
  })
  sessions.filter(matches).forEach((row) => {
    const date = toDate(row.lastActiveAt || row.updatedAt || row.createdAt)
    score += 4
    durationMs += Number(row.sessionDurationMs || 0) || 0
    if (date && (!lastEventAt || date.getTime() > lastEventAt.getTime())) lastEventAt = date
    const moduleName = row.businessType || row.currentBusinessType || row.module || ''
    if (moduleName) modulesMap.set(moduleName, (modulesMap.get(moduleName) || 0) + 1)
  })
  score = Math.min(100, score + Math.min(20, Math.floor(durationMs / 60000) * 3))
  const level = score >= 55 ? 'interested' : score >= 28 ? 'warm' : score >= 10 ? 'cold' : 'not_interested'
  const priority = level === 'interested' ? 'High' : level === 'warm' ? 'Medium' : level === 'cold' ? 'Low' : 'Watch'
  const topModule = [...modulesMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
  return { score, level, priority, topModule, events: matchedEvents, clicks, lastEventAt }
}

function paymentAmount(row = {}) {
  return Number(row.amount ?? row.amountPaid ?? row.price ?? row.total ?? row.planPrice ?? 0) || 0
}

function rowCurrency(row = {}) {
  return row.currency || row.billingCurrency || 'PKR'
}

function isFinalUpgradeRequest(row = {}) {
  const status = statusValue(row?.approvalStatus || row?.status || row?.paymentStatus)
  return ['approved', 'paid', 'active', 'completed', 'rejected', 'declined', 'failed', 'closed'].includes(status)
}

function upgradeRequestIdentity(row = {}) {
  const screenshotKey = clean(row.screenshotKey || row.paymentProofKey || row.screenshot_key)
  if (screenshotKey) return `proof:${screenshotKey}`
  const transactionId = clean(row.transactionId || row.txnId || row.referenceNumber)
  if (transactionId) return `txn:${transactionId.toLowerCase()}`
  const directId = clean(row.id || row.requestId || row.request_id)
  if (directId) return `id:${directId}`
  return [
    clean(row.userId || row.uid || row.email).toLowerCase(),
    clean(row.requestedPlan || row.selectedPlan || row.plan).toLowerCase(),
    clean(row.amount || row.amountPaid || row.planPrice),
    clean(row.createdAt || row.requestedAt || row.created_at),
  ].filter(Boolean).join('|') || 'row:unknown'
}

function upgradeRequestDisplayId(row = {}) {
  return clean(row.id || row.requestId || row.request_id || row.transactionId || row.txnId || row.referenceNumber) || '-'
}

function sameClient(row = {}, client = {}) {
  if (!row || !client?.id) return false
  const ids = new Set([client.id, client.workspaceId, client.ownerId, client.userId, client.uid].filter(Boolean).map(String))
  const rowIds = [
    row.workspaceId,
    row.ownerId,
    row.userId,
    row.uid,
    String(row.path || '').split('/')[1],
  ].filter(Boolean).map(String)
  if (rowIds.some((id) => ids.has(id))) return true
  const clientEmails = [client.email, client.ownerEmail, client.userEmail, client.clientEmail].map(lower).filter(Boolean)
  const rowEmails = [row.email, row.ownerEmail, row.userEmail, row.clientEmail, row.customerEmail, row.contactEmail].map(lower).filter(Boolean)
  return rowEmails.some((email) => clientEmails.includes(email))
}

function issueTitle(row = {}) {
  return firstValue(row.title, row.subject, row.issueTitle, row.ticketNumber, row.id) || 'Support issue'
}

function ticketNumber(row = {}) {
  return firstValue(row.ticketNumber, row.ticketId, row.id)
}

function issueStatus(row = {}) {
  return row.status || 'Open'
}

function isResolved(row = {}) {
  return resolvedStatuses.has(statusValue(issueStatus(row), 'open'))
}

function isOpen(row = {}) {
  const status = statusValue(issueStatus(row), 'open')
  return openStatuses.has(status) || !resolvedStatuses.has(status)
}

function sourceErrorMessage(key, error) {
  const raw = error?.message || String(error || 'Unknown Firestore error')
  if (error?.code === 'permission-denied') return `${key}: backend admin read permission is required.`
  return `${key}: ${raw}`
}

function useDocumentVisible() {
  const [visible, setVisible] = useState(() => (typeof document === 'undefined' ? true : !document.hidden))
  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)
    window.addEventListener('blur', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
      window.removeEventListener('blur', update)
    }
  }, [])
  return visible
}

function useCommandCenterData({ enabled = true } = {}) {
  const [state, setState] = useState({
    users: [],
    workspaces: [],
    upgradeRequests: [],
    platformPayments: [],
    supportTickets: [],
    userSessions: [],
    analyticsEvents: [],
    loading: Boolean(db),
    sourceErrors: {},
  })

  useEffect(() => {
    if (!enabled) {
      setState((current) => ({ ...current, loading: false }))
      return undefined
    }
    if (!db) {
      Promise.resolve().then(() => {
        setState((current) => ({ ...current, loading: false, sourceErrors: { firebase: 'Firebase is not configured.' } }))
      })
      return undefined
    }

    const cache = {
      users: [],
      workspaces: [],
      upgradeRequests: [],
      platformPayments: [],
      supportTickets: [],
      userSessions: [],
      analyticsEvents: [],
    }
    const loaded = new Set()
    const expected = Object.keys(cache).length
    const setRows = (key, rows) => {
      cache[key] = rows
      loaded.add(key)
      setState((current) => ({
        ...current,
        ...cache,
        loading: loaded.size < expected,
        sourceErrors: Object.fromEntries(Object.entries(current.sourceErrors || {}).filter(([source]) => source !== key)),
      }))
    }
    const fail = (key, error) => {
      console.warn('[Client Command Center] Firestore listener failed', { key, code: error?.code || '', message: error?.message || '' })
      setRows(key, [])
      setState((current) => ({
        ...current,
        loading: false,
        sourceErrors: { ...(current.sourceErrors || {}), [key]: sourceErrorMessage(key, error) },
      }))
    }
    const listen = (key, collectionName, rowLimit = 500) => {
      try {
        return onSnapshot(
          query(collection(db, collectionName), limit(rowLimit)),
          (snap) => setRows(key, snap.docs.map(normalizeSnapDoc)),
          (error) => fail(key, error),
        )
      } catch (error) {
        fail(key, error)
        return () => {}
      }
    }
    const listenGroup = (key, groupId, rowLimit = 500) => {
      try {
        return onSnapshot(
          query(collectionGroup(db, groupId), limit(rowLimit)),
          (snap) => setRows(key, snap.docs.map(normalizeSnapDoc)),
          (error) => fail(key, error),
        )
      } catch (error) {
        fail(key, error)
        return () => {}
      }
    }

    const unsubscribers = [
      listen('users', 'users', 180),
      listen('workspaces', 'workspaces', 180),
      listen('upgradeRequests', 'upgradeRequests', 80),
      listen('platformPayments', 'platformPayments', 100),
      listen('userSessions', 'userSessions', 80),
      listen('analyticsEvents', 'analyticsEvents', 100),
      listenGroup('supportTickets', 'supportTickets', 100),
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.())
  }, [enabled])

  return state
}

function StatusPill({ value }) {
  const status = statusValue(value)
  const tone = resolvedStatuses.has(status) || ['active', 'paid', 'approved'].includes(status)
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : ['pending', 'trial', 'in_progress', 'open', 'new'].includes(status)
      ? 'bg-amber-50 text-amber-700 ring-amber-100'
      : ['blocked', 'rejected', 'failed', 'expired'].includes(status)
        ? 'bg-rose-50 text-rose-700 ring-rose-100'
        : 'bg-slate-100 text-slate-600 ring-slate-200'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${tone}`}>{String(value || 'Unknown').replace(/_/g, ' ')}</span>
}

function DarkStatusPill({ value }) {
  const status = statusValue(value)
  const tone = resolvedStatuses.has(status) || ['active', 'paid', 'approved'].includes(status)
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : ['pending', 'trial', 'in_progress', 'open', 'new'].includes(status)
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : ['blocked', 'rejected', 'failed', 'expired', 'urgent', 'high'].includes(status)
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-slate-200 bg-slate-100 text-slate-600'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black capitalize ${tone}`}>{String(value || 'Unknown').replace(/_/g, ' ')}</span>
}

function ActionButton({ icon: Icon, children, active = false, className = '', ...props }) {
  return (
    <button
      type="button"
      className={[
        'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700',
        className,
      ].join(' ')}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}

function DarkActionButton({ icon: Icon, children, active = false, className = '', ...props }) {
  return (
    <button
      type="button"
      className={[
        'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'border border-blue-500/20 bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-600 text-white shadow-[0_14px_34px_-18px_rgba(37,99,235,0.65)]'
          : 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
        className,
      ].join(' ')}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}

function VividActionButton({ icon: Icon, children, tone = 'blue', className = '', ...props }) {
  const tones = {
    blue: 'border-blue-500 bg-blue-600 text-white shadow-[0_12px_28px_-18px_rgba(37,99,235,0.85)] hover:bg-blue-700',
    emerald: 'border-emerald-500 bg-emerald-600 text-white shadow-[0_12px_28px_-18px_rgba(5,150,105,0.85)] hover:bg-emerald-700',
    violet: 'border-violet-500 bg-violet-600 text-white shadow-[0_12px_28px_-18px_rgba(124,58,237,0.85)] hover:bg-violet-700',
    amber: 'border-amber-400 bg-amber-400 text-slate-950 shadow-[0_12px_28px_-18px_rgba(245,158,11,0.85)] hover:bg-amber-500',
  }
  return (
    <button
      type="button"
      className={[
        'inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50',
        tones[tone] || tones.blue,
        className,
      ].join(' ')}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </section>
  )
}

function DarkStatCard({ label, value, helper, icon: Icon, tone }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{helper}</p>
        </div>
      </div>
    </section>
  )
}

function Field({ label, value, copyValue, onCopy }) {
  const canCopy = Boolean(copyValue)
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p>
        {canCopy ? (
          <button type="button" className="rounded-md bg-white px-2 py-0.5 text-[10px] font-black text-blue-700 shadow-sm hover:bg-blue-50" onClick={() => onCopy?.(copyValue, label)}>
            Copy
          </button>
        ) : null}
      </div>
      <p className="mt-1 truncate text-sm font-bold text-slate-800">{value || '-'}</p>
    </div>
  )
}

function DarkField({ label, value, copyValue, onCopy }) {
  const canCopy = Boolean(copyValue)
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        {canCopy ? (
          <button type="button" className="rounded-md border border-blue-100 bg-white px-2 py-0.5 text-[10px] font-black text-blue-700 shadow-sm hover:bg-blue-50" onClick={() => onCopy?.(copyValue, label)}>
            Copy
          </button>
        ) : null}
      </div>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value || '-'}</p>
    </div>
  )
}

function SimpleTable({ columns, rows, empty }) {
  if (!rows.length) {
    return (
      <div className="grid min-h-[9rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-bold text-slate-500">{empty}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          <tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.path || row.id} className="align-top hover:bg-slate-50/70">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-slate-700">
                  {column.render ? column.render(row) : row[column.key] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ModuleAccessBoard({ rows, access, onToggle, onGrantAll, onReset, busy, dark = false }) {
  const Button = dark ? DarkActionButton : ActionButton
  const StatusChip = dark ? DarkStatusPill : StatusPill
  const shellClass = dark
    ? 'overflow-hidden rounded-lg border border-cyan-300/15 bg-[linear-gradient(135deg,#0b1120_0%,#111827_58%,#0f172a_100%)] shadow-[0_18px_60px_-46px_rgba(34,211,238,0.5)]'
    : 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'
  const headerClass = dark ? 'border-white/10' : 'border-slate-100'
  const titleClass = dark ? 'text-white' : 'text-slate-950'
  const mutedClass = dark ? 'text-slate-400' : 'text-slate-500'
  const panelClass = dark ? 'border-white/10 bg-white/[0.035]' : 'border-slate-200 bg-slate-50'
  const rowClass = dark ? 'border-white/10 bg-slate-950/30 hover:border-cyan-300/30 hover:bg-cyan-400/5' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
  const grantedCount = rows.filter((row) => row.granted).length
  const lockedCount = rows.length - grantedCount
  const extraCount = Math.max(grantedCount - 1, 0)
  const progress = rows.length ? Math.round((grantedCount / rows.length) * 100) : 0

  return (
    <section className={shellClass}>
      <div className={`border-b px-4 py-4 ${headerClass}`}>
        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl text-2xl shadow-lg ${dark ? 'border border-cyan-300/25 bg-slate-950 shadow-cyan-950/40' : 'border border-blue-100 bg-white shadow-blue-100/80'}`}>
              <span className="absolute inset-0 bg-[conic-gradient(from_130deg,#22d3ee,#2563eb,#a855f7,#fb7185,#22d3ee)] opacity-80" />
              <span className={`absolute inset-[3px] rounded-[0.85rem] ${dark ? 'bg-slate-950/75' : 'bg-white/80'}`} />
              <span className="relative">🧩</span>
            </span>
            <div className="min-w-0">
              <p className={`text-lg font-black ${titleClass}`}>Client Services</p>
              <p className={`mt-1 max-w-3xl text-sm font-semibold leading-6 ${mutedClass}`}>
                Control which Nexora modules this client can use. Primary workspace stays locked, extras can be granted or removed anytime.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className={`min-w-0 rounded-2xl border p-3 ${panelClass}`}>
              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] ${mutedClass}`}>
                  <span aria-hidden="true">📊</span>
                  Access coverage
                </span>
                <span className={`text-sm font-black ${titleClass}`}>{grantedCount}/{rows.length}</span>
              </div>
              <div className={`mt-2 h-2 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${dark ? 'bg-sky-400/10 text-sky-100 ring-1 ring-sky-300/20' : 'bg-sky-50 text-sky-800 ring-1 ring-sky-100'}`}>
                  <span className="text-sm">🏠</span>
                  Primary: {access.primary ? labelForBusinessType(access.primary) : 'Not set'}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${dark ? 'bg-emerald-400/10 text-emerald-100 ring-1 ring-emerald-300/20' : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'}`}>
                  <span className="text-sm">✅</span>
                  {extraCount} extra
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${dark ? 'bg-rose-400/10 text-rose-100 ring-1 ring-rose-300/20' : 'bg-rose-50 text-rose-800 ring-1 ring-rose-100'}`}>
                  <span className="text-sm">🔒</span>
                  {lockedCount} locked
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button icon={HiOutlineSquares2X2} active={access.all} disabled={!rows.length || busy === 'module-access-all'} onClick={onGrantAll}>
                Enable all
              </Button>
              <Button icon={HiOutlineShieldCheck} active={!access.special || access.allowed.length <= 1} disabled={!rows.length || busy === 'module-access-reset'} onClick={onReset}>
                Primary only
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-2 p-3">
        {rows.map((row) => {
              const descriptionClass = row.granted
                ? dark ? 'text-slate-200' : 'text-slate-700'
                : dark ? 'text-slate-400' : 'text-slate-500'
              return (
            <article key={row.id} className={`min-w-0 rounded-2xl border px-3 py-3 transition sm:px-4 ${rowClass}`}>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_8rem_13rem] xl:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl text-xl shadow-sm ring-1 transition ${dark ? row.visual.accent : row.visual.light} ${row.granted ? 'scale-100 shadow-lg ring-white/20' : 'opacity-80 grayscale-[0.25]'}`}>
                    <span className={`absolute inset-0 ${row.granted ? 'bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.78),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent_48%,rgba(0,0,0,0.08))' : 'bg-white/5'}`} />
                    <span className="relative drop-shadow-sm">{row.visual.emoji}</span>
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-black ${titleClass}`}>{row.label}</p>
                    <p className={`mt-1 text-xs leading-5 ${descriptionClass}`}>{row.visual.description}</p>
                  </div>
                </div>
                <div className="flex xl:justify-center">
                  <StatusChip value={row.primary ? 'Primary' : row.granted ? 'Enabled' : 'Locked'} />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                  {row.primary ? (
                    <span className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black ${dark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      <HiOutlineLockClosed className="h-4 w-4" />
                      Primary module
                    </span>
                  ) : (
                    <Button
                      icon={row.granted ? HiOutlineMinus : HiOutlinePlus}
                      active={row.granted}
                      disabled={busy === `module-${moduleSlug(row.id)}`}
                      onClick={() => onToggle(row.id)}
                    >
                      {row.granted ? 'Revoke extra access' : 'Grant extra access'}
                    </Button>
                  )}
                  {row.granted && !row.primary ? (
                    <span className={`hidden text-xs font-semibold xl:inline ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Extra access</span>
                  ) : null}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function buildResolutionEmail({ clientName, ticketId, title, resolutionNote }) {
  const message = `Your support issue ${ticketId ? `(${ticketId}) ` : ''}"${title}" has been resolved.${resolutionNote ? ` Resolution note: ${resolutionNote}` : ''}`
  const safeClientName = escapeHtml(clientName || 'there')
  const safeTicketId = escapeHtml(ticketId || '-')
  const safeTitle = escapeHtml(title || '-')
  const safeResolutionNote = escapeHtml(resolutionNote || 'Resolved by Nexora support.')
  const safeMessage = escapeHtml(message)
  const html = `
    <div style="margin:0;background:#f8fafc;padding:28px 14px;font-family:Inter,Arial,sans-serif;color:#0f172a">
      <div style="margin:0 auto;max-width:640px;border:1px solid #dbeafe;border-radius:18px;background:#ffffff;overflow:hidden">
        <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:26px 28px;color:#ffffff">
          <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#dbeafe">Nexora Solution</p>
          <h1 style="margin:0;font-size:24px;line-height:1.25">Your Nexora support issue has been resolved</h1>
        </div>
        <div style="padding:28px">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155">Hi ${safeClientName},</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155">${safeMessage}</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
            <tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-weight:700">Ticket ID</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;font-weight:800;text-align:right">${safeTicketId}</td></tr>
            <tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-weight:700">Issue</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;font-weight:800;text-align:right">${safeTitle}</td></tr>
            <tr><td style="padding:12px;color:#64748b;font-weight:700">Resolution note</td><td style="padding:12px;font-weight:800;text-align:right">${safeResolutionNote}</td></tr>
          </table>
          <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#64748b">Reply to this email if you need anything else.</p>
        </div>
      </div>
    </div>
  `
  return {
    subject: 'Your Nexora support issue has been resolved',
    message,
    html,
  }
}

export default function ClientCommandCenter({ embedded = false } = {}) {
  const { user } = useAuth()
  const pageVisible = useDocumentVisible()
  const searchRef = useRef(null)
  const backendAdminAllowed = isBackendAdminEmail(user?.email)
  const data = useCommandCenterData({ enabled: backendAdminAllowed && pageVisible })
  const [search, setSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedIssueId, setSelectedIssueId] = useState('')
  const [showLongClientId, setShowLongClientId] = useState(false)
  const [activeTab, setActiveTab] = useState('services')
  const [activeAction, setActiveAction] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState('In Progress')
  const [resolutionNote, setResolutionNote] = useState('')
  const [ticketDraft, setTicketDraft] = useState({ title: '', description: '', priority: 'medium', module: 'General CRM' })
  const [emailDraft, setEmailDraft] = useState({ subject: 'Your Nexora support issue has been resolved', message: '' })
  const [workerUpgradeRequests, setWorkerUpgradeRequests] = useState([])
  const [workerUpgradeError, setWorkerUpgradeError] = useState('')
  const [passkeySecurity, setPasskeySecurity] = useState({ passkeys: [], loginHistory: [], activeSessions: [] })
  const [passkeySecurityError, setPasskeySecurityError] = useState('')
  const [securityExpanded, setSecurityExpanded] = useState(false)
  const [upgradeExpanded, setUpgradeExpanded] = useState(false)
  const [upgradeRejectingId, setUpgradeRejectingId] = useState('')
  const [upgradeRejectReason, setUpgradeRejectReason] = useState('')
  const [liveNow, setLiveNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = () => setLiveNow(Date.now())
    tick()
    const timer = window.setInterval(() => {
      if (!document.hidden) tick()
    }, 30000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  useEffect(() => {
    if (!backendAdminAllowed || !user?.getIdToken) return undefined
    let cancelled = false
    async function loadWorkerRequests() {
      if (document.hidden) return
      try {
        const token = await user.getIdToken()
        const rows = await listWorkerUpgradeRequests(token, 100)
        if (!cancelled) {
          setWorkerUpgradeRequests(rows)
          setWorkerUpgradeError('')
        }
      } catch (error) {
        if (!cancelled) setWorkerUpgradeError(clientSafeMessage(error, 'Cloudflare upgrade requests are not available.'))
      }
    }
    loadWorkerRequests()
    window.addEventListener('focus', loadWorkerRequests)
    const timer = window.setInterval(loadWorkerRequests, 120000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', loadWorkerRequests)
    }
  }, [backendAdminAllowed, user])

  useEffect(() => {
    if (!backendAdminAllowed || !user?.getIdToken) return undefined
    let cancelled = false
    async function loadPasskeySecurity() {
      if (document.hidden) return
      try {
        const result = await adminListPasskeySecurity('')
        if (!cancelled) {
          setPasskeySecurity(result || { passkeys: [], loginHistory: [], activeSessions: [] })
          setPasskeySecurityError('')
        }
      } catch (error) {
        if (!cancelled) setPasskeySecurityError(clientSafeMessage(error, 'Passkey security data is not available.'))
      }
    }
    loadPasskeySecurity()
    window.addEventListener('focus', loadPasskeySecurity)
    const timer = window.setInterval(loadPasskeySecurity, 120000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', loadPasskeySecurity)
    }
  }, [backendAdminAllowed, user])

  const usersById = useMemo(() => {
    const map = new Map()
    data.users.forEach((row) => {
      ;[row.id, row.uid, row.userId].filter(Boolean).forEach((id) => map.set(String(id), row))
    })
    return map
  }, [data.users])

  const clients = useMemo(() => {
    return data.workspaces.map((workspace) => {
      const id = workspaceIdFor(workspace)
      const owner = usersById.get(String(workspace.ownerId || workspace.userId || workspace.uid || id)) || {}
      const baseClient = {
        ...owner,
        ...workspace,
        id,
        workspaceId: id,
        shortClientId: resolveClientShortId({ ...owner, ...workspace, workspaceId: id }),
        ownerUserId: firstValue(owner.uid, owner.userId, workspace.ownerId, workspace.userId, workspace.uid),
        clientName: firstValue(workspace.clientName, workspace.ownerName, owner.fullName, owner.displayName, owner.name, workspaceName(workspace)),
        companyName: workspaceName(workspace),
        contactPerson: firstValue(workspace.contactPerson, workspace.ownerName, owner.fullName, owner.displayName, owner.name),
        email: emailFor({ ...owner, ...workspace }),
        phone: phoneFor({ ...owner, ...workspace }),
      }
      const behavior = behaviorScoreForClient(baseClient, data.analyticsEvents, data.userSessions)
      return {
        ...baseClient,
        behaviorScore: behavior.score,
        behaviorLevel: behavior.level,
        behaviorPriority: behavior.priority,
        behaviorTopModule: behavior.topModule,
        behaviorEvents: behavior.events,
        behaviorClicks: behavior.clicks,
        behaviorLastEventAt: behavior.lastEventAt,
      }
    }).filter((client) => client.id)
      .sort((a, b) => {
        const aTime = toDate(a.createdAt || a.signupAt || a.joinedAt || a.updatedAt || a.lastActiveAt)?.getTime() || 0
        const bTime = toDate(b.createdAt || b.signupAt || b.joinedAt || b.updatedAt || b.lastActiveAt)?.getTime() || 0
        return bTime - aTime
      })
  }, [data.analyticsEvents, data.userSessions, data.workspaces, usersById])

  const searchedClients = useMemo(() => {
    const q = lower(search)
    if (!q) return clients
    return clients.filter((client) => {
      return searchTextForClient(client).includes(q)
    })
  }, [clients, search])

  useEffect(() => {
    const q = lower(search)
    const pool = q ? searchedClients : clients
    if (selectedClientId && pool.some((client) => client.id === selectedClientId)) return
    Promise.resolve().then(() => setSelectedClientId(pool[0]?.id || ''))
  }, [clients, search, searchedClients, selectedClientId])

  const selectedClient = useMemo(
    () => searchedClients.find((client) => client.id === selectedClientId) || searchedClients[0] || null,
    [searchedClients, selectedClientId],
  )
  const clientSessions = useMemo(
    () => data.userSessions
      .filter((session) => sameClient(session, selectedClient))
      .sort((a, b) => (toDate(b.lastActiveAt)?.getTime() || 0) - (toDate(a.lastActiveAt)?.getTime() || 0)),
    [data.userSessions, selectedClient],
  )
  const clientPasskeys = useMemo(
    () => (passkeySecurity.passkeys || [])
      .filter((passkey) => sameClient(passkey, selectedClient))
      .sort((a, b) => (toDate(b.lastUsed || b.updatedAt || b.createdAt)?.getTime() || 0) - (toDate(a.lastUsed || a.updatedAt || a.createdAt)?.getTime() || 0)),
    [passkeySecurity.passkeys, selectedClient],
  )
  const clientLoginHistory = useMemo(
    () => (passkeySecurity.loginHistory || [])
      .filter((entry) => sameClient(entry, selectedClient))
      .sort((a, b) => (toDate(b.createdAt || b.date || b.time)?.getTime() || 0) - (toDate(a.createdAt || a.date || a.time)?.getTime() || 0)),
    [passkeySecurity.loginHistory, selectedClient],
  )
  const latestClientSession = clientSessions[0] || null
  const latestClientPasskey = clientPasskeys[0] || null
  const activeClientPasskeys = clientPasskeys.filter((row) => statusValue(row.status, 'active') === 'active')
  const blockedClientPasskeys = clientPasskeys.filter((row) => ['disabled', 'deleted', 'removed'].includes(statusValue(row.status)))
  const failedClientPasskeyAttempts = clientLoginHistory.filter((row) => statusValue(row.authenticationMethod || row.method) === 'passkey' && statusValue(row.status) === 'failed').length
  const successfulClientPasskeyLogins = clientLoginHistory.filter((row) => statusValue(row.authenticationMethod || row.method) === 'passkey' && statusValue(row.status) === 'success').length
  const passwordClientLogins = clientLoginHistory.filter((row) => statusValue(row.authenticationMethod || row.method) === 'password' && statusValue(row.status) === 'success').length
  const googleClientLogins = clientLoginHistory.filter((row) => statusValue(row.authenticationMethod || row.method) === 'google' && statusValue(row.status) === 'success').length
  const latestClientLogin = clientLoginHistory[0] || null
  const latestClientActiveAt = latestClientSession?.lastActiveAt || selectedClient?.lastActiveAt || selectedClient?.lastAccessedAt || selectedClient?.lastLoginAt
  const clientOnline = Boolean(toDate(latestClientActiveAt) && liveNow - toDate(latestClientActiveAt).getTime() <= 5 * 60 * 1000)
  const clientPresenceLabel = clientOnline ? 'Online now' : latestClientActiveAt ? `Offline · last seen ${relativeTimeLabel(latestClientActiveAt, liveNow)}` : 'No live session yet'
  const clientUsageLabel = latestClientSession
    ? `${latestClientSession.lastEventType || 'active'} · ${latestClientSession.page || latestClientSession.businessType || latestClientSession.browser || 'workspace'}`
    : 'Waiting for client activity'
  const searchIsActive = Boolean(lower(search))
  const searchMatches = searchedClients.length

  const clientTickets = useMemo(
    () => data.supportTickets.filter((ticket) => sameClient(ticket, selectedClient)),
    [data.supportTickets, selectedClient],
  )

  useEffect(() => {
    if (selectedIssueId && clientTickets.some((ticket) => ticket.id === selectedIssueId || ticket.path === selectedIssueId)) return
    const firstOpen = clientTickets.find(isOpen) || clientTickets[0]
    Promise.resolve().then(() => setSelectedIssueId(firstOpen?.path || firstOpen?.id || ''))
  }, [clientTickets, selectedIssueId])

  const selectedIssue = useMemo(
    () => clientTickets.find((ticket) => ticket.path === selectedIssueId || ticket.id === selectedIssueId) || clientTickets[0] || null,
    [clientTickets, selectedIssueId],
  )

  useEffect(() => {
    Promise.resolve().then(() => {
      setStatusDraft(selectedIssue?.status || 'In Progress')
      setEmailDraft({
        subject: 'Your Nexora support issue has been resolved',
        message: selectedIssue
          ? buildResolutionEmail({
              clientName: selectedClient?.clientName,
              ticketId: ticketNumber(selectedIssue),
              title: issueTitle(selectedIssue),
              resolutionNote,
            }).message
          : '',
      })
    })
  }, [resolutionNote, selectedClient?.clientName, selectedIssue])

  const clientPayments = useMemo(
    () => data.platformPayments.filter((row) => sameClient(row, selectedClient)),
    [data.platformPayments, selectedClient],
  )
  const clientRequests = useMemo(() => {
    const byKey = new Map()
    ;[...workerUpgradeRequests, ...data.upgradeRequests]
      .filter(Boolean)
      .filter((row) => sameClient(row, selectedClient))
      .forEach((row) => {
        const key = upgradeRequestIdentity(row)
        const existing = byKey.get(key)
        byKey.set(key, existing ? { ...row, ...existing } : row)
      })
    return [...byKey.values()]
  }, [data.upgradeRequests, selectedClient, workerUpgradeRequests])
  const sortedClientRequests = useMemo(
    () => clientRequests.filter(Boolean).sort((a, b) => (toDate(b?.createdAt || b?.requestedAt || b?.updatedAt)?.getTime() || 0) - (toDate(a?.createdAt || a?.requestedAt || a?.updatedAt)?.getTime() || 0)),
    [clientRequests],
  )
  const pendingClientRequests = sortedClientRequests.filter((row) => ['pending', 'pending_approval', 'waiting', 'new', 'under_review'].includes(statusValue(row?.approvalStatus || row?.status || row?.paymentStatus)))
  const approvedClientRequests = sortedClientRequests.filter((row) => ['approved', 'paid', 'active', 'completed'].includes(statusValue(row?.approvalStatus || row?.status || row?.paymentStatus)))
  const rejectedClientRequests = sortedClientRequests.filter((row) => ['rejected', 'declined', 'failed'].includes(statusValue(row?.approvalStatus || row?.status || row?.paymentStatus)))
  const latestClientRequest = sortedClientRequests[0] || null
  const accessDetails = selectedClient ? moduleAccessDetails(selectedClient) : { primary: '', allowed: [], special: false, all: false }
  const activeModules = accessDetails.allowed
  const selectedClientBlocked = selectedClient ? clientBlocked(selectedClient) : false
  const totalSpent = clientPayments
    .filter((row) => ['paid', 'approved', 'completed'].includes(statusValue(row?.paymentStatus || row?.status || row?.approvalStatus)))
    .reduce((sum, row) => sum + paymentAmount(row), 0)
  const currency = rowCurrency(clientPayments[0] || selectedClient || {})
  const outstandingAmount = Number(selectedClient?.outstandingAmount ?? selectedClient?.balanceDue ?? selectedClient?.dueAmount ?? 0) || 0
  const openIssues = clientTickets.filter(isOpen)
  const resolvedIssues = clientTickets.filter(isResolved)
  const notes = clientTickets.flatMap((ticket) => {
    const supportNotes = Array.isArray(ticket.supportNotes) ? ticket.supportNotes : Array.isArray(ticket.notes) ? ticket.notes : []
    const textNote = ticket.internalNotes ? [{ id: `${ticket.id}-internal`, message: ticket.internalNotes, author: 'Internal', createdAt: ticket.updatedAt || ticket.createdAt }] : []
    return [...supportNotes, ...textNote].map((note, index) => ({ ...note, id: note.id || `${ticket.id}-${index}`, ticket }))
  })
  const emailHistory = clientTickets.flatMap((ticket) => (Array.isArray(ticket.emailHistory) ? ticket.emailHistory : []).map((email, index) => ({
    ...email,
    id: email.id || `${ticket.id}-email-${index}`,
    ticket,
  })))

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  async function copyClientValue(value, label = 'Value') {
    const text = String(value || '').trim()
    if (!text) return
    try {
      await navigator.clipboard?.writeText(text)
      notify(`${label} copied.`)
    } catch {
      setError(`Could not copy ${label}.`)
    }
  }

  function ticketRef(row) {
    if (row?.ref) return row.ref
    if (!db || !row?.id) return null
    return doc(db, 'supportTickets', row.id)
  }

  async function runAction(id, action, success) {
    if (needsBackendWarning(id) && !window.confirm(backendWarningMessage(id))) return
    if (!backendAdminAllowed) {
      setError('Backend admin access required.')
      return
    }
    if (!db) {
      setError('Firebase is not configured.')
      return
    }
    setBusy(id)
    setError('')
    try {
      await action()
      notify(success)
    } catch (actionError) {
      setError(clientSafeMessage(actionError, 'Action failed.'))
    } finally {
      setBusy('')
    }
  }

  async function addUpgradeTimeline(row, entry) {
    if (!row?.id) return
    await addDoc(collection(db, 'upgradeRequests', row.id, 'timeline'), {
      ...entry,
      actor: 'admin',
      actorName: user?.email || 'Nexora Team',
      createdAt: serverTimestamp(),
    })
  }

  async function approveClientUpgrade(row, markPaidOnly = false) {
    if (!row?.id) throw new Error('Upgrade request is missing.')
    if (isFinalUpgradeRequest(row)) throw new Error('This upgrade request is already completed.')
    const ownerId = row.ownerId || row.uid || row.userId || ownerIdForClient(selectedClient)
    const workspaceId = row.workspaceId || selectedClient?.workspaceId || selectedClient?.id || ownerId
    if (!ownerId) throw new Error('Owner user ID is required to approve subscription upgrades.')
    if (!workspaceId) throw new Error('Workspace ID is required to approve subscription upgrades.')
    const plan = row.requestedPlan || row.selectedPlan || row.plan || selectedClient?.plan || 'Standard'
    const subscriptionPayload = buildApprovedSubscriptionPayload({
      plan,
      billingCycle: row.billingCycle || 'monthly',
      amount: paymentAmount(row),
      currency: rowCurrency(row),
      approvedBy: user?.uid || user?.email || '',
      approvedByEmail: user?.email || '',
    })
    const requestUpdate = {
      status: 'approved',
      approvalStatus: 'approved',
      paymentStatus: 'paid',
      approvedBy: subscriptionPayload.approvedBy,
      approvedByEmail: subscriptionPayload.approvedByEmail,
      approvedAt: subscriptionPayload.approvedAt,
      subscriptionExpiresAt: subscriptionPayload.subscriptionExpiresAt,
      nextBillingDate: subscriptionPayload.nextBillingDate,
      updatedAt: subscriptionPayload.updatedAt,
    }
    const batch = writeBatch(db)
    if (row.source !== 'cloudflare-d1') batch.update(row.ref || doc(db, 'upgradeRequests', row.id), requestUpdate)
    batch.set(doc(db, 'users', ownerId), subscriptionPayload, { merge: true })
    batch.set(doc(db, 'workspaces', workspaceId), { ...subscriptionPayload, ownerId, userId: workspaceId, workspaceId }, { merge: true })
    batch.set(doc(db, 'platformPayments', row.source === 'cloudflare-d1' ? `d1-${row.id}` : row.id), {
      clientEmail: row.clientEmail || row.email || selectedClient?.email || '',
      workspaceId,
      workspaceName: row.workspaceName || selectedClient?.companyName || '',
      plan,
      amount: paymentAmount(row),
      currency: rowCurrency(row),
      transactionId: row.transactionId || '',
      senderName: row.senderName || '',
      senderNumber: row.senderNumber || row.userPhone || selectedClient?.phone || '',
      paymentMethod: row.paymentMethod || 'Manual',
      paymentProof: row.paymentProof || row.screenshotUrl || '',
      status: 'paid',
      paymentStatus: 'paid',
      approvedBy: subscriptionPayload.approvedBy,
      approvedByEmail: subscriptionPayload.approvedByEmail,
      approvedAt: subscriptionPayload.approvedAt,
      subscriptionExpiresAt: subscriptionPayload.subscriptionExpiresAt,
      nextBillingDate: subscriptionPayload.nextBillingDate,
      source: row.source === 'cloudflare-d1' ? 'cloudflare-d1-upgradeRequests' : 'upgradeRequests',
      sourceId: row.id,
      updatedAt: subscriptionPayload.updatedAt,
    }, { merge: true })
    await batch.commit()
    if (row.source === 'cloudflare-d1') {
      const token = await user.getIdToken()
      const result = await updateWorkerUpgradeRequestStatus(token, row.id, 'approved')
      setWorkerUpgradeRequests((current) => current.map((item) => (item.id === row.id ? result.request || { ...item, ...requestUpdate } : item)))
      const { ref, ...mirrorBase } = row
      await setDoc(doc(db, 'upgradeRequests', row.id), { ...mirrorBase, ...requestUpdate, id: row.id, source: row.source || 'cloudflare-d1' }, { merge: true })
    }
    await addUpgradeTimeline(row, {
      type: 'approved',
      status: 'approved',
      title: markPaidOnly ? 'Payment marked paid' : 'Request approved',
      message: markPaidOnly ? 'Your upgrade payment has been marked as paid.' : 'Your upgrade request has been approved. Your workspace plan has been updated.',
    })
  }

  async function rejectClientUpgrade(row) {
    if (!row?.id) throw new Error('Upgrade request is missing.')
    if (isFinalUpgradeRequest(row)) throw new Error('This upgrade request is already completed.')
    const reason = upgradeRejectReason.trim()
    if (!reason) throw new Error('Reject reason is required.')
    const requestUpdate = {
      status: 'rejected',
      approvalStatus: 'rejected',
      paymentStatus: 'rejected',
      rejectionReason: reason,
      adminRemark: reason,
      latestAdminRemark: reason,
      rejectedBy: user?.uid || user?.email || '',
      rejectedByEmail: user?.email || '',
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    if (row.source === 'cloudflare-d1') {
      const token = await user.getIdToken()
      const result = await updateWorkerUpgradeRequestStatus(token, row.id, 'rejected')
      setWorkerUpgradeRequests((current) => current.map((item) => (item.id === row.id ? result.request || { ...item, ...requestUpdate } : item)))
      const { ref, ...mirrorBase } = row
      await setDoc(doc(db, 'upgradeRequests', row.id), { ...mirrorBase, ...requestUpdate, id: row.id, source: row.source || 'cloudflare-d1' }, { merge: true })
    } else {
      await updateDoc(row.ref || doc(db, 'upgradeRequests', row.id), requestUpdate)
    }
    await addUpgradeTimeline(row, {
      type: 'rejected',
      status: 'rejected',
      title: 'Request rejected',
      message: reason,
    })
    setUpgradeRejectingId('')
    setUpgradeRejectReason('')
  }

  function notePayload(message, extra = {}) {
    return {
      id: `note_${Date.now()}`,
      author: user?.email || 'Backend Admin',
      authorUid: user?.uid || '',
      message,
      createdAt: new Date().toISOString(),
      internal: true,
      ...extra,
    }
  }

  function clientTimelinePayload(message, extra = {}) {
    return {
      id: `admin_${Date.now()}`,
      author: 'Nexora Support',
      authorUid: user?.uid || '',
      message,
      createdAt: new Date().toISOString(),
      source: 'command_center',
      visibility: 'client',
      ...extra,
    }
  }

  async function saveModuleAccess(nextModules, action = 'module_access_updated') {
    if (!selectedClient?.workspaceId) throw new Error('Select a client workspace first.')
    const primary = accessDetails.primary || workspaceBusinessType(selectedClient)
    const allowedBusinessTypes = Array.from(new Set([primary, ...nextModules].map(normalizeBusinessType)))
      .filter((moduleName) => modules.includes(moduleName))
    const normalizedAllowed = allowedBusinessTypes.length ? allowedBusinessTypes : [primary]
    const payload = {
      primaryBusinessType: primary,
      allowedBusinessTypes: normalizedAllowed,
      specialModuleAccess: normalizedAllowed.length > 1,
      allModulesAccess: normalizedAllowed.length === modules.length,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    }
    await setDoc(doc(db, 'workspaces', selectedClient.workspaceId), payload, { merge: true })
    const ownerId = ownerIdForClient(selectedClient)
    if (ownerId) {
      await setDoc(doc(db, 'users', ownerId), payload, { merge: true })
    }

    const notificationTargets = Array.from(new Set([ownerId, selectedClient.uid, selectedClient.userId, selectedClient.ownerId].filter(Boolean).map(String)))
    if (notificationTargets.length) {
      const notificationsRef = collection(db, 'workspaces', selectedClient.workspaceId, 'notifications')
      await Promise.all(notificationTargets.map((targetUserId) => setDoc(doc(notificationsRef), {
        workspaceId: selectedClient.workspaceId,
        ownerId: selectedClient.workspaceId,
        userId: targetUserId,
        businessType: primary,
        type: 'Workspace',
        priority: 'medium',
        title: 'Module access updated',
        message: normalizedAllowed.length > 1
          ? `Extra module access is now enabled: ${normalizedAllowed.map(labelForBusinessType).join(', ')}.`
          : `Module access was reset to ${labelForBusinessType(primary)}.`,
        route: '/app/dashboard',
        relatedId: selectedClient.workspaceId,
        metadata: { action, allowedBusinessTypes: normalizedAllowed },
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid || '',
        createdByEmail: user?.email || '',
      }, { merge: true })))
    }
  }

  async function toggleModuleAccess(moduleName) {
    const normalized = normalizeBusinessType(moduleName)
    const current = new Set(accessDetails.allowed)
    if (normalized === accessDetails.primary) return
    if (current.has(normalized)) current.delete(normalized)
    else current.add(normalized)
    await saveModuleAccess(Array.from(current), current.has(normalized) ? 'module_extra_access_enabled' : 'module_extra_access_disabled')
  }

  async function grantAllModules() {
    await saveModuleAccess(modules, 'module_access_all_enabled')
  }

  async function resetPrimaryModule() {
    await saveModuleAccess([accessDetails.primary || workspaceBusinessType(selectedClient)], 'module_access_reset_primary')
  }

  async function saveClientAccessStatus(active) {
    if (!selectedClient?.workspaceId) throw new Error('Select a client workspace first.')
    const ownerId = ownerIdForClient(selectedClient)
    const payload = {
      status: active ? 'active' : 'blocked',
      accountStatus: active ? 'active' : 'blocked',
      workspaceAccessDenied: !active,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
      ...(active ? { activatedAt: serverTimestamp(), activatedByEmail: user?.email || '' } : { deactivatedAt: serverTimestamp(), deactivatedByEmail: user?.email || '' }),
    }
    await setDoc(doc(db, 'workspaces', selectedClient.workspaceId), payload, { merge: true })
    if (ownerId) {
      await setDoc(doc(db, 'users', ownerId), payload, { merge: true })
    }

    const notificationTargets = Array.from(new Set([ownerId, selectedClient.uid, selectedClient.userId, selectedClient.ownerId].filter(Boolean).map(String)))
    if (notificationTargets.length) {
      const notificationsRef = collection(db, 'workspaces', selectedClient.workspaceId, 'notifications')
      await Promise.all(notificationTargets.map((targetUserId) => setDoc(doc(notificationsRef), {
        workspaceId: selectedClient.workspaceId,
        ownerId: selectedClient.workspaceId,
        userId: targetUserId,
        businessType: workspaceBusinessType(selectedClient),
        type: 'Workspace',
        priority: active ? 'medium' : 'high',
        title: active ? 'Workspace activated' : 'Workspace deactivated',
        message: active
          ? 'Your Nexora workspace access has been activated by the backend team.'
          : 'Your Nexora workspace access has been paused by the backend team. Contact Nexora support for help.',
        route: '/app/dashboard',
        relatedId: selectedClient.workspaceId,
        metadata: { action: active ? 'client_activated' : 'client_deactivated' },
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid || '',
        createdByEmail: user?.email || '',
      }, { merge: true })))
    }
  }

  async function addNote(message = noteDraft) {
    const note = clean(message)
    if (!selectedIssue || !note) return
    const ref = ticketRef(selectedIssue)
    if (!ref) throw new Error('Ticket reference is missing.')
    const existingText = clean(selectedIssue.internalNotes)
    const supportNote = notePayload(note, { visibility: 'client', source: 'command_center' })
    const clientTimelineNote = clientTimelinePayload(note, { kind: 'admin_note' })
    await updateDoc(ref, {
      supportNotes: arrayUnion(supportNote),
      comments: arrayUnion(clientTimelineNote),
      conversation: arrayUnion(clientTimelineNote),
      internalNotes: [existingText, `${new Date().toLocaleString()} - ${user?.email || 'Admin'}: ${note}`].filter(Boolean).join('\n'),
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    })
    if (selectedClient?.workspaceId) {
      const ownerId = ownerIdForClient(selectedClient)
      const notificationTargets = Array.from(new Set([ownerId, selectedClient.uid, selectedClient.userId, selectedClient.ownerId].filter(Boolean).map(String)))
      const notificationsRef = collection(db, 'workspaces', selectedClient.workspaceId, 'notifications')
      await Promise.all(notificationTargets.map((targetUserId) => setDoc(doc(notificationsRef), {
        workspaceId: selectedClient.workspaceId,
        ownerId: selectedClient.workspaceId,
        userId: targetUserId,
        businessType: workspaceBusinessType(selectedClient),
        type: 'Support',
        priority: 'medium',
        title: 'New ticket note',
        message: note,
        route: '/app/support',
        relatedId: selectedIssue.id || selectedIssue.ticketNumber || '',
        metadata: { ticketNumber: ticketNumber(selectedIssue), action: 'command_center_note' },
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid || '',
        createdByEmail: user?.email || '',
      }, { merge: true })))
    }
    setNoteDraft('')
  }

  async function createTicket() {
    if (!selectedClient?.workspaceId) throw new Error('Select a client workspace first.')
    if (!clean(ticketDraft.title)) throw new Error('Ticket title is required.')
    const id = `${Date.now()}`
    const payload = {
      ticketNumber: `TCK-${id.slice(-6)}`,
      title: clean(ticketDraft.title),
      subject: clean(ticketDraft.title),
      message: clean(ticketDraft.description),
      description: clean(ticketDraft.description),
      priority: ticketDraft.priority,
      module: ticketDraft.module,
      category: ticketDraft.module,
      status: 'Open',
      clientEmail: selectedClient.email || '',
      customerEmail: selectedClient.email || '',
      customerName: selectedClient.clientName || selectedClient.companyName || '',
      workspaceId: selectedClient.workspaceId,
      workspaceName: selectedClient.companyName || '',
      businessType: workspaceBusinessType(selectedClient),
      comments: [],
      conversation: [],
      supportNotes: [notePayload('Ticket created from Client Command Center.', { system: true })],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user?.uid || '',
      createdByEmail: user?.email || '',
    }
    await setDoc(doc(db, 'workspaces', selectedClient.workspaceId, 'supportTickets', id), payload)
    setTicketDraft({ title: '', description: '', priority: 'medium', module: workspaceBusinessType(selectedClient) })
    setActiveTab('tickets')
  }

  async function updateIssueStatus() {
    if (!selectedIssue) return
    await updateDoc(ticketRef(selectedIssue), {
      status: statusDraft,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    })
  }

  async function resolveIssue() {
    if (!selectedIssue) return
    const note = clean(resolutionNote) || 'Issue resolved by Nexora support.'
    const existingNotes = Array.isArray(selectedIssue.supportNotes)
      ? selectedIssue.supportNotes
      : Array.isArray(selectedIssue.notes)
        ? selectedIssue.notes
        : []
    const existingText = clean(selectedIssue.internalNotes)
    await updateDoc(ticketRef(selectedIssue), {
      status: 'Resolved',
      resolvedAt: serverTimestamp(),
      resolutionNote: note,
      supportNotes: [...existingNotes, notePayload(`Resolved issue. ${note}`, { system: true, resolution: true })],
      internalNotes: [existingText, `${new Date().toLocaleString()} - ${user?.email || 'Admin'}: Resolved issue. ${note}`].filter(Boolean).join('\n'),
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || '',
      updatedByEmail: user?.email || '',
    })
    setStatusDraft('Resolved')
    setActiveAction('sendEmail')
  }

  async function sendResolutionEmail() {
    if (!selectedClient?.email) throw new Error('Client email is missing.')
    if (!selectedIssue) throw new Error('Select an issue first.')
    const email = buildResolutionEmail({
      clientName: selectedClient.clientName,
      ticketId: ticketNumber(selectedIssue),
      title: issueTitle(selectedIssue),
      resolutionNote: clean(resolutionNote) || clean(selectedIssue.resolutionNote) || 'Resolved by Nexora support.',
    })
    const subject = clean(emailDraft.subject) || email.subject
    const message = clean(emailDraft.message) || email.message
    const result = await sendWorkerEmail({ to: selectedClient.email, subject, html: email.html })
    if (!result.ok) throw new Error(result.error || 'Email could not be sent.')
    const existing = Array.isArray(selectedIssue.emailHistory) ? selectedIssue.emailHistory : []
    await updateDoc(ticketRef(selectedIssue), {
      emailHistory: [
        ...existing,
        {
          id: `email_${Date.now()}`,
          to: selectedClient.email,
          subject,
          message,
          type: 'resolution',
          status: 'sent',
          sentAt: new Date().toISOString(),
          sentBy: user?.email || '',
        },
      ],
      resolutionEmailSentAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    setActiveTab('emailHistory')
  }

  const profile = selectedClient ? {
    'Client name': selectedClient.clientName,
    'Short Client ID': selectedClient.shortClientId,
    'Company name': selectedClient.companyName,
    'Contact person': selectedClient.contactPerson,
    Email: selectedClient.email,
    Phone: selectedClient.phone,
    'IP address': ipFor(selectedClient) || 'IP not captured',
    Location: firstValue(selectedClient.location, selectedClient.city, selectedClient.country, selectedClient.address),
    ...(showLongClientId ? { 'Full Client ID': selectedClient.workspaceId } : {}),
    'Account status': selectedClient.status || selectedClient.accountStatus || selectedClient.subscriptionStatus || 'active',
    'Live status': clientPresenceLabel,
    'Current usage': clientUsageLabel,
    'Total spent': money(totalSpent, currency),
    'Outstanding amount': money(outstandingAmount, currency),
    'Last login': dateTimeLabel(selectedClient.lastLoginAt || selectedClient.lastActiveAt || selectedClient.lastAccessedAt),
    'Last active': dateTimeLabel(latestClientActiveAt),
    'Joined date': dateLabel(selectedClient.createdAt || selectedClient.signupAt || selectedClient.joinedAt),
    'Preferred contact method': selectedClient.preferredContactMethod || (selectedClient.phone ? 'Phone' : 'Email'),
  } : {}

  const tabs = [
    ['services', 'Client Services'],
    ['tickets', 'Tickets'],
    ['issues', 'Issues'],
    ['notes', 'Notes'],
    ['invoices', 'Invoices'],
    ['payments', 'Payments'],
    ['emailHistory', 'Email History'],
  ]

  const serviceRows = modules.map((moduleName) => {
    const visual = moduleVisuals[moduleName] || { emoji: '🧩', accent: 'border-slate-400/40 bg-slate-500/10 text-slate-200', light: 'border-slate-200 bg-slate-50 text-slate-700', description: labelForBusinessType(moduleName) }
    const granted = accessDetails.all || accessDetails.allowed.includes(moduleName)
    return {
      id: moduleName,
      label: labelForBusinessType(moduleName),
      visual,
      primary: accessDetails.primary === moduleName,
      granted,
      status: accessDetails.primary === moduleName ? 'Primary' : granted ? 'Enabled' : 'Locked',
      startDate: selectedClient?.subscriptionStartedAt || selectedClient?.createdAt,
      renewal: selectedClient?.nextBillingDate || selectedClient?.subscriptionExpiresAt || selectedClient?.trialEndsAt,
      actions: moduleName,
    }
  })
  const copyFields = selectedClient ? [
    ['Short Client ID', selectedClient.shortClientId],
    ['Full Client ID', selectedClient.workspaceId],
    ['Owner/User ID', ownerIdForClient(selectedClient)],
    ['Email', selectedClient.email],
    ['Phone', selectedClient.phone],
    ['IP Address', ipFor(selectedClient)],
    ['Company', selectedClient.companyName],
    ['Contact Person', selectedClient.contactPerson],
    ['Location', profile.Location],
  ].filter(([, value]) => Boolean(value)) : []
  const operationsSnapshot = [
    ['Primary module', labelForBusinessType(accessDetails.primary || workspaceBusinessType(selectedClient || {}))],
    ['Module access', accessDetails.all ? 'All modules enabled' : `${activeModules.length} active module${activeModules.length === 1 ? '' : 's'}`],
    ['Ticket health', `${openIssues.length} open / ${resolvedIssues.length} resolved`],
    ['Live status', clientPresenceLabel],
    ['Using now', clientUsageLabel],
    ['Money status', `${money(outstandingAmount, currency)} outstanding`],
    ['IP address', ipFor(selectedClient) || 'IP not captured'],
    ['Last active', profile['Last active'] || '-'],
    ['Renewal / trial', dateLabel(selectedClient?.nextBillingDate || selectedClient?.subscriptionExpiresAt || selectedClient?.trialEndsAt) || '-'],
  ]
  const securitySnapshot = [
    ['Active passkeys', activeClientPasskeys.length],
    ['Registered devices', clientPasskeys.length],
    ['Blocked devices', blockedClientPasskeys.length],
    ['Failed passkey attempts', failedClientPasskeyAttempts],
    ['Successful passkey logins', successfulClientPasskeyLogins],
    ['Password logins', passwordClientLogins],
    ['Google logins', googleClientLogins],
    ['Last passkey used', dateTimeLabel(latestClientPasskey?.lastUsed)],
    ['Last login', latestClientLogin ? `${latestClientLogin.authenticationMethod || latestClientLogin.method || 'login'} · ${dateTimeLabel(latestClientLogin.createdAt || latestClientLogin.date || latestClientLogin.time)}` : '-'],
  ]
  const clientOwnerId = selectedClient ? firstValue(ownerIdForClient(selectedClient), latestClientPasskey?.userId) : ''
  const securityPanel = selectedClient ? (
    <section className="rounded-2xl border border-cyan-200 bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_50%,#f5f3ff_100%)] p-4 shadow-[0_18px_55px_-45px_rgba(14,165,233,0.5)]">
      <button
        type="button"
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
        onClick={() => setSecurityExpanded((expanded) => !expanded)}
        aria-expanded={securityExpanded}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-violet-600 text-lg text-white shadow-lg shadow-blue-900/20">
              🔐
            </span>
            <div>
              <p className="text-sm font-black text-slate-950">Client Security Snapshot</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-600">
                {activeClientPasskeys.length} active passkey · {failedClientPasskeyAttempts} failed attempts · {latestClientLogin ? `last login ${relativeTimeLabel(latestClientLogin.createdAt || latestClientLogin.date || latestClientLogin.time, liveNow)}` : 'no login history'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DarkStatusPill value={activeClientPasskeys.length ? 'Passkey enabled' : 'No passkey'} />
          <span className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
            {securityExpanded ? 'Minimize' : 'Expand'}
          </span>
        </div>
      </button>

      {securityExpanded ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {securitySnapshot.map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-1 truncate text-sm font-black text-slate-950">{value || '-'}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="rounded-xl border border-blue-100 bg-white/85 p-3 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-700">Latest device</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <p className="truncate text-sm font-black text-slate-950">{latestClientPasskey?.deviceName || 'No registered passkey'}</p>
                <p className="truncate text-xs font-semibold text-slate-600">{latestClientPasskey?.platform || '-'}</p>
                <p className="truncate text-xs font-semibold text-slate-600">{latestClientPasskey?.browser || '-'}</p>
                <p className="truncate text-xs font-semibold text-slate-600">{latestClientPasskey ? dateTimeLabel(latestClientPasskey.lastUsed || latestClientPasskey.createdAt) : '-'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <ActionButton
                icon={HiOutlineKey}
                disabled={!latestClientPasskey || statusValue(latestClientPasskey.status) !== 'active' || busy === 'passkey-disable-latest'}
                onClick={() => runAction('passkey-disable-latest', () => adminUpdatePasskey(latestClientPasskey.id, 'disable'), 'Latest passkey disabled.')}
              >
                Disable Latest Passkey
              </ActionButton>
              <ActionButton
                icon={HiOutlinePower}
                disabled={!clientOwnerId || busy === 'passkey-force-logout'}
                onClick={() => runAction('passkey-force-logout', () => adminForceLogoutUser(clientOwnerId), 'Client forced logout.')}
              >
                Force Logout
              </ActionButton>
            </div>
          </div>
        </>
      ) : null}
    </section>
  ) : null
  const upgradeSummary = latestClientRequest ? [
    ['Request ID', upgradeRequestDisplayId(latestClientRequest)],
    ['Latest status', latestClientRequest?.approvalStatus || latestClientRequest?.status || latestClientRequest?.paymentStatus || 'Pending'],
    ['Requested plan', latestClientRequest.requestedPlan || latestClientRequest.selectedPlan || latestClientRequest.plan || '-'],
    ['Module', latestClientRequest.businessType || latestClientRequest.module || workspaceBusinessType(selectedClient)],
    ['Amount', money(paymentAmount(latestClientRequest), rowCurrency(latestClientRequest))],
    ['Payment method', latestClientRequest.paymentMethod || latestClientRequest.paymentMethodId || '-'],
    ['Transaction ID', latestClientRequest.transactionId || latestClientRequest.referenceNumber || '-'],
    ['Proof', latestClientRequest.screenshotUrl || latestClientRequest.paymentProof || latestClientRequest.screenshotKey ? 'Uploaded' : 'Missing'],
    ['Requested at', dateTimeLabel(latestClientRequest.createdAt || latestClientRequest.requestedAt)],
    ['Updated at', dateTimeLabel(latestClientRequest.updatedAt || latestClientRequest.approvedAt || latestClientRequest.rejectedAt)],
  ] : []
  const upgradePanel = selectedClient ? (
    <section className="rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#fff7ed_46%,#eff6ff_100%)] p-4 shadow-[0_18px_55px_-45px_rgba(245,158,11,0.45)]">
      <button
        type="button"
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
        onClick={() => setUpgradeExpanded((expanded) => !expanded)}
        aria-expanded={upgradeExpanded}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 via-orange-500 to-blue-600 text-lg text-white shadow-lg shadow-amber-900/20">
              ⬆️
            </span>
            <div>
              <p className="text-sm font-black text-slate-950">Upgrade Requests Snapshot</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-600">
                {pendingClientRequests.length} pending · {approvedClientRequests.length} approved · latest {latestClientRequest ? statusValue(latestClientRequest?.approvalStatus || latestClientRequest?.status || latestClientRequest?.paymentStatus, 'pending').replace(/_/g, ' ') : 'none'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DarkStatusPill value={pendingClientRequests.length ? 'Pending review' : latestClientRequest ? latestClientRequest?.status || latestClientRequest?.approvalStatus || 'Reviewed' : 'No requests'} />
          <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
            {upgradeExpanded ? 'Minimize' : 'Expand'}
          </span>
        </div>
      </button>

      {upgradeExpanded ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Total requests', sortedClientRequests.length],
              ['Pending review', pendingClientRequests.length],
              ['Approved / active', approvedClientRequests.length],
              ['Rejected / failed', rejectedClientRequests.length],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          {latestClientRequest ? (
            <div className="mt-4 rounded-xl border border-amber-100 bg-white/85 p-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">Latest upgrade request</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{latestClientRequest.requestedPlan || latestClientRequest.selectedPlan || latestClientRequest.plan || 'Plan request'}</p>
                </div>
                <DarkStatusPill value={latestClientRequest?.approvalStatus || latestClientRequest?.status || latestClientRequest?.paymentStatus || 'pending'} />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upgradeSummary.map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                    <p className="mt-1 truncate text-xs font-black text-slate-900">{value || '-'}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {latestClientRequest.screenshotUrl || latestClientRequest.paymentProof ? (
                  <a
                    href={latestClientRequest.screenshotUrl || latestClientRequest.paymentProof}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center rounded-lg border border-amber-200 bg-white px-3 text-xs font-black text-amber-700 shadow-sm hover:bg-amber-50"
                  >
                    Open Proof
                  </a>
                ) : null}
                {!isFinalUpgradeRequest(latestClientRequest) ? (
                  <>
                    <ActionButton
                      icon={HiOutlineCheckCircle}
                      disabled={busy === `client-upgrade-approve-${latestClientRequest.id}`}
                      onClick={() => runAction(`client-upgrade-approve-${latestClientRequest.id}`, () => approveClientUpgrade(latestClientRequest), 'Upgrade approved.')}
                    >
                      Approve
                    </ActionButton>
                    <ActionButton
                      icon={HiOutlineCreditCard}
                      disabled={busy === `client-upgrade-paid-${latestClientRequest.id}`}
                      onClick={() => runAction(`client-upgrade-paid-${latestClientRequest.id}`, () => approveClientUpgrade(latestClientRequest, true), 'Payment marked paid.')}
                    >
                      Mark Paid
                    </ActionButton>
                    <ActionButton
                      icon={HiOutlineXMark}
                      className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:text-rose-800"
                      disabled={busy === `client-upgrade-reject-${latestClientRequest.id}`}
                      onClick={() => {
                        setUpgradeRejectingId(latestClientRequest.id)
                        setUpgradeRejectReason('')
                      }}
                    >
                      Reject
                    </ActionButton>
                  </>
                ) : (
                  <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-500">
                    Request completed · actions locked
                  </span>
                )}
                <ActionButton icon={HiOutlineRectangleStack} onClick={() => setActiveTab('invoices')}>View Requests</ActionButton>
              </div>
              {upgradeRejectingId === latestClientRequest.id ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.12em] text-rose-700">Reject reason</label>
                  <textarea
                    value={upgradeRejectReason}
                    onChange={(event) => setUpgradeRejectReason(event.target.value)}
                    rows={3}
                    maxLength={1200}
                    placeholder="Write why this upgrade request is being rejected..."
                    className="mt-2 w-full resize-none rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-rose-400"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <ActionButton icon={HiOutlineXMark} onClick={() => { setUpgradeRejectingId(''); setUpgradeRejectReason('') }}>Cancel</ActionButton>
                    <ActionButton
                      icon={HiOutlineXMark}
                      className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
                      disabled={!upgradeRejectReason.trim() || busy === `client-upgrade-reject-${latestClientRequest.id}`}
                      onClick={() => runAction(`client-upgrade-reject-${latestClientRequest.id}`, () => rejectClientUpgrade(latestClientRequest), 'Upgrade rejected.')}
                    >
                      Confirm Reject
                    </ActionButton>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-amber-200 bg-white/70 p-6 text-center text-sm font-bold text-slate-500">
              No upgrade requests found for this client.
            </div>
          )}
        </>
      ) : null}
    </section>
  ) : null

  if (embedded) {
    return (
      <section className="min-h-[calc(100vh-8rem)] rounded-[1.1rem] border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_32%),linear-gradient(135deg,#f8fbff_0%,#eef7ff_48%,#f7f4ff_100%)] p-3 text-slate-950 shadow-[0_24px_80px_-58px_rgba(37,99,235,0.45)] sm:p-4">
        {toast ? <div className="fixed left-1/2 top-5 z-[100] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-xl">{toast}</div> : null}
        <div className="space-y-3">
          <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Command Center</span>
              <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950">Client Command Center</h1>
              <p className="mt-1 text-sm font-semibold text-slate-600">Light client operations view for services, issues, tickets, notes, and follow-up.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 md:inline-flex">
                Live sync · {new Date(liveNow).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-600 to-fuchsia-600 text-sm font-black text-white shadow-lg shadow-cyan-950/40">
                🧭
              </span>
            </div>
          </header>

          <section className="rounded-2xl border border-blue-100 bg-white/90 p-3 shadow-sm backdrop-blur">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="relative block min-w-0">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search client by name, email, phone, company, ID, or plan..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-24 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                  <span className="pointer-events-none absolute right-11 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400">
                    {searchMatches}/{clients.length}
                  </span>
                  {searchIsActive ? (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => {
                        setSearch('')
                        searchRef.current?.focus()
                      }}
                      aria-label="Clear client search"
                    >
                      <HiOutlineXMark className="h-4 w-4" />
                    </button>
                  ) : null}
                </label>
                <DarkActionButton icon={HiOutlineMagnifyingGlass} active onClick={() => searchRef.current?.focus()}>
                  Search
                </DarkActionButton>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                  Live sync · {new Date(liveNow).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="mr-1 text-xs font-black text-slate-500">Quick Actions:</span>
                <DarkActionButton icon={HiOutlinePlusCircle} active={activeAction === 'createTicket'} onClick={() => setActiveAction(activeAction === 'createTicket' ? '' : 'createTicket')}>Create Ticket</DarkActionButton>
                <DarkActionButton icon={HiOutlineEnvelope} active={activeAction === 'sendEmail'} onClick={() => setActiveAction(activeAction === 'sendEmail' ? '' : 'sendEmail')}>Send Email</DarkActionButton>
                <DarkActionButton icon={HiOutlinePencilSquare} active={activeAction === 'addNote'} onClick={() => setActiveAction(activeAction === 'addNote' ? '' : 'addNote')}>Add Note</DarkActionButton>
                <DarkActionButton icon={HiOutlinePower} active={!selectedClientBlocked} disabled={!selectedClient || busy === 'client-activate'} onClick={() => runAction('client-activate', () => saveClientAccessStatus(true), 'Client activated.')}>Activate</DarkActionButton>
                <DarkActionButton icon={HiOutlineLockClosed} className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800" disabled={!selectedClient || selectedClientBlocked || busy === 'client-deactivate'} onClick={() => runAction('client-deactivate', () => saveClientAccessStatus(false), 'Client deactivated.')}>Deactivate</DarkActionButton>
              </div>
            </div>
          </section>

          {Object.values(data.sourceErrors || {}).length ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              {Object.values(data.sourceErrors).join(' ')}
            </section>
          ) : null}
          {workerUpgradeError ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              {workerUpgradeError}
            </section>
          ) : null}
          {passkeySecurityError ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              {passkeySecurityError}
            </section>
          ) : null}
          {error ? <section className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</section> : null}

          {selectedClient ? (
            <>
              <section className="rounded-2xl border border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_52%,#f5f3ff_100%)] p-4 shadow-[0_18px_60px_-50px_rgba(37,99,235,0.38)]">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.95fr)_12rem]">
                  <div className="flex min-w-0 gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-600 to-fuchsia-600 text-lg font-black text-white shadow-lg shadow-cyan-950/40">
                      {(selectedClient.companyName || selectedClient.clientName || 'NC').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="truncate text-xl font-black text-slate-950">{selectedClient.companyName || selectedClient.clientName}</h2>
                        <DarkStatusPill value={profile['Account status'] === 'active' ? 'Active Client' : profile['Account status']} />
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black shadow-sm ${
                          selectedClient.behaviorScore >= 55
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : selectedClient.behaviorScore >= 28
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-slate-200 bg-white text-slate-600'
                        }`}>
                          Interest {selectedClient.behaviorScore || 0}/100 - {selectedClient.behaviorPriority || 'Watch'}
                        </span>
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black shadow-sm ${clientOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                          <span className={`h-2 w-2 rounded-full ${clientOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-400'}`} />
                          {clientPresenceLabel}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
                        <span>{selectedClient.email || '-'}</span>
                        <span>{selectedClient.phone || '-'}</span>
                        <span>{profile.Location || '-'}</span>
                        <span>Client Since: {profile['Joined date']}</span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-black text-emerald-700 shadow-sm">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.75)]" />
                          IP: {profile['IP address']}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-x-5 gap-y-3 border-blue-100 xl:grid-cols-2 xl:border-l xl:pl-5">
                    <DarkField label="Short Client ID" value={selectedClient.shortClientId} copyValue={selectedClient.shortClientId} onCopy={copyClientValue} />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-500">Full Client ID</p>
                        {showLongClientId ? (
                          <button type="button" className="rounded-md border border-blue-100 bg-white px-2 py-0.5 text-[10px] font-black text-blue-700 shadow-sm hover:bg-blue-50" onClick={() => copyClientValue(selectedClient.workspaceId, 'Full Client ID')}>
                            Copy
                          </button>
                        ) : null}
                      </div>
                      <button type="button" className="mt-1 rounded-lg border border-blue-100 bg-white px-2 py-1 text-xs font-black text-blue-700 shadow-sm hover:bg-blue-50" onClick={() => setShowLongClientId((show) => !show)}>
                        {showLongClientId ? selectedClient.workspaceId : 'Show full ID'}
                      </button>
                    </div>
                    <DarkField label="Company" value={selectedClient.companyName} copyValue={selectedClient.companyName} onCopy={copyClientValue} />
                    <DarkField label="Contact Person" value={selectedClient.contactPerson} copyValue={selectedClient.contactPerson} onCopy={copyClientValue} />
                    <DarkField label="Email" value={selectedClient.email} copyValue={selectedClient.email} onCopy={copyClientValue} />
                    <DarkField label="Phone" value={selectedClient.phone} copyValue={selectedClient.phone} onCopy={copyClientValue} />
                    <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-emerald-700">IP Address</p>
                        {ipFor(selectedClient) ? (
                          <button type="button" className="rounded-md bg-white px-2 py-0.5 text-[10px] font-black text-emerald-700 shadow-sm hover:bg-emerald-100" onClick={() => copyClientValue(ipFor(selectedClient), 'IP Address')}>
                            Copy
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm font-black text-emerald-900">{profile['IP address']}</p>
                    </div>
                    <DarkField label="Preferred Contact" value={profile['Preferred contact method']} />
                  </div>
                  <div className="grid gap-2 border-blue-100 xl:border-l xl:pl-5">
                    <DarkActionButton icon={HiOutlinePower} active={!selectedClientBlocked} disabled={busy === 'client-activate'} onClick={() => runAction('client-activate', () => saveClientAccessStatus(true), 'Client activated.')}>Activate Client</DarkActionButton>
                    <DarkActionButton icon={HiOutlineLockClosed} className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800" disabled={selectedClientBlocked || busy === 'client-deactivate'} onClick={() => runAction('client-deactivate', () => saveClientAccessStatus(false), 'Client deactivated.')}>Deactivate Client</DarkActionButton>
                    <DarkActionButton icon={HiOutlineSquares2X2} active={accessDetails.all} disabled={busy === 'module-access-all'} onClick={() => runAction('module-access-all', grantAllModules, 'All modules enabled for this client.')}>Enable All Modules</DarkActionButton>
                    <DarkActionButton icon={HiOutlineShieldCheck} disabled={busy === 'module-access-reset'} onClick={() => runAction('module-access-reset', resetPrimaryModule, 'Client reset to primary module only.')}>Primary Only</DarkActionButton>
                    <DarkActionButton icon={HiOutlinePencilSquare} onClick={() => setActiveAction('addNote')}>Edit Client</DarkActionButton>
                    <DarkActionButton icon={HiOutlineChatBubbleLeftRight} onClick={() => setActiveTab('tickets')}>Open Tickets</DarkActionButton>
                    <DarkActionButton icon={HiOutlineEnvelope} onClick={() => setActiveAction('sendEmail')} disabled={!selectedClient.email}>Email Client</DarkActionButton>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <DarkStatCard label="Total Services" value={activeModules.length} helper={`Active: ${activeModules.length}`} icon={HiOutlineRectangleStack} tone="bg-blue-50 text-blue-700 ring-1 ring-blue-100" />
                <DarkStatCard label="Total Tickets" value={clientTickets.length} helper={`Open: ${openIssues.length} | Resolved: ${resolvedIssues.length}`} icon={HiOutlineTicket} tone="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" />
                <DarkStatCard label="Open Issues" value={openIssues.length} helper="Needs attention" icon={HiOutlineClock} tone="bg-amber-50 text-amber-700 ring-1 ring-amber-100" />
                <DarkStatCard label="Resolved Issues" value={resolvedIssues.length} helper="All time" icon={HiOutlineCheckCircle} tone="bg-green-50 text-green-700 ring-1 ring-green-100" />
                <DarkStatCard label="Total Notes" value={notes.length} helper="Internal notes" icon={HiOutlinePencilSquare} tone="bg-violet-50 text-violet-700 ring-1 ring-violet-100" />
              </section>

              {securityPanel}
              {upgradePanel}

              {activeAction ? (
                <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  {activeAction === 'createTicket' ? (
                    <div className="grid gap-3 lg:grid-cols-[1fr_11rem_13rem_auto]">
                      <input className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="Ticket title" value={ticketDraft.title} onChange={(event) => setTicketDraft((current) => ({ ...current, title: event.target.value }))} />
                      <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800" value={ticketDraft.priority} onChange={(event) => setTicketDraft((current) => ({ ...current, priority: event.target.value }))}>
                        {['low', 'medium', 'high', 'urgent'].map((priority) => <option key={priority}>{priority}</option>)}
                      </select>
                      <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800" value={ticketDraft.module} onChange={(event) => setTicketDraft((current) => ({ ...current, module: event.target.value }))}>
                        {activeModules.map((moduleName) => <option key={moduleName}>{labelForBusinessType(moduleName)}</option>)}
                      </select>
                      <DarkActionButton icon={HiOutlinePlusCircle} active disabled={busy === 'create-ticket'} onClick={() => runAction('create-ticket', createTicket, 'Support ticket created.')}>Create Ticket</DarkActionButton>
                      <textarea className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 lg:col-span-4" placeholder="Description" value={ticketDraft.description} onChange={(event) => setTicketDraft((current) => ({ ...current, description: event.target.value }))} />
                    </div>
                  ) : null}
                  {activeAction === 'addNote' ? (
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                      <textarea className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="Ticket note for selected issue" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
                      <DarkActionButton icon={HiOutlinePencilSquare} active disabled={!selectedIssue || busy === 'add-note'} onClick={() => runAction('add-note', () => addNote(), 'Ticket note saved.')}>Add Note</DarkActionButton>
                    </div>
                  ) : null}
                  {activeAction === 'sendEmail' ? (
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                      <div className="space-y-3">
                        <input className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" value={emailDraft.subject} onChange={(event) => setEmailDraft((current) => ({ ...current, subject: event.target.value }))} />
                        <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" value={emailDraft.message} onChange={(event) => setEmailDraft((current) => ({ ...current, message: event.target.value }))} />
                        <p className="text-xs font-semibold text-slate-500">Recipient: {selectedClient.email || 'No client email found'}</p>
                      </div>
                      <DarkActionButton icon={HiOutlineEnvelope} active disabled={!selectedClient.email || !selectedIssue || busy === 'send-resolution-email'} onClick={() => runAction('send-resolution-email', sendResolutionEmail, 'Resolution email sent.')}>Send Email</DarkActionButton>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.05fr)]">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 pt-3">
                    {tabs.slice(0, 6).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`whitespace-nowrap border-b-2 px-3 pb-3 text-xs font-black transition ${activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="p-3">
                    {activeTab === 'services' ? (
                      <ModuleAccessBoard
                        rows={serviceRows}
                        access={accessDetails}
                        busy={busy}
                        onToggle={(moduleName) => runAction(`module-${moduleSlug(moduleName)}`, () => toggleModuleAccess(moduleName), 'Module access updated.')}
                        onGrantAll={() => runAction('module-access-all', grantAllModules, 'All modules enabled for this client.')}
                        onReset={() => runAction('module-access-reset', resetPrimaryModule, 'Client reset to primary module only.')}
                      />
                    ) : null}
                    {activeTab !== 'services' ? (
                      <div className="space-y-2">
                        {(activeTab === 'tickets' || activeTab === 'issues' ? clientTickets : activeTab === 'notes' ? notes : activeTab === 'invoices' ? clientRequests : clientPayments).slice(0, 8).map((row, index) => {
                          const ticket = row.ticket || row
                          return (
                            <button key={row.path || row.id || index} type="button" onClick={() => ticket?.id ? setSelectedIssueId(ticket.path || ticket.id) : undefined} className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-blue-200 hover:bg-blue-50">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-950">{activeTab === 'notes' ? row.message || 'Internal note' : activeTab === 'payments' ? row.transactionId || row.id : issueTitle(ticket)}</p>
                                  <p className="mt-1 text-xs text-slate-500">{activeTab === 'payments' ? money(paymentAmount(row), rowCurrency(row)) : `Ticket ID: ${ticketNumber(ticket) || '-'}`}</p>
                                </div>
                                <DarkStatusPill value={row.status || row.paymentStatus || ticket.status || 'open'} />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 pt-3">
                    {[
                      ['tickets', 'Ticket Timeline'],
                      ['issues', 'Issue Timeline'],
                      ['notes', 'Notes Timeline'],
                      ['emailHistory', 'Email History'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`whitespace-nowrap border-b-2 px-3 pb-3 text-xs font-black transition ${activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3 p-4">
                    {(activeTab === 'emailHistory' ? emailHistory : clientTickets).slice(0, 5).map((item) => {
                      const ticket = item.ticket || item
                      return (
                        <button
                          key={item.id || item.path}
                          type="button"
                          onClick={() => ticket?.id ? setSelectedIssueId(ticket.path || ticket.id) : undefined}
                          className="relative block w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-blue-200 hover:bg-blue-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <DarkStatusPill value={activeTab === 'emailHistory' ? item.status || 'sent' : issueStatus(ticket)} />
                              <p className="mt-2 truncate text-sm font-black text-slate-950">{activeTab === 'emailHistory' ? item.subject || 'Email sent' : `Issue: ${issueTitle(ticket)}`}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-600">{activeTab === 'emailHistory' ? item.message || '-' : ticket.description || ticket.message || 'No description provided.'}</p>
                              <p className="mt-1 text-xs text-slate-500">Ticket ID: {ticketNumber(ticket) || '-'} · Priority: {ticket.priority || 'normal'}</p>
                            </div>
                            <p className="shrink-0 text-right text-xs font-semibold text-slate-500">{dateTimeLabel(item.sentAt || ticket.updatedAt || ticket.createdAt)}</p>
                          </div>
                        </button>
                      )
                    })}
                    {!clientTickets.length && activeTab !== 'emailHistory' ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">No tickets found.</div> : null}
                    {activeTab === 'emailHistory' && !emailHistory.length ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">No email history found.</div> : null}
                  </div>
                </div>
              </section>

              <section className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.05fr)]">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">Client Operations</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Useful status, billing, access and copy shortcuts.</p>
                    </div>
                    <DarkStatusPill value={selectedClientBlocked ? 'Blocked' : 'Active'} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {operationsSnapshot.map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                        <p className="mt-1 truncate text-sm font-bold text-slate-900">{value || '-'}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Copy shortcuts</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {copyFields.map(([label, value]) => (
                        <button key={label} type="button" className="rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm hover:border-blue-200 hover:bg-blue-50" onClick={() => copyClientValue(value, label)}>
                          Copy {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-black text-slate-950">Issue Details</p>
                    {selectedIssue ? <DarkStatusPill value={issueStatus(selectedIssue)} /> : null}
                  </div>
                  {selectedIssue ? (
                    <>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">Issue Title</p>
                          <p className="mt-1 text-sm font-black text-slate-950">{issueTitle(selectedIssue)}</p>
                          <p className="mt-4 text-xs font-semibold text-slate-500">Description</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{selectedIssue.description || selectedIssue.message || 'No description provided.'}</p>
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <DarkField label="Priority" value={selectedIssue.priority || '-'} />
                            <DarkField label="Module" value={selectedIssue.module || selectedIssue.category || workspaceBusinessType(selectedClient)} />
                          </div>
                        </div>
                        <div className="grid gap-3 border-slate-100 lg:border-l lg:pl-4">
                          <DarkField label="Ticket ID" value={ticketNumber(selectedIssue)} />
                          <DarkField label="Created" value={dateTimeLabel(selectedIssue.createdAt)} />
                          <DarkField label="Last Updated" value={dateTimeLabel(selectedIssue.updatedAt)} />
                          <DarkField label="Requested By" value={selectedIssue.customerName || selectedIssue.clientEmail || selectedClient.email} />
                        </div>
                      </div>
                      <textarea className="mt-4 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="Short resolution note" value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <VividActionButton icon={HiOutlinePencilSquare} tone="violet" onClick={() => setActiveAction('addNote')}>Add Note</VividActionButton>
                        <VividActionButton icon={HiOutlineClock} tone="blue" disabled={busy === 'update-status'} onClick={() => runAction('update-status', updateIssueStatus, 'Issue status updated.')}>Update Status</VividActionButton>
                        <VividActionButton icon={HiOutlineCheckCircle} tone="emerald" disabled={busy === 'resolve-issue'} onClick={() => runAction('resolve-issue', resolveIssue, 'Issue resolved. You can send a resolution email now.')}>Resolve Issue</VividActionButton>
                        <VividActionButton icon={HiOutlineEnvelope} tone="amber" disabled={!selectedClient.email} onClick={() => setActiveAction('sendEmail')}>Send Email to Client</VividActionButton>
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">No issue selected.</div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="grid min-h-[26rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
              <div>
                <HiOutlineChatBubbleLeftRight className="mx-auto h-10 w-10 text-violet-400" />
                <p className="mt-3 text-lg font-black text-slate-950">{data.loading ? 'Loading clients...' : 'No clients found'}</p>
                <p className="mt-1 text-sm text-slate-400">Client workspaces will appear here when backend admin data is available.</p>
              </div>
            </section>
          )}
        </div>
      </section>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_30%),linear-gradient(135deg,#f8fbff_0%,#eef7ff_48%,#f5f3ff_100%)] px-3 py-5 text-slate-950 sm:px-5 lg:px-6">
      {toast ? <div className="fixed left-1/2 top-5 z-[100] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-xl">{toast}</div> : null}
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-2xl border border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_48%,#f5f3ff_100%)] p-4 shadow-[0_24px_70px_-52px_rgba(37,99,235,0.45)] sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Backend Admin Command Center</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Client Command Center</h1>
              <p className="mt-1 text-sm font-semibold text-slate-600">Search a client and manage support, notes, issue resolution, billing context, and email follow-up.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:w-[44rem]">
              <label className="relative block min-w-0">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search client by name, email, phone, company, ID, or plan..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-24 text-sm font-semibold outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
                <span className="pointer-events-none absolute right-11 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400">
                  {searchMatches}/{clients.length}
                </span>
                {searchIsActive ? (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-950"
                    onClick={() => {
                      setSearch('')
                      searchRef.current?.focus()
                    }}
                    aria-label="Clear client search"
                  >
                    <HiOutlineXMark className="h-4 w-4" />
                  </button>
                ) : null}
              </label>
              <select
                value={selectedClient?.id || ''}
                onChange={(event) => setSelectedClientId(event.target.value)}
                disabled={!searchedClients.length}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-300"
              >
                {!searchedClients.length ? <option value="">No matching clients</option> : null}
                {searchedClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName} - Score {client.behaviorScore || 0}/100 - {client.behaviorPriority || 'Watch'} - {client.email || client.shortClientId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton icon={HiOutlineMagnifyingGlass} onClick={() => searchRef.current?.focus()}>Search</ActionButton>
            <ActionButton icon={HiOutlinePlusCircle} active={activeAction === 'createTicket'} onClick={() => setActiveAction(activeAction === 'createTicket' ? '' : 'createTicket')}>Create Ticket</ActionButton>
            <ActionButton icon={HiOutlineEnvelope} active={activeAction === 'sendEmail'} onClick={() => setActiveAction(activeAction === 'sendEmail' ? '' : 'sendEmail')}>Send Email</ActionButton>
            <ActionButton icon={HiOutlinePencilSquare} active={activeAction === 'addNote'} onClick={() => setActiveAction(activeAction === 'addNote' ? '' : 'addNote')}>Add Note</ActionButton>
            <ActionButton icon={HiOutlinePower} active={!selectedClientBlocked} disabled={!selectedClient || busy === 'client-activate'} onClick={() => runAction('client-activate', () => saveClientAccessStatus(true), 'Client activated.')}>Activate Client</ActionButton>
            <ActionButton icon={HiOutlineLockClosed} className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:text-rose-800" disabled={!selectedClient || selectedClientBlocked || busy === 'client-deactivate'} onClick={() => runAction('client-deactivate', () => saveClientAccessStatus(false), 'Client deactivated.')}>Deactivate Client</ActionButton>
          </div>
        </header>

        {Object.values(data.sourceErrors || {}).length ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {Object.values(data.sourceErrors).join(' ')}
          </section>
        ) : null}
        {workerUpgradeError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {workerUpgradeError}
          </section>
        ) : null}
        {passkeySecurityError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {passkeySecurityError}
          </section>
        ) : null}
        {error ? <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</section> : null}

        {activeAction ? (
          <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            {activeAction === 'createTicket' ? (
              <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem_auto]">
                <input className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-300" placeholder="Ticket title" value={ticketDraft.title} onChange={(event) => setTicketDraft((current) => ({ ...current, title: event.target.value }))} />
                <select className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold" value={ticketDraft.priority} onChange={(event) => setTicketDraft((current) => ({ ...current, priority: event.target.value }))}>
                  {['low', 'medium', 'high', 'urgent'].map((priority) => <option key={priority}>{priority}</option>)}
                </select>
                <select className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold" value={ticketDraft.module} onChange={(event) => setTicketDraft((current) => ({ ...current, module: event.target.value }))}>
                  {activeModules.map((moduleName) => <option key={moduleName}>{labelForBusinessType(moduleName)}</option>)}
                </select>
                <ActionButton icon={HiOutlinePlusCircle} disabled={busy === 'create-ticket'} onClick={() => runAction('create-ticket', createTicket, 'Support ticket created.')}>Create Ticket</ActionButton>
                <textarea className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 lg:col-span-4" placeholder="Description" value={ticketDraft.description} onChange={(event) => setTicketDraft((current) => ({ ...current, description: event.target.value }))} />
              </div>
            ) : null}
            {activeAction === 'addNote' ? (
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <textarea className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="Ticket note for selected issue" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
                <ActionButton icon={HiOutlinePencilSquare} disabled={!selectedIssue || busy === 'add-note'} onClick={() => runAction('add-note', () => addNote(), 'Ticket note saved.')}>Add Note</ActionButton>
              </div>
            ) : null}
            {activeAction === 'sendEmail' ? (
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="space-y-3">
                  <input className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-300" value={emailDraft.subject} onChange={(event) => setEmailDraft((current) => ({ ...current, subject: event.target.value }))} />
                  <textarea className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" value={emailDraft.message} onChange={(event) => setEmailDraft((current) => ({ ...current, message: event.target.value }))} />
                  <p className="text-xs font-semibold text-slate-500">Recipient: {selectedClient?.email || 'No client email found'}</p>
                </div>
                <ActionButton icon={HiOutlineEnvelope} disabled={!selectedClient?.email || !selectedIssue || busy === 'send-resolution-email'} onClick={() => runAction('send-resolution-email', sendResolutionEmail, 'Resolution email sent.')}>Send Email</ActionButton>
              </div>
            ) : null}
          </section>
        ) : null}

        {selectedClient ? (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Client profile</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">{selectedClient.clientName}</h2>
                    <p className="text-sm font-semibold text-slate-500">{selectedClient.companyName} - {labelForBusinessType(workspaceBusinessType(selectedClient))}</p>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.75)]" />
                      IP: {profile['IP address']}
                    </div>
                    <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black shadow-sm ${
                      selectedClient.behaviorScore >= 55
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : selectedClient.behaviorScore >= 28
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}>
                      Interest score: {selectedClient.behaviorScore || 0}/100 - Priority {selectedClient.behaviorPriority || 'Watch'}
                    </div>
                    <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black shadow-sm ${clientOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      <span className={`h-2 w-2 rounded-full ${clientOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.75)]' : 'bg-slate-400'}`} />
                      {clientPresenceLabel}
                    </div>
                  </div>
                  <StatusPill value={profile['Account status']} />
                </div>
                <div className="mt-4 grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:grid-cols-2 xl:grid-cols-4">
                  <ActionButton icon={HiOutlinePower} active={!selectedClientBlocked} disabled={busy === 'client-activate'} onClick={() => runAction('client-activate', () => saveClientAccessStatus(true), 'Client activated.')}>Activate</ActionButton>
                  <ActionButton icon={HiOutlineLockClosed} className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:text-rose-800" disabled={selectedClientBlocked || busy === 'client-deactivate'} onClick={() => runAction('client-deactivate', () => saveClientAccessStatus(false), 'Client deactivated.')}>Deactivate</ActionButton>
                  <ActionButton icon={HiOutlineSquares2X2} active={accessDetails.all} disabled={busy === 'module-access-all'} onClick={() => runAction('module-access-all', grantAllModules, 'All modules enabled for this client.')}>Enable All Modules</ActionButton>
                  <ActionButton icon={HiOutlineShieldCheck} disabled={busy === 'module-access-reset'} onClick={() => runAction('module-access-reset', resetPrimaryModule, 'Client reset to primary module only.')}>Primary Only</ActionButton>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-blue-500">Full Client ID</p>
                      {showLongClientId ? (
                        <button type="button" className="rounded-md bg-white px-2 py-0.5 text-[10px] font-black text-blue-700 shadow-sm hover:bg-blue-50" onClick={() => copyClientValue(selectedClient.workspaceId, 'Full Client ID')}>
                          Copy
                        </button>
                      ) : null}
                    </div>
                    <button type="button" className="mt-1 rounded-lg bg-white px-2 py-1 text-xs font-black text-blue-700" onClick={() => setShowLongClientId((show) => !show)}>
                      {showLongClientId ? selectedClient.workspaceId : 'Show full ID'}
                    </button>
                  </div>
                  <Field label="Short Client ID" value={selectedClient.shortClientId} copyValue={selectedClient.shortClientId} onCopy={copyClientValue} />
                  <Field label="Owner/User ID" value={ownerIdForClient(selectedClient)} copyValue={ownerIdForClient(selectedClient)} onCopy={copyClientValue} />
                  <Field label="Company name" value={selectedClient.companyName} copyValue={selectedClient.companyName} onCopy={copyClientValue} />
                  <Field label="Contact person" value={selectedClient.contactPerson} copyValue={selectedClient.contactPerson} onCopy={copyClientValue} />
                  <Field label="Email" value={selectedClient.email} copyValue={selectedClient.email} onCopy={copyClientValue} />
                  <Field label="Phone" value={selectedClient.phone} copyValue={selectedClient.phone} onCopy={copyClientValue} />
                  <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-emerald-700">IP Address</p>
                      {ipFor(selectedClient) ? (
                        <button type="button" className="rounded-md bg-white px-2 py-0.5 text-[10px] font-black text-emerald-700 shadow-sm hover:bg-emerald-100" onClick={() => copyClientValue(ipFor(selectedClient), 'IP Address')}>
                          Copy
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm font-black text-emerald-900">{profile['IP address']}</p>
                  </div>
                  <Field label="Location" value={profile.Location} copyValue={profile.Location} onCopy={copyClientValue} />
                  <Field label="Last login" value={profile['Last login']} />
                  <Field label="Joined date" value={profile['Joined date']} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-black text-slate-950">Issue details panel</p>
                {selectedIssue ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-black text-slate-950">{issueTitle(selectedIssue)}</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Ticket ID: {ticketNumber(selectedIssue)}</p>
                        </div>
                        <StatusPill value={issueStatus(selectedIssue)} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{selectedIssue.description || selectedIssue.message || 'No description provided.'}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Priority" value={selectedIssue.priority || '-'} />
                      <Field label="Module" value={selectedIssue.module || selectedIssue.category || workspaceBusinessType(selectedClient)} />
                      <Field label="Created date" value={dateTimeLabel(selectedIssue.createdAt)} />
                      <Field label="Last updated" value={dateTimeLabel(selectedIssue.updatedAt)} />
                      <Field label="Requested by" value={selectedIssue.customerName || selectedIssue.clientEmail || selectedClient.email} />
                      <Field label="Status" value={issueStatus(selectedIssue)} />
                    </div>
                    <textarea className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="Short resolution note" value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ActionButton icon={HiOutlinePencilSquare} onClick={() => setActiveAction('addNote')}>Add Note</ActionButton>
                      <div className="flex gap-2">
                        <select className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-bold" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                          {['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'].map((status) => <option key={status}>{status}</option>)}
                        </select>
                        <ActionButton icon={HiOutlineClock} disabled={busy === 'update-status'} onClick={() => runAction('update-status', updateIssueStatus, 'Issue status updated.')}>Update Status</ActionButton>
                      </div>
                      <ActionButton icon={HiOutlineCheckCircle} disabled={busy === 'resolve-issue'} onClick={() => runAction('resolve-issue', resolveIssue, 'Issue resolved. You can send a resolution email now.')}>Resolve Issue</ActionButton>
                      <ActionButton icon={HiOutlineEnvelope} disabled={!selectedClient.email} onClick={() => setActiveAction('sendEmail')}>Send Email to Client</ActionButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid min-h-[16rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <p className="text-sm font-bold text-slate-500">No issue selected for this client.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Total Services" value={activeModules.length} icon={HiOutlineRectangleStack} tone="bg-blue-50 text-blue-700" />
              <StatCard label="Total Tickets" value={clientTickets.length} icon={HiOutlineTicket} tone="bg-violet-50 text-violet-700" />
              <StatCard label="Open Issues" value={openIssues.length} icon={HiOutlineClock} tone="bg-amber-50 text-amber-700" />
              <StatCard label="Resolved Issues" value={resolvedIssues.length} icon={HiOutlineCheckCircle} tone="bg-emerald-50 text-emerald-700" />
              <StatCard label="Total Notes" value={notes.length} icon={HiOutlinePencilSquare} tone="bg-slate-100 text-slate-700" />
            </section>

            {securityPanel}
            {upgradePanel}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-2">
                  {tabs.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`rounded-xl px-3 py-2 text-sm font-bold transition ${activeTab === key ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                {activeTab === 'services' ? (
                  <ModuleAccessBoard
                    rows={serviceRows}
                    access={accessDetails}
                    busy={busy}
                    onToggle={(moduleName) => runAction(`module-${moduleSlug(moduleName)}`, () => toggleModuleAccess(moduleName), 'Module access updated.')}
                    onGrantAll={() => runAction('module-access-all', grantAllModules, 'All modules enabled for this client.')}
                    onReset={() => runAction('module-access-reset', resetPrimaryModule, 'Client reset to primary module only.')}
                  />
                ) : null}
                {activeTab === 'tickets' ? (
                  <div className="space-y-3">
                    {clientTickets.length ? clientTickets.map((ticket) => (
                      <button
                        key={ticket.path || ticket.id}
                        type="button"
                        onClick={() => {
                          setSelectedIssueId(ticket.path || ticket.id)
                          setActiveTab('issues')
                        }}
                        className="block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black text-slate-950">{issueTitle(ticket)}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Ticket ID {ticketNumber(ticket)} - {ticket.priority || 'normal'} - {ticket.module || ticket.category || workspaceBusinessType(selectedClient)}</p>
                          </div>
                          <StatusPill value={issueStatus(ticket)} />
                        </div>
                        <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
                          <span>Created: {dateTimeLabel(ticket.createdAt)}</span>
                          <span>Last update: {dateTimeLabel(ticket.updatedAt || ticket.lastReplyAt)}</span>
                          <span>Resolved: {ticket.resolvedAt ? dateTimeLabel(ticket.resolvedAt) : '-'}</span>
                        </div>
                      </button>
                    )) : <div className="grid min-h-[9rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><p className="text-sm font-bold text-slate-500">No tickets created by this client.</p></div>}
                  </div>
                ) : null}
                {activeTab === 'issues' ? (
                  <SimpleTable
                    rows={clientTickets}
                    empty="No issues found."
                    columns={[
                      { key: 'title', label: 'Issue title', render: (row) => <button type="button" className="font-black text-blue-700 hover:underline" onClick={() => setSelectedIssueId(row.path || row.id)}>{issueTitle(row)}</button> },
                      { key: 'ticketId', label: 'Ticket ID', render: ticketNumber },
                      { key: 'priority', label: 'Priority' },
                      { key: 'module', label: 'Module', render: (row) => row.module || row.category || '-' },
                      { key: 'created', label: 'Created date', render: (row) => dateTimeLabel(row.createdAt) },
                      { key: 'updated', label: 'Last updated', render: (row) => dateTimeLabel(row.updatedAt) },
                      { key: 'status', label: 'Status', render: (row) => <StatusPill value={issueStatus(row)} /> },
                    ]}
                  />
                ) : null}
                {activeTab === 'notes' ? (
                  <div className="space-y-3">
                    {notes.length ? notes.map((note) => (
                      <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap justify-between gap-2 text-xs font-bold text-slate-500">
                          <span>{note.author || 'Internal'} - {ticketNumber(note.ticket)}</span>
                          <span>{dateTimeLabel(note.createdAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.message || String(note)}</p>
                      </div>
                    )) : <div className="grid min-h-[9rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><p className="text-sm font-bold text-slate-500">No notes saved for this client.</p></div>}
                  </div>
                ) : null}
                {activeTab === 'invoices' ? (
                  <SimpleTable
                    rows={clientRequests}
                    empty="No invoice or upgrade request records found."
                    columns={[
                      { key: 'id', label: 'Invoice / Request ID' },
                      { key: 'plan', label: 'Plan', render: (row) => row.requestedPlan || row.selectedPlan || row.plan || '-' },
                      { key: 'amount', label: 'Amount', render: (row) => money(paymentAmount(row), rowCurrency(row)) },
                      { key: 'status', label: 'Status', render: (row) => <StatusPill value={row?.approvalStatus || row?.paymentStatus || row?.status || 'pending'} /> },
                      { key: 'createdAt', label: 'Created', render: (row) => dateTimeLabel(row.createdAt) },
                    ]}
                  />
                ) : null}
                {activeTab === 'payments' ? (
                  <SimpleTable
                    rows={clientPayments}
                    empty="No payments found for this client."
                    columns={[
                      { key: 'id', label: 'Payment ID' },
                      { key: 'method', label: 'Method', render: (row) => row.paymentMethod || row.method || '-' },
                      { key: 'amount', label: 'Amount', render: (row) => money(paymentAmount(row), rowCurrency(row)) },
                      { key: 'status', label: 'Status', render: (row) => <StatusPill value={row.paymentStatus || row.status || 'pending'} /> },
                      { key: 'transactionId', label: 'Transaction ID', render: (row) => row.transactionId || row.txnId || '-' },
                      { key: 'createdAt', label: 'Date', render: (row) => dateTimeLabel(row.createdAt || row.paidAt || row.approvedAt) },
                    ]}
                  />
                ) : null}
                {activeTab === 'emailHistory' ? (
                  <div className="space-y-3">
                    {emailHistory.length ? emailHistory.map((email) => (
                      <div key={email.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-950">{email.subject || 'Email'}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">To {email.to || selectedClient.email} - {ticketNumber(email.ticket)}</p>
                          </div>
                          <StatusPill value={email.status || 'sent'} />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{email.message || '-'}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-400">{dateTimeLabel(email.sentAt || email.createdAt)}</p>
                      </div>
                    )) : <div className="grid min-h-[9rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><p className="text-sm font-bold text-slate-500">No email history saved on support tickets.</p></div>}
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : (
          <section className="grid min-h-[24rem] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
            <div>
              <HiOutlineChatBubbleLeftRight className="mx-auto h-10 w-10 text-blue-500" />
              <p className="mt-3 text-lg font-black text-slate-950">{data.loading ? 'Loading clients...' : 'No clients found'}</p>
              <p className="mt-1 text-sm text-slate-500">Client workspaces will appear here when backend admin data is available.</p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
