import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { ModalShell, Field, Textarea } from './ModalShell.jsx'
import { LEAD_SOURCES, LEAD_STAGES } from '../../lib/whatsappManual.js'

const CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'INR']

export default function LeadModal({ open, mode = 'create', draft, setDraft, busy = false, onSubmit, onClose, agents = [], contacts = [] }) {
  if (!draft) return null
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  return (
    <ModalShell open={open} onClose={onClose} badge="Lead" title={mode === 'edit' ? 'Edit lead' : 'New lead'}>
      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        {contacts.length ? (
          <Field label="Link existing contact" hint="Optional — fills name and number from a contact.">
            <Select
              value={draft.contactId || ''}
              onChange={(e) => {
                const match = contacts.find((c) => c.id === e.target.value)
                setDraft((current) => ({
                  ...current,
                  contactId: match?.id || '',
                  name: match?.name || current.name,
                  phone: match?.phone || current.phone,
                  email: match?.email || current.email,
                  company: match?.company || current.company,
                }))
              }}
            >
              <option value="">— No linked contact —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
              ))}
            </Select>
          </Field>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Lead name">
            <Input placeholder="e.g. Ayesha Khan" value={draft.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="WhatsApp number" hint="Include country code.">
            <Input inputMode="tel" placeholder="923001234567" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email">
            <Input type="email" placeholder="name@email.com" value={draft.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Company">
            <Input placeholder="Company (optional)" value={draft.company} onChange={(e) => set('company', e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Stage">
            <Select value={draft.stage} onChange={(e) => set('stage', e.target.value)}>
              {LEAD_STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Source">
            <Select value={draft.source} onChange={(e) => set('source', e.target.value)}>
              {LEAD_SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Deal value">
            <Input inputMode="decimal" placeholder="0" value={draft.value} onChange={(e) => set('value', e.target.value)} />
          </Field>
          <Field label="Currency">
            <Select value={draft.currency} onChange={(e) => set('currency', e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Assigned agent">
            {agents.length ? (
              <Select value={draft.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
                <option value="">— Unassigned —</option>
                {agents.map((a) => (
                  <option key={a.id || a.name} value={a.name}>{a.name}</option>
                ))}
              </Select>
            ) : (
              <Input placeholder="Agent name" value={draft.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} />
            )}
          </Field>
          <Field label="Next action date">
            <Input type="date" value={draft.nextActionAt} onChange={(e) => set('nextActionAt', e.target.value)} />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea placeholder="Requirement, budget, context..." value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button className="rounded-2xl" type="submit" disabled={busy}>
            {busy ? 'Saving...' : mode === 'edit' ? 'Save lead' : 'Add lead'}
          </Button>
          <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}
