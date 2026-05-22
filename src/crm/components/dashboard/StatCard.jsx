import { motion } from 'framer-motion'
import Card from '../ui/Card.jsx'
import { cn } from '../../utils/cn.js'

export default function StatCard({ icon: Icon, label, value, delta, tone = 'indigo' }) {
  const toneMap = {
    indigo: 'from-indigo-500/20 via-fuchsia-500/10 to-sky-500/10',
    emerald: 'from-emerald-500/20 via-sky-500/10 to-indigo-500/10',
    amber: 'from-amber-500/20 via-fuchsia-500/10 to-indigo-500/10',
    sky: 'from-sky-500/20 via-indigo-500/10 to-fuchsia-500/10',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
          </div>
          <div
            className={cn(
              'grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-gradient-to-br backdrop-blur-xl dark:border-white/10',
              toneMap[tone],
            )}
          >
            <Icon className="text-xl text-slate-900/85 dark:text-white" />
          </div>
        </div>
        {delta ? (
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{delta}</span> vs last month
          </p>
        ) : null}
      </Card>
    </motion.div>
  )
}

