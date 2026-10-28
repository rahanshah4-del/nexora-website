import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HiOutlineBell, HiOutlineXMark } from 'react-icons/hi2'
import {
  dismissPushPrompt,
  enablePush,
  isPushDismissed,
  pushConfigured,
  pushPermission,
  pushSupported,
  refreshPushRegistration,
} from '../../../lib/pushClient.js'

function initialState() {
  if (!pushConfigured || !pushSupported()) return 'hidden'
  return pushPermission() === 'default' && !isPushDismissed() ? 'ask' : 'hidden'
}

/**
 * Slim "Turn on alerts" card for signed-in clients. Shown on the dashboard only,
 * never as a browser popup: the permission prompt appears only after the client
 * presses the button. Hidden when alerts are on, blocked, unsupported or dismissed.
 */
export default function PushOptIn() {
  const { pathname } = useLocation()
  const [state, setState] = useState(initialState) // hidden | ask | busy | done | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Already allowed on this device: keep the server's record fresh (tokens rotate). Never prompts.
    if (pushConfigured && pushSupported() && pushPermission() === 'granted') refreshPushRegistration().catch(() => {})
  }, [])

  if (state === 'hidden' || !/^\/app\/dashboard\/?$/.test(pathname)) return null

  const turnOn = async () => {
    setState('busy')
    setMessage('')
    try {
      await enablePush()
      setState('done')
    } catch (error) {
      setMessage(error?.message || 'Could not turn on alerts.')
      setState('error')
    }
  }

  const later = () => {
    dismissPushPrompt()
    setState('hidden')
  }

  if (state === 'done') {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100" role="status">
        <HiOutlineBell className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">Alerts are on for this device. We will only send things that matter: trial reminders and tips for your workspace.</span>
        <button type="button" onClick={() => setState('hidden')} className="shrink-0 rounded-lg p-1 hover:bg-emerald-100 dark:hover:bg-white/10" aria-label="Close">
          <HiOutlineXMark className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 sm:flex-row sm:items-center dark:border-sky-400/20 dark:bg-sky-400/10">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-600 text-white"><HiOutlineBell className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Get alerts on this device</p>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Trial and plan reminders, plus short tips for your workspace. At most one a day. Turn off anytime.</p>
          {state === 'error' ? <p className="mt-1 text-sm font-medium text-rose-600" role="alert">{message}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={turnOn} disabled={state === 'busy'} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
          {state === 'busy' ? 'Turning on…' : 'Turn on alerts'}
        </button>
        <button type="button" onClick={later} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10">Not now</button>
      </div>
    </div>
  )
}
