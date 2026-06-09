import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { HiOutlineDocumentDuplicate, HiOutlinePlus } from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import TemplateModal from '../components/whatsapp/TemplateModal.jsx'
import ConfirmDialog from '../components/whatsapp/ConfirmDialog.jsx'
import { useWhatsappTemplates } from '../hooks/useWhatsappTemplates.js'
import { formatCompact } from '../utils/format.js'
import { TEMPLATE_CATEGORIES } from '../lib/whatsappManual.js'

const blankTemplate = { name: '', category: 'Greeting', body: '' }
const CATEGORY_FILTERS = ['All', ...TEMPLATE_CATEGORIES]

export default function WhatsappTemplatesPage() {
  const api = useWhatsappTemplates()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(blankTemplate)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  function showToast(tone, message, delay = 2200) {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), delay)
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return api.templates.filter((t) => {
      if (filter !== 'All' && t.category !== filter) return false
      if (!term) return true
      return `${t.name} ${t.body}`.toLowerCase().includes(term)
    })
  }, [api.templates, filter, search])

  function openCreate() {
    setEditing(null)
    setDraft(blankTemplate)
    setModalOpen(true)
  }

  function openEdit(template) {
    setEditing(template)
    setDraft({ name: template.name, category: template.category, body: template.body })
    setModalOpen(true)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    const res = editing ? await api.updateTemplate(editing.id, draft) : await api.createTemplate(draft)
    setBusy(false)
    if (res?.ok) {
      showToast('success', editing ? 'Template updated' : 'Template added')
      setModalOpen(false)
      setEditing(null)
      setDraft(blankTemplate)
    } else {
      showToast('error', res?.error || 'Unable to save template', 2600)
    }
  }

  async function copyTemplate(template) {
    try {
      await navigator.clipboard.writeText(template.body)
      api.recordUsage(template)
      showToast('success', 'Message copied to clipboard')
    } catch {
      showToast('error', 'Could not copy — select and copy manually', 2600)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    const res = await api.deleteTemplate(deleteTarget)
    setBusy(false)
    if (res?.ok) {
      showToast('success', 'Template deleted')
      setDeleteTarget(null)
    } else {
      showToast('error', res?.error || 'Unable to delete template', 2600)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}

      <PageHeader
        title="WhatsApp Templates"
        subtitle="Reusable message templates with placeholders for fast, consistent replies."
        right={
          <Button className="rounded-2xl" type="button" onClick={openCreate}>
            <HiOutlinePlus className="h-4 w-4" /> New template
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[180px] flex-1">
            <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="w-44">
            <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
              {CATEGORY_FILTERS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <Badge variant="default">{formatCompact(api.templates.length)} total</Badge>
        </div>
      </Card>

      {api.loading ? (
        <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">Loading templates...</div>
      ) : api.error ? (
        <EmptyState title="Couldn't load templates" description={api.error} />
      ) : filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950 dark:text-white">{template.name}</p>
                  <Badge variant="purple" className="mt-1">{template.category}</Badge>
                </div>
                {template.usageCount ? (
                  <span className="shrink-0 text-xs text-slate-400">Used {formatCompact(template.usageCount)}×</span>
                ) : null}
              </div>
              <p className="mt-3 line-clamp-4 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                {template.body}
              </p>
              {template.variables?.length ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.variables.map((v) => (
                    <span key={v} className="rounded-lg bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">{`{{${v}}}`}</span>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs" type="button" onClick={() => copyTemplate(template)}>
                  <HiOutlineDocumentDuplicate className="h-3.5 w-3.5" /> Copy
                </Button>
                <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs" type="button" onClick={() => openEdit(template)}>
                  Edit
                </Button>
                <Button
                  variant="subtle"
                  className="h-8 rounded-xl border-rose-200 px-2.5 text-xs text-rose-700 hover:border-rose-300"
                  type="button"
                  onClick={() => setDeleteTarget(template)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : api.templates.length ? (
        <EmptyState title="No matching templates" description="Try a different search or category." />
      ) : (
        <EmptyState
          title="No templates yet"
          description="Create reusable messages with placeholders like {{name}} to reply faster."
          actionLabel="New template"
          onAction={openCreate}
        />
      )}

      <TemplateModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        draft={draft}
        setDraft={setDraft}
        busy={busy}
        onSubmit={submit}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        badge="Delete template"
        title="Delete this template?"
        message={deleteTarget ? `"${deleteTarget.name}" will be permanently removed from this workspace.` : ''}
        confirmLabel="Delete template"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}
