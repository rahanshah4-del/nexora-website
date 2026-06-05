import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, fetchWorkspaceCollectionPage, listenToWorkspaceCollection, patchUserDoc } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { useWorkspaceAccess } from './useWorkspaceAccess.js'
import { clientSafeMessage } from '../utils/messages.js'

function normalizeTicket(t) {
  return {
    id: t.id || t.ticketNumber,
    ticketNumber: t.ticketNumber || t.id || `TCK-${Math.floor(100 + Math.random() * 900)}`,
    customerName: t.customerName || '—',
    customerEmail: t.customerEmail || '',
    subject: t.subject || '—',
    message: t.message || '',
    status: t.status || 'Open',
    priority: t.priority || 'Low',
    assignedTo: t.assignedTo || 'Unassigned',
    comments: Array.isArray(t.comments) ? t.comments : [],
    createdAt: t.createdAt || '—',
    updatedAt: t.updatedAt || t.createdAt || '—',
  }
}

const DEFAULT_SUPPORT_TICKET_LIST_LIMIT = 100
const SUPPORT_TICKET_PAGE_LIMIT = 50

function safeSupportTicketListLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return DEFAULT_SUPPORT_TICKET_LIST_LIMIT
  return Math.floor(next)
}

function safeSupportTicketPageLimit(limitCount) {
  const next = Number(limitCount)
  if (!Number.isFinite(next) || next <= 0) return SUPPORT_TICKET_PAGE_LIMIT
  return Math.min(SUPPORT_TICKET_PAGE_LIMIT, Math.floor(next))
}

function mergeTicketPages(currentRows, nextRows) {
  const seen = new Set((currentRows || []).map((ticket) => ticket.id))
  return [
    ...(currentRows || []),
    ...(nextRows || []).filter((ticket) => !seen.has(ticket.id)),
  ]
}

