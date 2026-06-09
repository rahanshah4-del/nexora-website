import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { ModalShell, Field, Textarea } from './ModalShell.jsx'
import { FOLLOWUP_STATUSES, PRIORITIES } from '../../lib/whatsappManual.js'

export default function FollowUpModal({ open, mode = 'create', draft, setDraft, busy = false, onSubmit, onClose, agents = [], contacts = [] }) {
  if (!draft) return null
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  return (
    <ModalShell open={open} onClose={onClose} badge="Follow-up" title={mode === 'edit' ? 'Edit follow-up' : 'New follow-up'}>
      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <Field label="Title">
          <Input placeholder="e.g. Send price list, confirm order" value={draft.title} onChange={(e) => set('title', e.target.value)} />
        </Field>

        {contacts.length ? (
          <Field label="Link contact" hint="Optional — pulls name and number from a contact.">
            <Select
              value={draft.linkId || ''}
              onChange={(e) => {
                const match = contacts.find((c) => c.id === e.target.value)
                setDraft((current) => ({
                  ...current,
                  linkId: match?.id || '',
                  linkType: match ? 'contact' : current.linkType,
                  contactName: match?.name || current.contactName,
                  phone: match?.phone || current.phone,
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
          <Field label="Contact name">
            <Input placeholder="Who is this for?" value={draft.contactName} onChange={(e) => set('contactName', e.target.value)} />
          </Field>
          <Field label="WhatsApp number" hint="For the click-to-chat shortcut.">
            <Input inputMode="tel" placeholder="923001234567" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Due date">
            <Input type="date" value={draft.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
          <Field label="Priority">
            <Select value={draft.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={draft.status} onChange={(e) => set('status', e.target.value)}>
              {FOLLOWUP_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>

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

        <Field label="Notes">
          <Textarea placeholder="What needs to happen on this follow-up..." value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button className="rounded-2xl" type="submit" disabled={busy}>
            {busy ? 'Saving...' : mode === 'edit' ? 'Save follow-up' : 'Add follow-up'}
          </Button>
          <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}
