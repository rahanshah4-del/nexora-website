import { useState } from 'react'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Badge from '../ui/Badge.jsx'

function timeValue(value) {
  if (!value) return 0
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function timeLabel(value) {
  if (!value) return '—'
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timelineFor(ticket) {
  const comments = Array.isArray(ticket?.comments) ? ticket.comments : []
  const conversation = Array.isArray(ticket?.conversation) ? ticket.conversation : []
  const supportNotes = Array.isArray(ticket?.supportNotes) ? ticket.supportNotes : []
  const clientMessages = new Set([...comments, ...conversation].map((item) => String(item?.message || item || '').trim()).filter(Boolean))
  const visibleSupportNotes = supportNotes.filter((item) => !clientMessages.has(String(item?.message || item || '').trim()))
  const merged = [...comments, ...conversation, ...visibleSupportNotes]
  const seen = new Set()
  return merged
    .filter((item) => item && (item.message || typeof item === 'string'))
    .map((item, index) => {
      const entry = typeof item === 'string' ? { message: item } : item
      return {
        id: entry.id || `${entry.createdAt || 'ticket'}-${index}`,
        author: entry.author || entry.createdByEmail || (entry.internal ? 'Nexora Support' : 'User'),
        message: entry.message || '',
        createdAt: entry.createdAt,
        kind: entry.kind || (entry.internal ? 'support_note' : 'comment'),
      }
    })
    .filter((item) => {
      const key = `${item.id}|${item.message}|${item.createdAt || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => timeValue(a.createdAt) - timeValue(b.createdAt))
}

export default function TicketComments({ ticket, onAdd, canAdd = false }) {
  const [message, setMessage] = useState('')
  const timeline = timelineFor(ticket)

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Ticket Timeline</p>
        <Badge variant="purple">{timeline.length}</Badge>
      </div>

      <div className="mt-3 space-y-2">
        {timeline.length ? (
          timeline.map((c) => (
            <div key={c.id} className="glass-muted rounded-2xl p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.author || 'User'}</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">{timeLabel(c.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">{c.message}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl px-3 py-8 text-center text-sm text-slate-600 dark:text-slate-300">No timeline updates yet.</div>
        )}
      </div>

      {canAdd ? (
        <div className="mt-4 space-y-2">
          <Input placeholder="Add a comment…" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button
            className="rounded-2xl"
            type="button"
            onClick={() => {
              const text = message.trim()
              if (!text) return
              onAdd?.({ author: 'Agent', message: text })
              setMessage('')
            }}
          >
            Add Comment
          </Button>
        </div>
      ) : null}
    </div>
  )
}
