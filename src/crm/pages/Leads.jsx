import { motion } from 'framer-motion'
import { HiOutlineFunnel, HiOutlinePlus } from 'react-icons/hi2'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import LeadScoringPanel from '../components/leads/LeadScoringPanel.jsx'
import { useLeadScoring } from '../hooks/useLeadScoring.js'
import LeadModal from '../components/leads/LeadModal.jsx'
import { useState } from 'react'
import Toast from '../components/ui/Toast.jsx'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useUser } from '../hooks/useUser.js'

export default function LeadsPage() {
  const scoring = useLeadScoring()
  const { userId } = useUser()
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const columns = [
    { key: 'id', header: 'Lead ID' },
    { key: 'name', header: 'Lead', cell: (r) => <span className="font-semibold">{r.name}</span> },
    { key: 'source', header: 'Source', cell: (r) => <Badge variant="default">{r.source || '—'}</Badge> },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant="purple">{r.status || r.stage || '—'}</Badge> },
    {
      key: 'score',
      header: 'AI Score',
      cell: (r) => (
        <span className={r.score >= 85 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold'}>
          {r.score}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Auto Priority',
      cell: (r) => <Badge variant={r.priority === 'High' ? 'danger' : r.priority === 'Medium' ? 'warning' : 'default'}>{r.priority}</Badge>,
    },
    {
      key: 'prediction',
      header: 'Prediction',
      cell: (r) => <Badge variant={r.score >= 85 ? 'success' : 'info'}>{r.prediction}</Badge>,
    },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Leads"
        subtitle="Track lead sources, qualification score, and pipeline movement."
        right={
          <>
            <Button variant="subtle" className="rounded-2xl">
              <HiOutlineFunnel className="text-lg" /> Filters
            </Button>
            <Button className="rounded-2xl" type="button" onClick={() => setCreateOpen(true)}>
              <HiOutlinePlus className="text-lg" /> Add Lead
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <LeadScoringPanel leads={scoring.leads.slice(0, 4)} loading={scoring.loading} source={scoring.source} error={scoring.error} />
      </div>

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Search leads..." />
          <Input placeholder="Filter by stage (e.g. Qualified)" />
        </div>
        <div className="mt-4">
          <Table columns={columns} rows={scoring.leads} />
        </div>
      </Card>

      <LeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          if (!userId) {
            setToast({ tone: 'error', message: 'Please login first' })
            window.setTimeout(() => setToast(null), 2400)
            return
          }
          if (!db) {
            setToast({ tone: 'error', message: 'Firestore is not configured' })
            window.setTimeout(() => setToast(null), 2400)
            return
          }

          const name = String(payload.name || '').trim()
          const email = String(payload.email || '').trim()
          if (!name || !email) {
            setToast({ tone: 'error', message: 'Name and email are required' })
            window.setTimeout(() => setToast(null), 2400)
            return
          }

          try {
            await addDoc(collection(db, 'leads'), {
              name,
              email,
              phone: payload.phone || '',
              company: payload.company || '',
              dealValue: Number(payload.dealValue || 0),
              status: payload.status || 'New',
              priority: payload.priority || 'Medium',
              source: payload.source || 'Website',
              userId,
              // Optional signals used by AI scoring (safe defaults)
              replySpeed: 50,
              meetings: 0,
              paymentHistory: 0,
              activityFrequency: 50,
              lastContactDate: new Date().toISOString().slice(0, 10),
              createdAt: serverTimestamp(),
            })
            setToast({ tone: 'success', message: 'Lead created successfully' })
            window.setTimeout(() => setToast(null), 1600)
            setCreateOpen(false)
          } catch (e) {
            setToast({ tone: 'error', message: e?.message || 'Failed to create lead' })
            window.setTimeout(() => setToast(null), 2400)
          }
        }}
      />
    </motion.div>
  )
}
