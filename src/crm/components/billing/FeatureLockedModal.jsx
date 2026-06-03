import { useLocation, useNavigate } from 'react-router-dom'
import { HiOutlineLockClosed } from 'react-icons/hi2'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'

export default function FeatureLockedModal({
  title = 'Paid Package Feature',
  message = 'This feature is available in Standard or Enterprise packages.',
}) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="grid min-h-[62vh] place-items-center px-3 py-8">
      <Card className="crm-modal-panel max-w-xl rounded-3xl p-5 text-center sm:p-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-950 text-white shadow-sm">
          <HiOutlineLockClosed className="h-7 w-7" />
        </div>
        <Badge variant="warning" className="mt-5">
          Standard Package
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button className="rounded-2xl" type="button" onClick={() => navigate('/upgrade-business')}>
            Upgrade
          </Button>
          <Button
            variant="subtle"
            className="rounded-2xl"
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
        </div>
      </Card>
    </div>
  )
}
