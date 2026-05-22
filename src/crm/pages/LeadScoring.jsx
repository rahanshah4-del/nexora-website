import { motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader.jsx'
import LeadScoringPanel from '../components/leads/LeadScoringPanel.jsx'
import { useLeadScoring } from '../hooks/useLeadScoring.js'

export default function LeadScoringPage() {
  const { leads, loading, source, error } = useLeadScoring()

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader
        title="AI Lead Scoring"
        subtitle="Seriousness score (0–100), hot/warm/cold badges, and explanations."
      />
      <LeadScoringPanel leads={leads} loading={loading} source={source} error={error} />
    </motion.div>
  )
}

