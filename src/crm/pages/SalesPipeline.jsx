import { motion } from 'framer-motion'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import KanbanBoard from '../components/pipeline/KanbanBoard.jsx'
import { usePipelineDeals } from '../hooks/usePipelineDeals.js'
import EmptyState from '../components/system/EmptyState.jsx'
import Button from '../components/ui/Button.jsx'
import { useMemo, useState } from 'react'
import DealModal from '../components/pipeline/DealModal.jsx'
import Toast from '../components/ui/Toast.jsx'
import PageSearch from '../components/ui/PageSearch.jsx'
import Select from '../components/ui/Select.jsx'
import { calculatePipelineMetrics } from '../lib/salesCalculations.js'
import { formatCurrency } from '../utils/format.js'
import { pipelineStages } from '../data/pipelineStages.js'

const COLORS = ['#6366f1', '#a855f7', '#3b82f6', '#22c55e', '#f59e0b']

function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-slate-900 dark:text-white">{d.stage}</p>
      <p className="text-slate-600 dark:text-slate-300">
        Opportunities: <span className="font-semibold">{d.value}</span>
      </p>
    </div>
  )
}

export default function PipelinePage() {
  const pipelineApi = usePipelineDeals()
  const { deals, source, loading, error, moveDeal, saveDeal, deleteDeal } = pipelineApi
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')

  const filteredDeals = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return deals.filter((deal) => {
      const matchesSearch = !needle || [deal.title, deal.customerName, deal.leadName, deal.owner, deal.priority, deal.notes].join(' ').toLowerCase().includes(needle)
      const matchesStage = stageFilter === 'all' || deal.stage === stageFilter
      return matchesSearch && matchesStage
    })
  }, [deals, query, stageFilter])

  const metrics = useMemo(() => calculatePipelineMetrics(deals), [deals])

  const breakdown = useMemo(() => {
    const map = new Map()
    for (const d of filteredDeals) {
      const s = d.stage || 'Unknown'
      map.set(s, (map.get(s) || 0) + 1)
    }
    return Array.from(map.entries()).map(([stage, value]) => ({ stage, value }))
  }, [filteredDeals])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Sales Pipeline"
        subtitle="Monitor opportunity flow across stages."
        right={
          <Button className="rounded-2xl" type="button" onClick={() => setCreateOpen(true)}>
            Add Deal
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Pipeline Value', formatCurrency(metrics.pipelineValue, 'PKR')],
          ['Weighted Pipeline', formatCurrency(metrics.weightedPipeline, 'PKR')],
          ['Won Value', formatCurrency(metrics.wonValue, 'PKR')],
          ['Lost Value', formatCurrency(metrics.lostValue, 'PKR')],
          ['Average Deal', formatCurrency(metrics.averageDealValue, 'PKR')],
          ['Conversion Rate', `${metrics.conversionRate}%`],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-2 truncate text-xl font-semibold text-slate-950 dark:text-white">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Pipeline Breakdown</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Distribution by stage</p>
            </div>
            <Badge variant={source === 'firestore' ? 'success' : 'default'}>{loading ? 'Loading…' : source === 'firestore' ? 'Live Sync' : 'No data yet'}</Badge>
          </div>

          <div className="mt-4 h-72">
            {breakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="stage" innerRadius={60} outerRadius={100} paddingAngle={3}>
                    {breakdown.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No pipeline data" description="Add deals to see pipeline breakdown." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Stage Summary</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Counts per stage</p>
          <div className="mt-4 space-y-3">
            {breakdown.map((p, idx) => (
              <div key={p.stage} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.stage}</span>
                </div>
                <Badge variant="default">{p.value}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Kanban Board</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Drag & drop deals across stages. {source === 'firestore' ? 'Live Sync enabled.' : 'No data yet.'}
              </p>
            </div>
            <Badge variant={source === 'firestore' ? 'success' : 'default'}>
              {loading ? 'Loading…' : source === 'firestore' ? 'Live Sync' : 'No data yet'}
            </Badge>
          </div>

          <div className="mt-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <PageSearch
                value={query}
                onChange={setQuery}
                placeholder="Search deals by title, customer, owner, priority..."
                resultCount={filteredDeals.length}
                totalCount={deals.length}
                className="lg:w-96"
              />
              <Select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="lg:w-56">
                <option value="all">All stages</option>
                {pipelineStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </Select>
            </div>
            {error ? (
              <div className="mb-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-200">
                {error}
              </div>
            ) : null}
            {loading ? (
              <div className="grid min-h-[12rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading deals…
              </div>
            ) : filteredDeals.length ? (
              <KanbanBoard deals={filteredDeals} onMove={moveDeal} onSave={saveDeal} onDelete={deleteDeal} />
            ) : (
              <EmptyState title="No deals yet" description="Add a deal to start using the pipeline board." />
            )}
          </div>
        </Card>
      </div>

      <DealModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          const res = await pipelineApi.createDeal(payload)
          if (res?.ok) {
            setToast({ tone: 'success', message: 'Deal created successfully' })
            window.setTimeout(() => setToast(null), 1600)
            setCreateOpen(false)
          } else {
            setToast({ tone: 'error', message: res?.error || 'Failed to create deal' })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
    </motion.div>
  )
}
