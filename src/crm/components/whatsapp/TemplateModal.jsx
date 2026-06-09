import { useMemo } from 'react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import { ModalShell, Field, Textarea } from './ModalShell.jsx'
import { TEMPLATE_CATEGORIES, renderTemplate, templateVariables } from '../../lib/whatsappManual.js'

// Sample values used only for the live preview inside the editor.
const PREVIEW_VARS = { name: 'Ayesha', company: 'Acme Co.', agent: 'Sara', amount: '5,000', date: 'Mon' }

export default function TemplateModal({ open, mode = 'create', draft, setDraft, busy = false, onSubmit, onClose }) {
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const variables = useMemo(() => templateVariables(draft?.body || ''), [draft?.body])
  const preview = useMemo(() => renderTemplate(draft?.body || '', PREVIEW_VARS), [draft?.body])

  if (!draft) return null

  return (
    <ModalShell open={open} onClose={onClose} badge="Template" title={mode === 'edit' ? 'Edit template' : 'New template'} wide>
      <form className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]" onSubmit={onSubmit}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Template name">
              <Input placeholder="e.g. Welcome message" value={draft.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Category">
              <Select value={draft.category} onChange={(e) => set('category', e.target.value)}>
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Message" hint="Use placeholders like {{name}} or {{company}} — they are filled in when you send.">
            <Textarea
              placeholder={'Hi {{name}}, thanks for reaching out to {{company}}! How can we help today?'}
              value={draft.body}
              onChange={(e) => set('body', e.target.value)}
              style={{ minHeight: '150px' }}
            />
          </Field>

          {variables.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Variables:</span>
              {variables.map((v) => (
                <Badge key={v} variant="info">{`{{${v}}}`}</Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Preview</p>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 dark:text-slate-100">
              {preview || 'Your message preview will appear here.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button className="rounded-2xl" type="submit" disabled={busy}>
              {busy ? 'Saving...' : mode === 'edit' ? 'Save template' : 'Create template'}
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
