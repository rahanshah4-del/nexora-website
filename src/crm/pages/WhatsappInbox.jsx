import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  HiOutlineArrowLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentDuplicate,
  HiOutlinePaperAirplane,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUserCircle,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Select from '../components/ui/Select.jsx'
import Toast from '../components/ui/Toast.jsx'
import { confirmAction } from '../components/ui/dialogActions.js'
import EmptyState from '../components/system/EmptyState.jsx'
import ContactModal from '../components/whatsapp/ContactModal.jsx'
import ConfirmDialog from '../components/whatsapp/ConfirmDialog.jsx'
import { useWhatsappContacts } from '../hooks/useWhatsappContacts.js'
import { useWhatsappTemplates } from '../hooks/useWhatsappTemplates.js'
import { useWhatsappNotes } from '../hooks/useWhatsappNotes.js'
import { useTeamMembers } from '../hooks/useTeamMembers.js'
import { useUser } from '../hooks/useUser.js'
import { formatCompact } from '../utils/format.js'
import { enqueueBackgroundJob } from '../lib/backgroundJobs.js'
import { CONTACT_STATUSES, contactStats, renderTemplate, waLink } from '../lib/whatsappManual.js'

const blankContact = {
  name: '',
  phone: '',
  email: '',
  company: '',
  status: 'New',
  source: 'WhatsApp',
  assignedTo: '',
  tags: '',
  notes: '',
}

const STATUS_FILTERS = ['All', ...CONTACT_STATUSES]

function statusBadge(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'customer') return 'success'
  if (value === 'active') return 'info'
  if (value === 'blocked') return 'danger'
  if (value === 'inactive') return 'default'
  return 'purple'
}

function contactVars(contact) {
  return {
    name: contact?.name || '',
    company: contact?.company || '',
    phone: contact?.phone || '',
    agent: contact?.assignedTo || '',
  }
}

