import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { ModalShell, Field, Textarea } from './ModalShell.jsx'
import { CONTACT_STATUSES, LEAD_SOURCES } from '../../lib/whatsappManual.js'

export default function ContactModal({ open, mode = 'create', draft, setDraft, busy = false, onSubmit, onClose, agents = [] }) {
  if (!draft) return null
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  return (
    <ModalShell open={open} onClose={onClose} badge="Contact" title={mode === 'edit' ? 'Edit contact' : 'New contact'}>
      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input placeholder="e.g. Ayesha Khan" value={draft.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="WhatsApp number" hint="Include country code, e.g. 923001234567.">
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

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Status">
            <Select value={draft.status} onChange={(e) => set('status', e.target.value)}>
              {CONTACT_STATUSES.map((s) => (
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
        </div>

        <Field label="Tags" hint="Comma separated, e.g. vip, lahore.">
          <Input
            placeholder="vip, lahore"
            value={Array.isArray(draft.tags) ? draft.tags.join(', ') : draft.tags || ''}
            onChange={(e) => set('tags', e.target.value)}
          />
        </Field>

        <Field label="Notes">
          <Textarea placeholder="Anything useful about this contact..." value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button className="rounded-2xl" type="submit" disabled={busy}>
            {busy ? 'Saving...' : mode === 'edit' ? 'Save contact' : 'Add contact'}
          </Button>
          <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}
