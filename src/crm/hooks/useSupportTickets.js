import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
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

export function useSupportTickets() {
  const { workspaceId, businessType } = useUser()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setTickets([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setTickets([])
        setSource('firestore')
        setError('')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    Promise.resolve().then(() => setError(''))

    const unsub = subscribeUserCollection(
      workspaceId,
      'supportTickets',
      (rows) => {
        setTickets((Array.isArray(rows) ? rows : []).map(normalizeTicket))
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load support tickets.'))
        setTickets([])
        setSource('firestore')
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, workspaceId])

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
      source,
      error,
      stats,
      async createTicket(payload) {
        const ticket = normalizeTicket(payload)
        if (!workspaceId) return { ok: false, error: 'Please login first' }
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
          await createUserDoc(workspaceId, 'supportTickets', {
            ticketNumber: tno,
            customerName: name,
            customerEmail: email,
            subject,
            message,
            status: ticket.status || 'Open',
            priority: ticket.priority || 'Medium',
            assignedTo: ticket.assignedTo || 'Unassigned',
            comments: ticket.comments || [],
          }, { businessType })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create ticket.') }
        }
      },
      async updateTicket(id, patch) {
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : t)))
        if (!db || !workspaceId || source !== 'firestore') return
        await patchUserDoc(workspaceId, 'supportTickets', id, patch, { businessType })
      },
      async addComment(id, comment) {
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
    [tickets, loading, source, error, stats, businessType, workspaceId],
  )

  return api
}
