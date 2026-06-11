import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  HiOutlineCheckCircle,
  HiOutlineFunnel,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
} from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import PageSearch from '../ui/PageSearch.jsx'
import Select from '../ui/Select.jsx'
import Toast from '../ui/Toast.jsx'
import EmptyState from '../system/EmptyState.jsx'
import SkeletonLoader from '../system/SkeletonLoader.jsx'
import { formatCurrency } from '../../utils/format.js'
import { cn } from '../../utils/cn.js'

function fieldValue(row, field) {
  const value = row?.[field.key]
  if (field.format === 'money') return formatCurrency(value || 0, row.currency || 'PKR')
  if (field.format === 'percent') return `${Number(value || 0)}%`
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`
  return value || field.empty || '-'
}

function toneFor(value) {
  const text = String(value || '').toLowerCase()
  if (['won', 'accepted', 'completed', 'active'].includes(text)) return 'success'
  if (['lost', 'rejected', 'expired', 'overdue', 'inactive'].includes(text)) return 'danger'
  if (['high', 'sent', 'meeting', 'proposal', 'negotiation'].includes(text)) return 'warning'
  return 'info'
}

function RecordModal({ config, record, onClose, onSave }) {
  const [draft, setDraft] = useState(() => record || config.initial())
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="crm-modal-panel max-w-3xl"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          onClick={(event) => event.stopPropagation()}
        >
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-950 dark:text-white">{record ? `Edit ${config.single}` : `Add ${config.single}`}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{config.modalSubtitle}</p>
              </div>
              <Badge variant="info">Sales Hub</Badge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {config.fields.map((field) => (
                <label key={field.key} className={field.large ? 'sm:col-span-2' : ''}>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">{field.label}</span>
                  {field.type === 'select' ? (
                    <Select
                      className="mt-1.5"
                      value={draft[field.key] || field.options?.[0] || ''}
                      onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                    >
                      {(field.options || []).map((option) => <option key={option}>{option}</option>)}
                    </Select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      className="focus-ring mt-1.5 min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      value={draft[field.key] || ''}
                      onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <Input
                      className="mt-1.5"
                      type={field.type || 'text'}
                      inputMode={field.inputMode}
                      value={draft[field.key] ?? ''}
                      onChange={(event) => {
                        const raw = event.target.value
                        setDraft((current) => ({ ...current, [field.key]: field.number ? Number(raw || 0) : raw }))
                      }}
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="rounded-2xl" type="button" onClick={() => onSave(draft)}>
                Save {config.single}
              </Button>
              <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function SalesHubModulePage({ config, api, metrics = [], chart, renderExtra }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const rows = api.rows || []
  const filterOptions = useMemo(() => ['all', ...Array.from(new Set(rows.map((row) => row[config.filterKey]).filter(Boolean)))], [config.filterKey, rows])
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      const text = config.searchKeys.map((key) => row[key]).join(' ').toLowerCase()
      const matchesSearch = !needle || text.includes(needle)
      const matchesFilter = filter === 'all' || row[config.filterKey] === filter
      return matchesSearch && matchesFilter
    })
  }, [config.filterKey, config.searchKeys, filter, query, rows])

  function showToast(tone, message) {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), 2200)
  }

  async function saveRecord(draft) {
    const res = draft.id ? await api.updateRow(draft.id, config.sanitize(draft)) : await api.createRow(config.sanitize(draft))
    if (res.ok) {
      showToast('success', `${config.single} saved`)
      setModalOpen(false)
      setEditing(null)
    } else {
      showToast('error', res.error || `Unable to save ${config.single.toLowerCase()}`)
    }
  }

  return (
    <motion.div className="min-w-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        right={
          <Button className="rounded-2xl" type="button" onClick={() => setModalOpen(true)}>
            <HiOutlinePlus className="h-4 w-4" />
            Add {config.single}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{metric.label}</p>
            <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{metric.value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{metric.helper}</p>
          </Card>
        ))}
      </div>

      {chart ? <div className="mt-4">{chart}</div> : null}

      <Card className="mt-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <PageSearch
            value={query}
            onChange={setQuery}
            placeholder={config.searchPlaceholder}
            resultCount={filteredRows.length}
            totalCount={rows.length}
            className="lg:w-96"
          />
          <div className="flex min-w-0 items-center gap-2">
            <HiOutlineFunnel className="h-5 w-5 text-slate-400" />
            <Select value={filter} onChange={(event) => setFilter(event.target.value)} className="min-w-40">
              {filterOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'All filters' : option}</option>)}
            </Select>
          </div>
        </div>

        {api.error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{api.error}</div> : null}
        {api.loading ? (
          <div className="mt-4"><SkeletonLoader lines={6} /></div>
        ) : filteredRows.length ? (
          <div className="mt-4 grid gap-3">
            {filteredRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{row.title || row.name || row.quoteNumber}</p>
                      <Badge variant={toneFor(row[config.filterKey])}>{row[config.filterKey] || 'Open'}</Badge>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-slate-500 dark:text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                      {config.summaryFields.map((field) => (
                        <span key={field.key} className="truncate">
                          <span className="font-semibold text-slate-600 dark:text-slate-200">{field.label}:</span> {fieldValue(row, field)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button className="focus-ring grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-sky-700" type="button" aria-label="Edit" onClick={() => setEditing(row)}>
                      <HiOutlinePencilSquare className="h-5 w-5" />
                    </button>
                    <button className="focus-ring grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-rose-600 hover:bg-rose-50" type="button" aria-label="Delete" onClick={() => setDeleting(row)}>
                      <HiOutlineTrash className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title={`No ${config.title.toLowerCase()} yet`} description={config.emptyDescription} actionLabel={`Add ${config.single}`} onAction={() => setModalOpen(true)} />
          </div>
        )}
      </Card>

      {renderExtra ? renderExtra({ rows, filteredRows }) : null}

      {modalOpen || editing ? <RecordModal config={config} record={editing} onClose={() => { setModalOpen(false); setEditing(null) }} onSave={saveRecord} /> : null}

      <AnimatePresence>
        {deleting ? (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="max-w-md p-5">
              <HiOutlineCheckCircle className="h-8 w-8 text-rose-500" />
              <p className="mt-3 text-base font-semibold text-slate-950 dark:text-white">Delete {config.single.toLowerCase()}?</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">This removes the record from this workspace only.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button className={cn('rounded-2xl bg-rose-600 hover:bg-rose-700')} type="button" onClick={async () => {
                  const res = await api.deleteRow(deleting.id)
                  showToast(res.ok ? 'success' : 'error', res.ok ? `${config.single} deleted` : res.error || 'Delete failed')
                  setDeleting(null)
                }}>
                  Delete
                </Button>
                <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => setDeleting(null)}>Cancel</Button>
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