export function useSupportTickets({ limitCount = DEFAULT_SUPPORT_TICKET_LIST_LIMIT, paginated = false } = {}) {
  const { userId, workspaceId, businessType } = useUser()
  const ticketListLimit = safeSupportTicketListLimit(limitCount)
  const ticketPageLimit = safeSupportTicketPageLimit(limitCount)
  const access = useWorkspaceAccess()
  const canReadSupportTickets = access.hasModulePermission('support', 'view')
  const canCreateSupportTickets = access.hasModulePermission('support', 'create')
  const canEditSupportTickets = access.hasModulePermission('support', 'edit')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [paginationLoading, setPaginationLoading] = useState(false)
  const [hasMoreTickets, setHasMoreTickets] = useState(false)
  const [ticketPage, setTicketPage] = useState(0)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')
  const ticketCursorRef = useRef(null)
  const ticketRequestRef = useRef(0)

  const loadTicketPage = useCallback(async ({ reset = false } = {}) => {
    if (!db) {
      setTickets([])
      setSource('none')
      setError('Secure Cloud Sync is not available right now.')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: false }
    }
    if (!workspaceId) {
      setTickets([])
      ticketCursorRef.current = null
      setHasMoreTickets(false)
      setTicketPage(0)
      setSource('firestore')
      setError('')
      setLoading(false)
      setPaginationLoading(false)
      return { ok: true }
    }

    const requestId = ++ticketRequestRef.current
    if (reset) {
      ticketCursorRef.current = null
      setTickets([])
      setHasMoreTickets(false)
      setTicketPage(0)
      setLoading(true)
    } else {
      setPaginationLoading(true)
    }

    try {
      const page = await fetchWorkspaceCollectionPage({
        workspaceId,
        collectionName: 'supportTickets',
        businessType,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: ticketPageLimit,
        startAfterDoc: reset ? null : ticketCursorRef.current,
      })
      if (requestId !== ticketRequestRef.current) return { ok: false }

      const nextRows = (Array.isArray(page.rows) ? page.rows : []).map(normalizeTicket)
      setTickets((currentRows) => (reset ? nextRows : mergeTicketPages(currentRows, nextRows)))
      ticketCursorRef.current = page.lastDoc
      setHasMoreTickets(page.hasMore)
      setTicketPage((currentPage) => (reset ? 1 : currentPage + 1))
      setSource('firestore')
      setError('')
      console.log(reset ? '[Support] first page loaded' : '[Support] next page loaded', {
        count: page.size,
        pageSize: ticketPageLimit,
        hasMore: page.hasMore,
      })
      console.log('[Support] pagination cursor', {
        cursorId: page.lastDoc?.id || null,
        hasCursor: Boolean(page.lastDoc),
      })
      return { ok: true }
    } catch (err) {
      if (requestId !== ticketRequestRef.current) return { ok: false }
      setError(clientSafeMessage(err, 'Unable to load support tickets.'))
      if (reset) setTickets([])
      setSource('firestore')
      return { ok: false, error: clientSafeMessage(err, 'Unable to load support tickets.') }
    } finally {
      if (requestId === ticketRequestRef.current) {
        if (reset) setLoading(false)
        else setPaginationLoading(false)
      }
    }
  }, [businessType, ticketPageLimit, workspaceId])

  const loadMoreTickets = useCallback(async () => {
    if (loading || paginationLoading || !hasMoreTickets) return { ok: true }
    return loadTicketPage({ reset: false })
  }, [hasMoreTickets, loadTicketPage, loading, paginationLoading])

  const prependLoadedTicket = useCallback((ticket) => {
    setTickets((currentRows) => [normalizeTicket(ticket), ...currentRows])
  }, [])

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setTickets([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
        setPaginationLoading(false)
        setHasMoreTickets(false)
        setTicketPage(0)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setTickets([])
        ticketCursorRef.current = null
        setHasMoreTickets(false)
        setTicketPage(0)
        setSource('firestore')
        setError('')
        setLoading(false)
        setPaginationLoading(false)
      })
      return
    }

    if (access.loading) {
      Promise.resolve().then(() => {
        setTickets([])
        ticketCursorRef.current = null
        setHasMoreTickets(false)
        setTicketPage(0)
        setSource('firestore')
        setError('')
        setLoading(true)
        setPaginationLoading(false)
      })
      return
    }

    if (!canReadSupportTickets) {
      Promise.resolve().then(() => {
        setTickets([])
        ticketCursorRef.current = null
        setHasMoreTickets(false)
        setTicketPage(0)
        setSource('firestore')
        setError('')
        setLoading(false)
        setPaginationLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    Promise.resolve().then(() => setError(''))

    if (paginated) {
      loadTicketPage({ reset: true })
      return () => {
        ticketRequestRef.current += 1
      }
    }

    const unsub = listenToWorkspaceCollection({
      workspaceId,
      collectionName: 'supportTickets',
      businessType,
      limitCount: ticketListLimit,
      onData(rows) {
        setTickets((Array.isArray(rows) ? rows : []).map(normalizeTicket))
        setSource('firestore')
        setLoading(false)
      },
      onError(err) {
        setError(clientSafeMessage(err, 'Unable to load support tickets.'))
        setTickets([])
        setSource('firestore')
        setLoading(false)
      },
    })

    return () => unsub?.()
  }, [access.loading, businessType, canReadSupportTickets, loadTicketPage, paginated, ticketListLimit, workspaceId])

  const stats = useMemo(() => {
    const byStatus = tickets.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    }, {})
    const urgent = tickets.filter((t) => t.priority === 'Urgent').length
    const open = tickets.filter((t) => t.status === 'Open').length
    const inProgress = tickets.filter((t) => t.status === 'In Progress').length
    const resolved = tickets.filter((t) => t.status === 'Resolved').length
    const closed = tickets.filter((t) => t.status === 'Closed').length
    return { byStatus, urgent, open, inProgress, resolved, closed, total: tickets.length }
  }, [tickets])

  const api = useMemo(
    () => ({
      tickets,
      loading,
      paginationLoading,
      hasMoreTickets,
      ticketPage,
      ticketPageSize: paginated ? ticketPageLimit : ticketListLimit,
      loadMoreTickets,
      source,
      error,
      stats,
      async createTicket(payload) {
        const ticket = normalizeTicket(payload)
        if (!canCreateSupportTickets) return { ok: false, error: 'Support ticket create permission is not enabled for this account.' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        const tno = String(ticket.ticketNumber || '').trim()
        const name = String(ticket.customerName || '').trim()
        const email = String(ticket.customerEmail || '').trim()
        const subject = String(ticket.subject || '').trim()
        const message = String(ticket.message || '').trim()
        if (!tno) return { ok: false, error: 'Ticket number is required' }
        if (!name) return { ok: false, error: 'Customer name is required' }
        if (!email) return { ok: false, error: 'Customer email is required' }
        if (!subject) return { ok: false, error: 'Subject is required' }
        if (!message) return { ok: false, error: 'Message is required' }
        if (!db) {
          setTickets((prev) => [{ ...ticket, id: tno }, ...prev])
          return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        }
        try {
          const ref = await createUserDoc(workspaceId, 'supportTickets', {
            ticketNumber: tno,
            customerName: name,
            customerEmail: email,
            subject,
            message,
            status: ticket.status || 'Open',
            priority: ticket.priority || 'Medium',
            assignedTo: ticket.assignedTo || 'Unassigned',
            comments: ticket.comments || [],
            createdBy: userId,
          }, { businessType })
          if (paginated) {
            prependLoadedTicket({
              id: ref.id,
              ticketNumber: tno,
              customerName: name,
              customerEmail: email,
              subject,
              message,
              status: ticket.status || 'Open',
              priority: ticket.priority || 'Medium',
              assignedTo: ticket.assignedTo || 'Unassigned',
              comments: ticket.comments || [],
              createdBy: userId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create ticket.') }
        }
      },
      async updateTicket(id, patch) {
        if (!canEditSupportTickets) return { ok: false, error: 'Support ticket edit permission is not enabled for this account.' }
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : t)))
        if (!db || !workspaceId || source !== 'firestore') return
        await patchUserDoc(workspaceId, 'supportTickets', id, patch, { businessType })
      },
      async addComment(id, comment) {
        if (!canEditSupportTickets) return { ok: false, error: 'Support ticket comment permission is not enabled for this account.' }
        const createdAt = new Date().toISOString().slice(0, 10)
        const nextComment = { id: `c_${Date.now()}`, ...comment, createdAt }
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, comments: [...t.comments, nextComment], updatedAt: createdAt }
              : t,
          ),
        )
        if (!db || !workspaceId || source !== 'firestore') return { ok: true }
        const current = tickets.find((t) => t.id === id)
        const next = [...(current?.comments || []), nextComment]
        try {
          await patchUserDoc(workspaceId, 'supportTickets', id, { comments: next }, { businessType })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to add comment.') }
        }
      },
    }),
    [tickets, loading, paginationLoading, hasMoreTickets, ticketPage, ticketPageLimit, ticketListLimit, loadMoreTickets, source, error, stats, businessType, canCreateSupportTickets, canEditSupportTickets, userId, workspaceId, paginated, prependLoadedTicket],
  )

  return api
}
