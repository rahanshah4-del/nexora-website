import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../lib/firebase.js'
import { fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc, removeUserDoc } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

function daysSince(dateStr) {
  if (!dateStr) return 999
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

function computeReasons(lead, score) {
  const reasons = []
  if ((lead.replySpeed ?? 0) >= 75) reasons.push('Fast replies')
  if ((lead.dealValue ?? 0) >= 10000) reasons.push('High deal value')
  if ((lead.meetings ?? 0) >= 2) reasons.push('Recent meeting')
  if ((lead.activityFrequency ?? 0) < 40) reasons.push('Low activity')
  if (daysSince(lead.lastContactDate) > 10) reasons.push('Not contacted recently')
  if (reasons.length === 0) reasons.push(score >= 50 ? 'Steady engagement' : 'Needs follow-up')
  return reasons.slice(0, 3)
}

function scoreType(score) {
  if (score >= 80) return 'Hot Lead'
  if (score >= 50) return 'Warm Lead'
  return 'Cold Lead'
}

function priority(score) {
  if (score >= 80) return 'High'
  if (score >= 50) return 'Medium'
  return 'Low'
}

function prediction(score) {
  if (score >= 85) return 'Very likely'
  if (score >= 70) return 'Likely'
  if (score >= 50) return 'Possible'
  return 'Unlikely'
}

export function computeLeadScore(lead) {
  // Lightweight scoring model in 0..100 using supplied signals.
  const reply = clamp01((lead.replySpeed ?? 50) / 100)
  const activity = clamp01((lead.activityFrequency ?? 50) / 100)
  const payment = clamp01((lead.paymentHistory ?? 0) / 100)
  const meetings = clamp01((lead.meetings ?? 0) / 5)

  const dealNorm = clamp01(Math.log10(Math.max(1, lead.dealValue ?? 1)) / 5) // ~0..1 for 1..100k+
  const recency = clamp01(1 - daysSince(lead.lastContactDate) / 21) // newer contact -> higher

  const weighted =
    reply * 0.22 +
    meetings * 0.18 +
    payment * 0.18 +
    activity * 0.18 +
    dealNorm * 0.14 +
    recency * 0.10

  const score = Math.round(weighted * 100)
  return {
    score,
    scoreType: scoreType(score),
    priority: priority(score),
    prediction: prediction(score),
    reasons: computeReasons(lead, score),
  }
}

const DEFAULT_LEAD_LIST_LIMIT = 100
const LEAD_PAGE_LIMIT = 50

function safeLeadListLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return DEFAULT_LEAD_LIST_LIMIT
  return Math.floor(next)
}

function safeLeadPageLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return LEAD_PAGE_LIMIT
  return Math.min(LEAD_PAGE_LIMIT, Math.floor(next))
}

function mergeLeadPages(currentRows, nextRows) {
  const seen = new Set((currentRows || []).map((lead) => lead.id))
  return [
    ...(currentRows || []),
    ...(nextRows || []).filter((lead) => !seen.has(lead.id)),
  ]
}

