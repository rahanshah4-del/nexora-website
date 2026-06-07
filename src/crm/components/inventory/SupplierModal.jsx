import { useEffect, useState } from 'react'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import InventoryModal, { Field } from './InventoryModal.jsx'

const blank = {
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  taxId: '',
  openingBalance: 0,
  notes: '',
  status: 'active',
}

export default function SupplierModal({ open, supplier, onClose, onSave }) {
  const [draft, setDraft] = useState(blank)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() => {
      setDraft(supplier ? { ...blank, ...supplier } : blank)
      setError('')
      setSaving(false)
    })
  }, [open, supplier])

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit() {
    if (!draft.name.trim()) {
      setError('Supplier name is required')
      return
    }
    setSaving(true)
    const result = await onSave?.(draft)
    setSaving(false)
    if (result && result.ok === false) setError(result.error || 'Unable to save supplier')
  }

  return (
    <InventoryModal
      open={open}
      title={supplier ? 'Edit Supplier' : 'Add Supplier'}
      subtitle="Track vendor contacts, balances, and purchase history."
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={saving ? 'Saving…' : supplier ? 'Save Supplier' : 'Create Supplier'}
      submitDisabled={saving}
      error={error}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Supplier Name *" className="sm:col-span-2">
          <Input className="h-9 rounded-xl" value={draft.name} onChange={(e) => update('name', e.target.value)} />
        </Field>
        <Field label="Company">
          <Input className="h-9 rounded-xl" value={draft.company} onChange={(e) => update('company', e.target.value)} />
        </Field>
        <Field label="Tax ID / NTN">
          <Input className="h-9 rounded-xl" value={draft.taxId} onChange={(e) => update('taxId', e.target.value)} />
        </Field>
        <Field label="Email">
          <Input className="h-9 rounded-xl" type="email" value={draft.email} onChange={(e) => update('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input className="h-9 rounded-xl" value={draft.phone} onChange={(e) => update('phone', e.target.value)} />
        </Field>
        <Field label="Opening Balance">
          <Input
            className="h-9 rounded-xl"
            inputMode="decimal"
            value={draft.openingBalance}
            onChange={(e) => update('openingBalance', Number(e.target.value || 0))}
          />
        </Field>
        <Field label="Status">
          <Select className="h-9 rounded-xl" value={draft.status} onChange={(e) => update('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input className="h-9 rounded-xl" value={draft.address} onChange={(e) => update('address', e.target.value)} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea
            className="focus-ring min-h-20 w-full resize-y rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
            value={draft.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </Field>
      </div>
    </InventoryModal>
  )
}
