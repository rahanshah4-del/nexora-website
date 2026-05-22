import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import AIInsightCards from '../components/ai/AIInsightCards.jsx'
import AIAssistantChat from '../components/ai/AIAssistantChat.jsx'
import AIMessageGenerator from '../components/ai/AIMessageGenerator.jsx'
import { useLeadScoring } from '../hooks/useLeadScoring.js'
import { useFollowUps } from '../hooks/useFollowUps.js'
import { usePipelineDeals } from '../hooks/usePipelineDeals.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useAIInsights } from '../hooks/useAIInsights.js'
import { useMemo } from 'react'
import { useCustomers } from '../hooks/useCustomers.js'

export default function AIAssistantPage() {
  const leadApi = useLeadScoring()
  const tasksApi = useFollowUps()
  const pipelineApi = usePipelineDeals()
  const invoicesApi = useInvoices()
  const customersApi = useCustomers()

  const customers = customersApi.customers
  const { insights, followUp, followUpLoading } = useAIInsights({
    leads: leadApi.leads,
    deals: pipelineApi.deals,
    invoices: invoicesApi.invoices,
    tasks: tasksApi.tasks,
    customers,
  })

  const assistantData = useMemo(
    () => ({
      leads: leadApi.leads,
      tasks: tasksApi.tasks,
      invoices: invoicesApi.invoices,
      deals: pipelineApi.deals,
      customers,
    }),
    [leadApi.leads, tasksApi.tasks, invoicesApi.invoices, pipelineApi.deals, customers],
  )

  const loadingAny = leadApi.loading || tasksApi.loading || pipelineApi.loading || invoicesApi.loading || customersApi.loading

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="AI Assistant"
        subtitle="AI productivity layer for leads, follow-ups, invoices, and pipeline insights (mock-first)."
        right={
          <Badge variant={loadingAny ? 'info' : 'purple'}>
            {loadingAny ? 'Loading…' : 'Ready'}
          </Badge>
        }
      />

      <AIInsightCards insights={insights} />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <AIAssistantChat data={assistantData} />
          <AIMessageGenerator leads={leadApi.leads} customers={customers} />
        </div>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">AI Follow-up Suggestion</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Best time + message for the most overdue task</p>
            </div>
            <Badge variant="purple">AI</Badge>
          </div>

          <div className="mt-4">
            {followUpLoading ? (
              <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
                Generating…
              </div>
            ) : followUp ? (
              <div className="space-y-3">
                <div className="glass-muted rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Customer</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{followUp.task.customerName}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {followUp.task.type} • Due {followUp.task.dueDate} {followUp.task.dueTime || ''}
                  </p>
                </div>
                <div className="glass-muted rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Best follow-up time</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{followUp.bestTime}</p>
                </div>
                <div className="glass-muted rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Suggested message</p>
                  <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">{followUp.message}</pre>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl px-3 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
                No overdue follow-ups found.
              </div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