export function useLeadScoring({ limitCount = DEFAULT_LEAD_LIST_LIMIT, paginated = false } = {}) {
  const { userId, workspaceId, businessType, role } = useUser()
  const leadListLimit = safeLeadListLimit(limitCount)
  const leadPageLimit = safeLeadPageLimit(limitCount)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [hasMoreLeads, setHasMoreLeads] = useState(false)
  const [leadPage, setLeadPage] = useState(0)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')
  const leadCursorRef = useRef(null)
  const leadRequestRef = useRef(0)

  const loadLeadPage = useCallback(async ({ reset = false } = {}) => {
    if (!db) {
      setRows([])
      setSource('none')
      setError('Secure Cloud Sync is not available right now.')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: false }
    }
    if (!workspaceId) {
      setRows([])
      leadCursorRef.current = null
      setHasMoreLeads(false)
      setLeadPage(0)
      setSource('firestore')
      setError('')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: true }
    }

    const requestId = ++leadRequestRef.current
    if (reset) {
      leadCursorRef.current = null
      setRows([])
      setHasMoreLeads(false)
      setLeadPage(0)
      setLoading(true)
    } else {
      setPaginationLoading(true)
    }

    try {
      const page = await fetchWorkspaceCollectionPage({
        workspaceId,
        collectionName: 'leads',
        businessType,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: leadPageLimit,
        startAfterDoc: reset ? null : leadCursorRef.current,
        diagnostics: { currentUserUid: userId, role },
      })
      if (requestId !== leadRequestRef.current) return { ok: false }

      const nextRows = Array.isArray(page.rows) ? page.rows : []
      setRows((currentRows) => (reset ? nextRows : mergeLeadPages(currentRows, nextRows)))
      leadCursorRef.current = page.lastDoc
      setHasMoreLeads(page.hasMore)
      setLeadPage((currentPage) => (reset ? 1 : currentPage + 1))
      setSource('firestore')
      setError('')
      console.log(reset ? '[Leads] first page loaded' : '[Leads] next page loaded', {
        count: page.size,
        pageSize: leadPageLimit,
        hasMore: page.hasMore,
      })
      console.log('[Leads] pagination cursor', {
        cursorId: page.lastDoc?.id || null,
        hasCursor: Boolean(page.lastDoc),
      })
      return { ok: true }
    } catch (err) {
      if (requestId !== leadRequestRef.current) return { ok: false }
      console.warn('[Sales Hub Firestore Read Failed]', {
        currentUserUid: userId || '',
        role: role || '',
        workspaceId: workspaceId || '',
        collectionPath: workspaceId ? `workspaces/${workspaceId}/leads` : '',
        collectionName: 'leads',
        firestoreErrorCode: err?.code || err?.originalError?.code || 'unknown',
      })
      setError(clientSafeMessage(err, 'Unable to load leads.'))
      if (reset) setRows([])
      setSource('firestore')
      return { ok: false, error: clientSafeMessage(err, 'Unable to load leads.') }
    } finally {
      if (requestId === leadRequestRef.current) {
        if (reset) setLoading(false)
        else setPaginationLoading(false)
      }
    }
  }, [businessType, leadPageLimit, role, userId, workspaceId])

  const loadMoreLeads = useCallback(async () => {
    if (loading || paginationLoading || !hasMoreLeads) return { ok: true }
    return loadLeadPage({ reset: false })
  }, [hasMoreLeads, loadLeadPage, loading, paginationLoading])

  const prependLead = useCallback((lead) => {
    setRows((currentRows) => [lead, ...currentRows])
  }, [])

  const updateLead = useCallback(async (id, payload = {}) => {
    if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
    if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
    if (!id) return { ok: false, error: 'Lead not found' }

    const name = String(payload.name || '').trim()
    const email = String(payload.email || '').trim()
    if (!name || !email) return { ok: false, error: 'Name and email are required' }

    const patch = {
      name,
      email,
      phone: String(payload.phone || '').trim(),
      company: String(payload.company || '').trim(),
      dealValue: Math.max(0, Number(payload.dealValue || 0)),
      status: payload.status || 'New',
      priority: payload.priority || 'Medium',
      source: payload.source || 'Website',
    }

    try {
      await patchUserDoc(workspaceId, 'leads', id, patch, {
        businessType,
        diagnostics: { currentUserUid: userId, role },
      })
      setRows((currentRows) => currentRows.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: clientSafeMessage(error, 'Unable to update lead.') }
    }
  }, [businessType, role, userId, workspaceId])

  const deleteLead = useCallback(async (lead) => {
    if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
    if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
    if (!lead?.id) return { ok: false, error: 'Lead not found' }

    try {
      await removeUserDoc(workspaceId, 'leads', lead.id, {
        diagnostics: { currentUserUid: userId, role },
      })
      setRows((currentRows) => currentRows.filter((row) => row.id !== lead.id))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: clientSafeMessage(error, 'Unable to delete lead.') }
    }
  }, [role, userId, workspaceId])

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setRows([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
        setPaginationLoading(false)
        setHasMoreLeads(false)
        setLeadPage(0)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setRows([])
        leadCursorRef.current = null
        setHasMoreLeads(false)
        setLeadPage(0)
        setSource('firestore')
        setError('')
        setLoading(false)
        setPaginationLoading(false)
      })
      return
    }
    if (paginated) {
      loadLeadPage({ reset: true })
      return () => {
        leadRequestRef.current += 1
      }
    }

    Promise.resolve().then(() => setLoading(true))
    const unsub = listenToWorkspaceCollection({
      workspaceId,
      collectionName: 'leads',
      businessType,
      limitCount: leadListLimit,
      diagnostics: { currentUserUid: userId, role },
      onData(data) {
        setRows(Array.isArray(data) ? data : [])
        setSource('firestore')
        setLoading(false)
      },
      onError(err) {
        console.warn('[Sales Hub Firestore Read Failed]', {
          currentUserUid: userId || '',
          role: role || '',
          workspaceId: workspaceId || '',
          collectionPath: workspaceId ? `workspaces/${workspaceId}/leads` : '',
          collectionName: 'leads',
          firestoreErrorCode: err?.code || err?.originalError?.code || 'unknown',
        })
        setError(clientSafeMessage(err, 'Unable to load leads.'))
        setRows([])
        setSource('firestore')
        setLoading(false)
      },
    })
    return () => unsub()
  }, [businessType, leadListLimit, loadLeadPage, paginated, role, userId, workspaceId])

  const scored = useMemo(
    () =>
      rows.map((l) => {
        const ai = computeLeadScore(l)
        return { ...l, ...ai }
      }),
    [rows],
  )

  return {
    leads: scored,
    loading,
    paginationLoading,
    hasMoreLeads,
    leadPage,
    leadPageSize: paginated ? leadPageLimit : leadListLimit,
    loadMoreLeads,
    prependLead,
    updateLead,
    deleteLead,
    source,
    error,
  }
}
