import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { moduleCatalog } from '../data/moduleAccess.js'

function titleFromSlug(slug = '') {
  return String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function ModulePlaceholderPage() {
  const { module = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const current = useMemo(
    () => moduleCatalog.find((item) => item.route === `/app/coming-soon/${module}`),
    [module],
  )
  const label = current?.label || titleFromSlug(module) || 'Module'

  return (
    <div>
      <PageHeader
        title={label}
        subtitle="Developer preview route for a planned workspace module."
        right={<Badge variant="info">Planned</Badge>}
      />
      <Card className="p-6">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{label}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          This module route is available for developer/owner access. The production feature can be connected here when implementation is ready.
        </p>
        <Button
          className="mt-5 rounded-2xl"
          variant="subtle"
          type="button"
          onClick={() => {
            console.log('[Back To Workspace] clicked', {
              target: '/workspace',
              currentPath: location.pathname,
            })
            navigate('/workspace', { replace: false })
          }}
        >
          Back to Workspace
        </Button>
      </Card>
    </div>
  )
}
