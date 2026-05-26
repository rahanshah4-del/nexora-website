import { useMemo, useRef, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import { aiAnswerCRM } from '../../lib/aiClient.js'
import { clientSafeMessage } from '../../utils/messages.js'

export default function AIAssistantChat({ data }) {
  const [messages, setMessages] = useState([
    { id: 'm0', role: 'assistant', text: 'Ask me about hottest leads, overdue follow-ups, pending invoices, or pipeline summary.' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)

  const prompts = useMemo(
    () => [
      'Which leads are hottest?',
      'Which customers need follow-up?',
      'Show pending invoices',
      'Show overdue tasks',
      'Summarize sales pipeline',
    ],
    [],
  )

  async function ask(text) {
    const q = text.trim()
    if (!q || busy) return
    setBusy(true)
    const userMsg = { id: `u_${Date.now()}`, role: 'user', text: q }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    try {
      const res = await aiAnswerCRM({ question: q, data })
      const botMsg = { id: `a_${Date.now()}`, role: 'assistant', text: res.text }
      setMessages((prev) => [...prev, botMsg])
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
    } catch (e) {
      setMessages((prev) => [...prev, { id: `e_${Date.now()}`, role: 'assistant', text: clientSafeMessage(e, 'Unable to generate an answer right now.') }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">AI CRM Assistant</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Answers are generated from your workspace data.</p>
        </div>
        <Badge variant="purple">AI Chat</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {prompts.map((p) => (
          <Button key={p} variant="ghost" className="rounded-2xl" type="button" onClick={() => ask(p)} disabled={busy}>
            {p}
          </Button>
        ))}
      </div>

      <div className="mt-4 h-72 overflow-auto rounded-2xl border border-white/20 bg-white/20 p-3 dark:border-white/10 dark:bg-slate-900/20">
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/50 text-slate-900 dark:bg-white/10 dark:text-slate-100'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{m.text}</pre>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          className="flex-1"
          placeholder="Ask the AI assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') ask(input)
          }}
        />
        <Button className="rounded-2xl" type="button" onClick={() => ask(input)} disabled={busy}>
          {busy ? 'Thinking…' : 'Send'}
        </Button>
      </div>
    </Card>
  )
}
