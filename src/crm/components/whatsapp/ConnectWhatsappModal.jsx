import { useEffect, useState } from 'react'
import { ModalShell, Field } from './ModalShell.jsx'
import Input from '../ui/Input.jsx'
import Button from '../ui/Button.jsx'

// Connect WhatsApp Business wizard. Collects non-secret metadata only — the Meta
// access token is configured securely from the Nexora backend and is never
// entered, stored, or exposed in the browser.
export default function ConnectWhatsappModal({ open, config, busy = false, onSave, onClose }) {
  const [form, setForm] = useState({
    displayName: '',
    connectedNumber: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookVerifyLabel: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm({
      displayName: config?.displayName || '',
      connectedNumber: config?.connectedNumber || '',
      phoneNumberId: config?.phoneNumberId || '',
      businessAccountId: config?.businessAccountId || '',
      webhookVerifyLabel: config?.webhookVerifyLabel || '',
    })
  }, [open, config])

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit() {
    setError('')
    const res = await onSave?.(form)
    if (res && !res.ok) setError(res.error || 'Unable to save WhatsApp details.')
  }

  return (
    <ModalShell open={open} onClose={onClose} badge="WhatsApp" title="Connect WhatsApp Business">
      <div className="mt-4 space-y-3">
        <Field label="WhatsApp Business Display Name">
          <Input value={form.displayName} onChange={(e) => update('displayName', e.target.value)} placeholder="e.g. Nexora Support" />
        </Field>
        <Field label="Business Phone Number">
          <Input value={form.connectedNumber} onChange={(e) => update('connectedNumber', e.target.value)} placeholder="e.g. 92300..." />
        </Field>
        <Field label="Meta Phone Number ID">
          <Input value={form.phoneNumberId} onChange={(e) => update('phoneNumberId', e.target.value)} placeholder="From Meta WhatsApp Manager" />
        </Field>
        <Field label="Meta Business Account ID">
          <Input value={form.businessAccountId} onChange={(e) => update('businessAccountId', e.target.value)} placeholder="WABA ID" />
        </Field>
        <Field label="Webhook Verify Token (label only)" hint="A reference label only — never paste the secret verify token here.">
          <Input value={form.webhookVerifyLabel} onChange={(e) => update('webhookVerifyLabel', e.target.value)} placeholder="e.g. prod-verify" />
        </Field>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3 text-xs leading-5 text-sky-900">
          Access token will be configured securely from Nexora backend. Secrets are never stored in the browser or Firestore.
        </div>

        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button className="rounded-2xl" type="button" disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : 'Save WhatsApp Details'}
          </Button>
          <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}
