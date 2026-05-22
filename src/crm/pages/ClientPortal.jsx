import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import ClientDashboard from '../components/clientPortal/ClientDashboard.jsx'
import ClientInvoices from '../components/clientPortal/ClientInvoices.jsx'
import ClientPayments from '../components/clientPortal/ClientPayments.jsx'
import ProjectStatus from '../components/clientPortal/ProjectStatus.jsx'
import ClientSubscriptionCard from '../components/clientPortal/ClientSubscriptionCard.jsx'
import { useClientPortal } from '../hooks/useClientPortal.js'

export default function ClientPortalPage() {
  const portal = useClientPortal()

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="Client Portal"
        subtitle="Client-side view for invoices, payments, subscription status, and support shortcuts."
        right={
          <Badge variant={portal.source === 'firestore' ? 'success' : 'default'}>
            {portal.loading ? 'Loading…' : portal.source === 'firestore' ? 'Live' : 'Demo'}
          </Badge>
        }
      />

      {portal.error ? (
        <div className="mb-4">
          <Badge variant="danger">Error: {portal.error}</Badge>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <ClientDashboard
            subscription={portal.subscription}
            invoicesCount={portal.invoices.length}
            paymentsCount={portal.payments.length}
            activity={portal.activity}
          />
          <ClientInvoices invoices={portal.invoices} />
          <ClientPayments payments={portal.payments} />
        </div>
        <div className="space-y-4 min-w-0">
          <ClientSubscriptionCard subscription={portal.subscription} />
          <ProjectStatus project={portal.project} />
        </div>
      </div>
    </motion.div>
  )
}

