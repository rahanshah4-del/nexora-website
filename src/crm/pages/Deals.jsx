import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { HiOutlineArrowTopRightOnSquare, HiOutlineDocumentText, HiOutlinePaperClip, HiOutlineXMark } from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import SalesHubModulePage from '../components/sales/SalesHubModulePage.jsx'
import { useCustomers } from '../hooks/useCustomers.js'
import { useLeadScoring } from '../hooks/useLeadScoring.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { useSalesHubCollection } from '../hooks/useSalesHubCollection.js'
import { useTeamMembers } from '../hooks/useTeamMembers.js'
import { calculateDealMetrics, clampPercent, dealAmount } from '../lib/salesCalculations.js'
import { formatCurrency } from '../utils/format.js'
import { cn } from '../utils/cn.js'
import { pipelineStages } from '../data/pipelineStages.js'

const dealSources = ['Website', 'Facebook', 'Google Ads', 'WhatsApp', 'Referral', 'Cold Call', 'Email Campaign', 'Manual Entry']
const priorityOptions = ['High', 'Medium', 'Low']
const attachmentTypes = [
  { key: 'proposal', label: 'Proposal' },
  { key: 'quotation', label: 'Quotation' },
  { key: 'contract', label: 'Contract' },
]

function generateDealId() {
  const stamp = Date.now().toString(36).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `NXD-${stamp}-${suffix}`
}

function safeString(value) {
  return String(value || '').trim()
}

function leadDisplayName(lead = {}) {
  return safeString(lead.name || lead.leadName || lead.customerName || lead.title || lead.email || lead.phone || 'Unnamed lead')
}

function teamDisplayName(member = {}) {
  return safeString(member.name || member.displayName || member.email || member.id || 'Team member')
}

function normalizeDeal(row = {}) {
  const value = dealAmount(row)
  const probability = clampPercent(row.probability ?? row.winProbability ?? 30)
  return {
    ...row,
    dealId: row.dealId || generateDealId(),
    title: row.title || 'Untitled deal',
    customerId: row.customerId || '',
    customerName: row.customerName || row.customer || '',
    customerEmail: row.customerEmail || row.email || '',
    customerPhone: row.customerPhone || row.phone || '',
    company: row.company || row.customerCompany || '',
    leadId: row.leadId || '',
    leadName: row.leadName || row.lead || '',
    value,
    currency: row.currency || 'PKR',
    stage: row.stage || 'New Lead',
    probability,
    expectedRevenue: Math.round(value * (probability / 100) * 100) / 100,
    expectedCloseDate: row.expectedCloseDate || '',
    owner: row.owner || row.assignedTo || '',
    assignedUserId: row.assignedUserId || '',
    nextFollowUpDate: row.nextFollowUpDate || '',
    reminderTime: row.reminderTime || '',
    priority: row.priority || 'Medium',
    source: row.source || 'Manual Entry',
    status: row.status || 'Open',
    attachments: row.attachments && typeof row.attachments === 'object' ? row.attachments : {},
    notes: row.notes || '',
  }
}

