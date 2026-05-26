import { useMemo, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Select from '../ui/Select.jsx'
import { aiGenerateMessage } from '../../lib/aiClient.js'

export default function AIMessageGenerator({ leads, customers }) {
  const entities = useMemo(() => {
    const leadRows = (leads || []).slice(0, 10).map((l) => ({
      id: `lead:${l.id}`,
      name: l.name,
      company: l.company || '',
      kind: 'Lead',
    }))
    const custRows = (customers || []).slice(0, 10).map((c) => ({
      id: `customer:${c.id}`,
      name: c.name,
      company: c.company || '',
      kind: 'Customer',
    }))
    return [...leadRows, ...custRows]
  }, [leads, customers])

  const [entityId, setEntityId] = useState(() => entities[0]?.id || '')
  const [channel, setChannel] = useState('whatsapp')
  const [intent, setIntent] = useState('followup')
  const [loading, setLoading] = useState(false)
  const [out, setOut] = useState('')

  const entity = useMemo(() => entities.find((e) => e.id === entityId) || null, [entities, entityId])

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">AI Message Generator</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Generate WhatsApp, email, and proposal text from your workspace.
          </p>
        </div>
        <Badge variant="purple">AI</Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Lead / Customer</label>
          <Select className="mt-1" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.kind}: {e.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Channel</label>
          <Select className="mt-1" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="proposal">Proposal</option>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Intent</label>
          <Select className="mt-1" value={intent} onChange={(e) => setIntent(e.target.value)}>
            <option value="followup">Follow-up</option>
            <option value="proposal">Proposal</option>
            <option value="checkin">Check-in</option>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          className="rounded-2xl"
          type="button"
          onClick={async () => {
            if (!entity) return
            setLoading(true)
            try {
              const res = await aiGenerateMessage({
                channel,
                intent,
                contactName: entity.name,
                company: entity.company,
              })
              setOut(res.text)
            } finally {
              setLoading(false)
            }
          }}
        >
          {loading ? 'Generating…' : 'Generate'}
        </Button>
        <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => setOut('')}>
          Clear
        </Button>
      </div>

      <div className="mt-4">
        <textarea
          className="focus-ring h-36 w-full rounded-xl border border-white/30 bg-white/40 p-3 text-sm text-slate-900 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
          value={out}
          onChange={(e) => setOut(e.target.value)}
          placeholder="AI output will appear here…"
        />
      </div>
    </Card>
  )
}
