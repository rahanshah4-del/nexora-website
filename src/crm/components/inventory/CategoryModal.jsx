import { useEffect, useState } from 'react'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import InventoryModal, { Field } from './InventoryModal.jsx'

const blank = { name: '', description: '', status: 'active' }

export default function CategoryModal({ open, category, onClose, onSave }) {
  const [draft, setDraft] = useState(blank)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(() => {
      setDraft(category ? { ...blank, ...category } : blank)
      setError('')
      setSaving(false)
    })
  }, [open, category])

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit() {
    if (!draft.name.trim()) {
      setError('Category name is required')
      return
    }
    setSaving(true)
    const result = await onSave?.(draft)
    setSaving(false)
    if (result && result.ok === false) setError(result.error || 'Unable to save category')
  }

  return (
    <InventoryModal
      open={open}
      size="sm"
      title={category ? 'Edit Category' : 'Add Category'}
      subtitle="Group products for faster filtering and reporting."
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={saving ? 'Saving…' : category ? 'Save Category' : 'Create Category'}
      submitDisabled={saving}
      error={error}
    >
      <div className="grid gap-3">
        <Field label="Category Name *">
          <Input className="h-9 rounded-xl" value={draft.name} onChange={(e) => update('name', e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea
            className="focus-ring min-h-20 w-full resize-y rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
            value={draft.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </Field>
        <Field label="Status">
          <Select className="h-9 rounded-xl" value={draft.status} onChange={(e) => update('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>
    </InventoryModal>
  )
}