const config = {
  title: 'Deals',
  single: 'Deal',
  subtitle: 'Track opportunities, owners, value, probability, and forecast revenue.',
  modalSubtitle: 'Deals feed the Sales Hub pipeline and forecast calculations.',
  filterKey: 'stage',
  searchKeys: ['title', 'customerName', 'leadName', 'owner', 'source', 'notes'],
  searchPlaceholder: 'Search deals by title, customer, owner, source...',
  emptyDescription: 'Create your first deal to start forecasting revenue.',
  initial: () => ({
    dealId: generateDealId(),
    title: '',
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    company: '',
    leadId: '',
    leadName: '',
    value: 0,
    currency: 'PKR',
    stage: 'New Lead',
    probability: 30,
    expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    owner: '',
    assignedUserId: '',
    nextFollowUpDate: '',
    reminderTime: '',
    priority: 'Medium',
    source: 'Manual Entry',
    status: 'Open',
    attachments: {},
    notes: '',
  }),
  sanitize: normalizeDeal,
  fields: [
    { key: 'title', label: 'Title', large: true },
    { key: 'customerName', label: 'Customer' },
    { key: 'leadName', label: 'Lead' },
    { key: 'value', label: 'Value', type: 'number', number: true },
    { key: 'stage', label: 'Stage', type: 'select', options: pipelineStages },
    { key: 'probability', label: 'Probability', type: 'number', number: true },
    { key: 'expectedCloseDate', label: 'Expected Close Date', type: 'date' },
    { key: 'owner', label: 'Owner' },
    { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
    { key: 'source', label: 'Source' },
    { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Won', 'Lost'] },
    { key: 'notes', label: 'Notes', type: 'textarea', large: true },
  ],
  summaryFields: [
    { key: 'customerName', label: 'Customer' },
    { key: 'value', label: 'Value', format: 'money' },
    { key: 'probability', label: 'Probability', format: 'percent' },
    { key: 'expectedCloseDate', label: 'Close Date' },
  ],
}

function SearchableSelect({ label, value, options, placeholder, onSelect, className }) {
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.value === value)
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return options
      .filter((option) => !needle || `${option.label} ${option.description || ''}`.toLowerCase().includes(needle))
      .slice(0, 8)
  }, [options, query])

  return (
    <div className={className}>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">{label}</span>
      <Input
        className="mt-1.5"
        value={query || selected?.label || ''}
        placeholder={placeholder}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setQuery('')}
      />
      <div className="mt-2 max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {visible.length ? visible.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              'w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-sky-50 dark:hover:bg-slate-900',
              option.value === value ? 'bg-sky-50 text-sky-800 dark:bg-slate-900 dark:text-sky-200' : 'text-slate-700 dark:text-slate-200',
            )}
            onClick={() => {
              onSelect(option.raw)
              setQuery('')
            }}
          >
            <span className="block truncate font-semibold">{option.label}</span>
            {option.description ? <span className="block truncate text-xs text-slate-500">{option.description}</span> : null}
          </button>
        )) : (
          <p className="px-3 py-2 text-sm text-slate-500">No matches found</p>
        )}
      </div>
    </div>
  )
}

