import { useState } from 'react'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Badge from '../ui/Badge.jsx'

export default function TicketComments({ ticket, onAdd }) {
  const [message, setMessage] = useState('')
  const comments = ticket?.comments || []

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Comments</p>
        <Badge variant="purple">{comments.length}</Badge>
      </div>

      <div className="mt-3 space-y-2">
        {comments.length ? (
          comments.map((c) => (
            <div key={c.id} className="glass-muted rounded-2xl p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.author || 'User'}</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">{c.createdAt || '—'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">{c.message}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl px-3 py-8 text-center text-sm text-slate-600 dark:text-slate-300">No comments yet.</div>
        )}
      </div>

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
    </div>
  )
}

