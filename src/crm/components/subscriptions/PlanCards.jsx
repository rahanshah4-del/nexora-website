import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import { useNavigate } from 'react-router-dom'

function badgeVariant(name) {
  if (name === 'Business') return 'purple'
  if (name === 'Starter') return 'info'
  if (name === 'Enterprise') return 'warning'
  return 'default'
}

export default function PlanCards({ plans, currentPlan }) {
  const navigate = useNavigate()

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((p) => (
        <Card key={p.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{p.description}</p>
            </div>
            <Badge variant={badgeVariant(p.name)}>{p.badge}</Badge>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Starting at</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {p.priceLabel || (p.monthlyPkr === 0 ? 'Free' : `PKR ${p.monthlyPkr}/month`)}
            </p>
          </div>

          <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {p.features.slice(0, 5).map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-glow" />
                <span className="truncate">{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex gap-2">
            {currentPlan === p.id ? (
              <Button variant="subtle" className="w-full rounded-2xl" type="button" disabled>
                Current Plan
              </Button>
            ) : p.contactSales ? (
              <Button className="w-full rounded-2xl" type="button" onClick={() => navigate('/upgrade-business')}>
                Contact Sales
              </Button>
            ) : (
              <Button className="w-full rounded-2xl" type="button" onClick={() => navigate('/upgrade-business')}>
                Request Upgrade
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