function PriorityBadgePicker({ value, onChange }) {
  const tone = {
    High: 'border-rose-200 bg-rose-50 text-rose-700',
    Medium: 'border-amber-200 bg-amber-50 text-amber-700',
    Low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
  return (
    <div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Priority</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {priorityOptions.map((priority) => (
          <button
            key={priority}
            type="button"
            className={cn(
              'focus-ring rounded-full border px-3 py-1.5 text-xs font-bold transition',
              tone[priority],
              value === priority ? 'ring-2 ring-sky-200' : 'opacity-75 hover:opacity-100',
            )}
            onClick={() => onChange(priority)}
          >
            {priority}
          </button>
        ))}
      </div>
    </div>
  )
}

function DealModal({ record, onClose, onSave, customers, leads, teamMembers, currency }) {
  const [draft, setDraft] = useState(() => normalizeDeal({ ...config.initial(), currency, ...(record || {}) }))
  const expectedRevenue = Math.round(dealAmount(draft) * (clampPercent(draft.probability) / 100) * 100) / 100
  const customerOptions = useMemo(() => customers.map((customer) => ({
    value: customer.id,
    label: customer.name,
    description: [customer.company, customer.email, customer.phone].filter(Boolean).join(' · '),
    raw: customer,
  })), [customers])
  const leadOptions = useMemo(() => leads.map((lead) => ({
    value: lead.id,
    label: leadDisplayName(lead),
    description: [lead.scoreType, lead.email, lead.phone].filter(Boolean).join(' · '),
    raw: lead,
  })), [leads])
  const teamOptions = useMemo(() => teamMembers.map((member) => ({
    value: member.id,
    label: teamDisplayName(member),
    description: [member.role, member.email].filter(Boolean).join(' · '),
    raw: member,
  })), [teamMembers])

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function selectCustomer(customer = {}) {
    setDraft((current) => ({
      ...current,
      customerId: customer.id || '',
      customerName: customer.name || '',
      customerEmail: customer.email || '',
      customerPhone: customer.phone || '',
      company: customer.company || '',
    }))
  }

  function selectLead(lead = {}) {
    setDraft((current) => ({
      ...current,
      leadId: lead.id || '',
      leadName: leadDisplayName(lead),
      title: current.title || leadDisplayName(lead),
      value: current.value || Number(lead.dealValue || lead.value || 0),
      priority: current.priority || lead.priority || 'Medium',
      source: current.source || lead.source || 'Manual Entry',
    }))
  }

  function selectTeamMember(member = {}) {
    setDraft((current) => ({
      ...current,
      assignedUserId: member.id || '',
      owner: teamDisplayName(member),
    }))
  }

  function setAttachment(key, file) {
    setDraft((current) => ({
      ...current,
      attachments: {
        ...(current.attachments || {}),
        [key]: file ? {
          name: file.name,
          size: file.size,
          type: file.type,
          updatedAt: new Date().toISOString(),
        } : null,
      },
    }))
  }

  function submit(action) {
    const next = normalizeDeal({
      ...draft,
      currency,
      status: action === 'draft' ? 'Draft' : draft.status || 'Open',
      expectedRevenue,
    })
    onSave(next, action)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="mx-auto my-4 w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-slate-950 dark:text-white">{record ? 'Edit Deal' : 'Add Deal'}</p>
                <Badge variant="info">{draft.dealId}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Create a qualified Sales Hub opportunity with forecast, follow-up, owner, source, and documents.</p>
            </div>
            <button type="button" className="focus-ring grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900" onClick={onClose} aria-label="Cancel">
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Deal Title</span>
                  <Input className="mt-1.5" value={draft.title} onChange={(event) => update('title', event.target.value)} />
                </label>
                <SearchableSelect label="Customer" value={draft.customerId} options={customerOptions} placeholder="Search customers..." onSelect={selectCustomer} />
                <SearchableSelect label="Lead" value={draft.leadId} options={leadOptions} placeholder="Search leads..." onSelect={selectLead} />
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Customer Email</span>
                  <Input className="mt-1.5" value={draft.customerEmail} onChange={(event) => update('customerEmail', event.target.value)} />
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Customer Phone</span>
                  <Input className="mt-1.5" value={draft.customerPhone} onChange={(event) => update('customerPhone', event.target.value)} />
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Company</span>
                  <Input className="mt-1.5" value={draft.company} onChange={(event) => update('company', event.target.value)} />
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Deal Value ({currency})</span>
                  <Input className="mt-1.5" type="number" min="0" value={draft.value} onChange={(event) => update('value', Number(event.target.value || 0))} />
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Stage</span>
                  <Select className="mt-1.5" value={draft.stage} onChange={(event) => update('stage', event.target.value)}>
                    {pipelineStages.map((stage) => <option key={stage}>{stage}</option>)}
                  </Select>
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Win Probability</span>
                  <Input className="mt-1.5" type="number" min="0" max="100" value={draft.probability} onChange={(event) => update('probability', clampPercent(event.target.value))} />
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Expected Close Date</span>
                  <Input className="mt-1.5" type="date" value={draft.expectedCloseDate} onChange={(event) => update('expectedCloseDate', event.target.value)} />
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Deal Source</span>
                  <Select className="mt-1.5" value={draft.source} onChange={(event) => update('source', event.target.value)}>
                    {dealSources.map((source) => <option key={source}>{source}</option>)}
                  </Select>
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Status</span>
                  <Select className="mt-1.5" value={draft.status} onChange={(event) => update('status', event.target.value)}>
                    {['Draft', 'Open', 'Won', 'Lost'].map((status) => <option key={status}>{status}</option>)}
                  </Select>
                </label>
                <PriorityBadgePicker value={draft.priority} onChange={(priority) => update('priority', priority)} />
              </div>

              <Card className="border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Follow-Up</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Next Follow-Up Date</span>
                    <Input className="mt-1.5" type="date" value={draft.nextFollowUpDate} onChange={(event) => update('nextFollowUpDate', event.target.value)} />
                  </label>
                  <label>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Reminder Time</span>
                    <Input className="mt-1.5" type="time" value={draft.reminderTime} onChange={(event) => update('reminderTime', event.target.value)} />
                  </label>
                  <SearchableSelect label="Assigned User" value={draft.assignedUserId} options={teamOptions} placeholder="Search team..." onSelect={selectTeamMember} />
                </div>
              </Card>

              <Card className="border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Attachments</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {attachmentTypes.map((item) => (
                    <label key={item.key} className="focus-within:ring-2 focus-within:ring-sky-200 rounded-2xl border border-dashed border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-200">
                        <HiOutlinePaperClip className="h-4 w-4" />
                        {item.label}
                      </span>
                      <input className="mt-2 block w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-slate-700" type="file" onChange={(event) => setAttachment(item.key, event.target.files?.[0] || null)} />
                      {draft.attachments?.[item.key]?.name ? <span className="mt-2 block truncate text-xs font-semibold text-sky-700">{draft.attachments[item.key].name}</span> : null}
                    </label>
                  ))}
                </div>
              </Card>

              <label>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-200">Notes</span>
                <textarea
                  className="focus-ring mt-1.5 min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  value={draft.notes}
                  onChange={(event) => update('notes', event.target.value)}
                />
              </label>
            </div>

            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Revenue Forecast</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{formatCurrency(expectedRevenue, currency)}</p>
                <p className="mt-2 text-sm text-slate-500">Expected Revenue = Deal Value × Win Probability</p>
                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Deal Value</span><strong>{formatCurrency(dealAmount(draft), currency)}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Probability</span><strong>{clampPercent(draft.probability)}%</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Currency</span><strong>{currency}</strong></div>
                </div>
              </Card>
              <Card className="p-4">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Deal Snapshot</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between gap-3"><span>ID</span><strong className="truncate">{draft.dealId}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Source</span><strong>{draft.source}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Owner</span><strong className="truncate">{draft.owner || '-'}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>Priority</span><Badge variant={draft.priority === 'High' ? 'danger' : draft.priority === 'Low' ? 'success' : 'warning'}>{draft.priority}</Badge></div>
                </div>
              </Card>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="subtle" className="rounded-2xl" type="button" onClick={() => submit('draft')}><HiOutlineDocumentText className="h-4 w-4" />Save Draft</Button>
            <Button className="rounded-2xl" type="button" onClick={() => submit('create')}>Create Deal</Button>
            <Button className="rounded-2xl" type="button" onClick={() => submit('createOpen')}><HiOutlineArrowTopRightOnSquare className="h-4 w-4" />Create & Open</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function DealsPage() {
  const { currency } = usePreferences()
  const api = useSalesHubCollection('salesDeals', { normalize: normalizeDeal, validate: (row) => (!row.title ? 'Deal title is required' : '') })
  const customersApi = useCustomers({ limitCount: 100 })
  const leadsApi = useLeadScoring({ limitCount: 100 })
  const teamApi = useTeamMembers()
  const displayCurrency = currency || 'PKR'
  const metrics = useMemo(() => calculateDealMetrics(api.rows), [api.rows])
  const chartRows = useMemo(() => {
    const map = new Map(pipelineStages.map((stage) => [stage, 0]))
    api.rows.forEach((deal) => map.set(deal.stage, (map.get(deal.stage) || 0) + deal.value))
    return Array.from(map.entries()).map(([stage, value]) => ({ stage, value }))
  }, [api.rows])

  return (
    <SalesHubModulePage
      config={config}
      api={api}
      metrics={[
        { label: 'Expected Revenue', value: formatCurrency(metrics.expectedRevenue, displayCurrency), helper: 'Probability weighted' },
        { label: 'Open Value', value: formatCurrency(metrics.openValue, displayCurrency), helper: `${metrics.openDeals} open deals` },
        { label: 'Won Value', value: formatCurrency(metrics.wonValue, displayCurrency), helper: `${metrics.wonDeals} won deals` },
        { label: 'Forecast Revenue', value: formatCurrency(metrics.forecastRevenue, displayCurrency), helper: 'Current forecast' },
      ]}
      chart={
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Deal Value by Stage</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows}>
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(value, displayCurrency)} />
                <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      }
      renderModal={({ record, onClose, onSave }) => (
        <DealModal
          record={record}
          onClose={onClose}
          onSave={onSave}
          customers={customersApi.customers}
          leads={leadsApi.leads}
          teamMembers={teamApi.members}
          currency={displayCurrency}
        />
      )}
    />
  )
}