function noteTime(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default function WhatsappInboxPage() {
  const api = useWhatsappContacts()
  const templatesApi = useWhatsappTemplates()
  const notesApi = useWhatsappNotes()
  const teamApi = useTeamMembers()
  const { workspaceId, userId, businessType, firebaseUser, userDoc } = useUser()

  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(blankContact)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [templateId, setTemplateId] = useState('')
  const [message, setMessage] = useState('')
  const [noteText, setNoteText] = useState('')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  const stats = useMemo(() => contactStats(api.contacts), [api.contacts])
  const agents = teamApi.members || []

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return api.contacts.filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false
      if (!term) return true
      return `${c.name} ${c.phone} ${c.company} ${c.email}`.toLowerCase().includes(term)
    })
  }, [api.contacts, search, statusFilter])

  const selected = useMemo(() => api.contacts.find((c) => c.id === selectedId) || null, [api.contacts, selectedId])
  const selectedNotes = useMemo(() => notesApi.notesFor(selectedId), [notesApi, selectedId])

  function showToast(tone, text, delay = 2200) {
    setToast({ tone, message: text })
    window.setTimeout(() => setToast(null), delay)
  }

  function openCreate() {
    setEditing(null)
    setDraft(blankContact)
    setModalOpen(true)
  }

  function openEdit(contact) {
    setEditing(contact)
    setDraft({ ...blankContact, ...contact, tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : contact.tags || '' })
    setModalOpen(true)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    const res = editing ? await api.updateContact(editing.id, draft) : await api.createContact(draft)
    setBusy(false)
    if (res?.ok) {
      showToast('success', editing ? 'Contact updated' : 'Contact added')
      setModalOpen(false)
      if (res.id) setSelectedId(res.id)
      setEditing(null)
      setDraft(blankContact)
    } else {
      showToast('error', res?.error || 'Unable to save contact', 2600)
    }
  }

  function applyTemplate(id) {
    setTemplateId(id)
    const template = templatesApi.templates.find((t) => t.id === id)
    if (template && selected) setMessage(renderTemplate(template.body, contactVars(selected)))
    else if (template) setMessage(template.body)
  }

  function openWhatsapp() {
    if (!selected) return
    const link = waLink(selected.phone, message)
    if (!link) {
      showToast('error', 'This contact has no valid WhatsApp number', 2600)
      return
    }
    window.open(link, '_blank', 'noopener,noreferrer')
    api.markContacted(selected)
    const template = templatesApi.templates.find((t) => t.id === templateId)
    if (template) templatesApi.recordUsage(template)
  }

  async function queueBulkMessage() {
    if (!message.trim()) {
      showToast('error', 'Message is required before queueing bulk send.', 2600)
      return
    }
    const recipients = filtered
      .filter((contact) => contact.phone)
      .map((contact) => ({
        id: contact.id,
        name: contact.name || '',
        phone: contact.phone || '',
        company: contact.company || '',
        message: renderTemplate(message, contactVars(contact)),
      }))
    if (!recipients.length) {
      showToast('error', 'No filtered contacts have WhatsApp numbers.', 2600)
      return
    }
    setBusy(true)
    const res = await enqueueBackgroundJob({
      workspaceId,
      userId,
      businessType,
      createdByEmail: firebaseUser?.email || userDoc?.email || '',
      type: 'whatsapp.bulk',
      label: `WhatsApp bulk message (${recipients.length})`,
      route: '/app/whatsapp-inbox',
      payload: {
        message,
        templateId,
        recipients,
      },
      metadata: { total: recipients.length },
    })
    setBusy(false)
    if (res.ok) showToast('success', `Bulk WhatsApp job queued for ${recipients.length} contact(s).`, 3000)
    else showToast('error', res.error || 'Unable to queue WhatsApp bulk send.', 3000)
  }

  async function copyMessage() {
    if (!message.trim()) return
    try {
      await navigator.clipboard.writeText(message)
      showToast('success', 'Message copied')
    } catch {
      showToast('error', 'Could not copy message', 2200)
    }
  }

  async function changeStatus(status) {
    if (!selected) return
    const res = await api.setStatus(selected, status)
    if (!res?.ok) showToast('error', res?.error || 'Unable to update status', 2600)
  }

  async function changeAgent(assignedTo) {
    if (!selected) return
    const res = await api.assignContact(selected, assignedTo)
    if (!res?.ok) showToast('error', res?.error || 'Unable to assign', 2600)
  }

  async function addNote() {
    if (!selected || !noteText.trim()) return
    setBusy(true)
    const res = await notesApi.addNote({ body: noteText, linkType: 'contact', linkId: selected.id, linkName: selected.name })
    setBusy(false)
    if (res?.ok) {
      setNoteText('')
      showToast('success', 'Note added')
    } else {
      showToast('error', res?.error || 'Unable to add note', 2600)
    }
  }

  async function deleteNote(note) {
    if (!await confirmAction({ title: 'Delete note?', message: 'This contact note will be permanently removed.', confirmLabel: 'Delete Note' })) return
    const res = await notesApi.deleteNote(note)
    if (res?.ok === false) showToast('error', res?.error || 'Unable to delete note', 2600)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    const res = await api.deleteContact(deleteTarget)
    setBusy(false)
    if (res?.ok) {
      showToast('success', 'Contact deleted')
      if (selectedId === deleteTarget.id) setSelectedId(null)
      setDeleteTarget(null)
    } else {
      showToast('error', res?.error || 'Unable to delete contact', 2600)
    }
  }

  function selectContact(contact) {
    setSelectedId(contact.id)
    setTemplateId('')
    setMessage('')
    setNoteText('')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}

      <PageHeader
        title="WhatsApp Inbox"
        subtitle="Manage WhatsApp contacts and start chats with one click. Manual mode — no API required."
        right={
          <Button className="rounded-2xl" type="button" onClick={openCreate}>
            <HiOutlinePlus className="h-4 w-4" /> New contact
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Contacts" value={stats.total} icon={HiOutlineUserGroup} tone="sky" />
        <MiniStat label="Customers" value={stats.customers} icon={HiOutlineUserCircle} tone="emerald" />
        <MiniStat label="Active" value={stats.active} icon={HiOutlineChatBubbleLeftRight} tone="violet" />
        <MiniStat label="Blocked" value={stats.blocked} icon={HiOutlineTrash} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
        {/* Contact list */}
        <Card className={`p-4 ${selected ? 'hidden lg:block' : 'block'}`}>
          <div className="space-y-2">
            <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_FILTERS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>

          <div className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
            {api.loading ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading contacts...</p>
            ) : filtered.length ? (
              filtered.map((contact) => {
                const active = contact.id === selectedId
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => selectContact(contact)}
                    className={`focus-ring flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
                      active
                        ? 'border-sky-200 bg-sky-50/70 dark:border-sky-500/30 dark:bg-sky-500/10'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white">
                      {(contact.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">{contact.name}</span>
                      <span className="block truncate text-xs text-slate-500">{contact.phone || 'No number'}</span>
                    </span>
                    <Badge variant={statusBadge(contact.status)}>{contact.status}</Badge>
                  </button>
                )
              })
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                {api.contacts.length ? 'No contacts match your filters.' : 'No contacts yet. Add your first one.'}
              </p>
            )}
          </div>
        </Card>

        {/* Detail / composer */}
        <Card className={`p-5 ${selected ? 'block' : 'hidden lg:block'}`}>
          {!selected ? (
            <div className="grid min-h-[20rem] place-items-center">
              <EmptyState title="Select a contact" description="Pick a contact from the list to view their profile and start a WhatsApp chat." />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" className="lg:hidden" onClick={() => setSelectedId(null)} aria-label="Back to list">
                    <HiOutlineArrowLeft className="h-5 w-5 text-slate-500" />
                  </button>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-lg font-bold text-white">
                    {(selected.name || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-950 dark:text-white">{selected.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {selected.phone || 'No number'}
                      {selected.company ? ` · ${selected.company}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="subtle" className="h-8 rounded-xl px-2.5 text-xs" type="button" onClick={() => openEdit(selected)}>
                    Edit
                  </Button>
                  <Button
                    variant="subtle"
                    className="h-8 rounded-xl border-rose-200 px-2.5 text-xs text-rose-700 hover:border-rose-300"
                    type="button"
                    onClick={() => setDeleteTarget(selected)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Status</span>
                  <Select value={selected.status} onChange={(e) => changeStatus(e.target.value)}>
                    {CONTACT_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Assigned agent</span>
                  {agents.length ? (
                    <Select value={selected.assignedTo || ''} onChange={(e) => changeAgent(e.target.value)}>
                      <option value="">— Unassigned —</option>
                      {agents.map((a) => (
                        <option key={a.id || a.name} value={a.name}>{a.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input value={selected.assignedTo || ''} placeholder="Agent name" onChange={(e) => changeAgent(e.target.value)} />
                  )}
                </label>
              </div>

              {Array.isArray(selected.tags) && selected.tags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((tag) => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              ) : null}

              {/* Click-to-WhatsApp composer */}
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Send via WhatsApp</p>
                <div className="mt-3 space-y-3">
                  <Select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                    <option value="">Insert a template (optional)…</option>
                    {templatesApi.templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                  <textarea
                    className="focus-ring min-h-[110px] w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                    placeholder="Type your message, or pick a template above..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" type="button" onClick={openWhatsapp}>
                      <HiOutlinePaperAirplane className="h-4 w-4" /> Open in WhatsApp
                    </Button>
                    <Button variant="subtle" className="rounded-2xl" type="button" onClick={copyMessage} disabled={!message.trim()}>
                      <HiOutlineDocumentDuplicate className="h-4 w-4" /> Copy
                    </Button>
                    <Button variant="subtle" className="rounded-2xl" type="button" onClick={queueBulkMessage} disabled={busy || !message.trim()}>
                      <HiOutlineUserGroup className="h-4 w-4" /> Queue bulk
                    </Button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Notes</p>
                <div className="mt-2 flex gap-2">
                  <Input placeholder="Add a note about this contact..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                  <Button className="rounded-2xl" type="button" onClick={addNote} disabled={busy || !noteText.trim()}>
                    Add
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {selectedNotes.length ? (
                    selectedNotes.map((note) => (
                      <div key={note.id} className="group rounded-xl border border-slate-100 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">{note.body}</p>
                          <button
                            type="button"
                            className="shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-600"
                            onClick={() => deleteNote(note)}
                            aria-label="Delete note"
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {note.authorName ? `${note.authorName} · ` : ''}{noteTime(note.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-5 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/5">
                      No notes yet for this contact.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <ContactModal
        open={modalOpen}
        mode={editing ? 'edit' : 'create'}
        draft={draft}
        setDraft={setDraft}
        busy={busy}
        onSubmit={submit}
        onClose={() => setModalOpen(false)}
        agents={agents}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        badge="Delete contact"
        title="Delete this contact?"
        message={deleteTarget ? `${deleteTarget.name} and their inbox profile will be permanently removed.` : ''}
        confirmLabel="Delete contact"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}

function MiniStat({ label, value, icon: Icon, tone }) {
  const tones = {
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  }
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCompact(value)}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${tones[tone] || tones.sky}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}
