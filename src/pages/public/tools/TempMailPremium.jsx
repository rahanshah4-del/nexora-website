import { useEffect, useRef, useState } from 'react'
import {
  HiOutlineArrowRightOnRectangle, HiOutlineCheck, HiOutlineClock, HiOutlineEnvelope, HiOutlinePaperClip, HiOutlineSparkles,
  HiOutlineTrash, HiOutlineXMark, HiOutlineArrowUturnRight, HiOutlineSquares2X2,
} from 'react-icons/hi2'
import {
  clientSignInMessage, signInWithEmail, signInWithGoogle, signOutClient, signUpWithEmail, validateCredentials,
} from '../../../lib/geolintClient.js'
import {
  deleteOwnedAddress, premiumCheckoutUrl, premiumErrorMessage, premiumPortalUrl, startForwarding, stopForwarding,
  verifyForwarding, yearlySavingPercent,
} from './tempMailPremiumClient.js'
import { formatDate, splitLongTime } from './tempMailClient.js'

const FEATURES = [
  [HiOutlineClock, 'Inbox that lasts', 'Your address stays alive as long as your plan is paid, not just an hour.'],
  [HiOutlineSquares2X2, 'Up to 10 addresses', 'Pick your own names and keep several inboxes at the same time.'],
  [HiOutlinePaperClip, 'Attachments up to 5 MB', 'Receive and download files, with no ads and no captcha.'],
  [HiOutlineArrowUturnRight, 'Email forwarding', 'Send mail from a temp address to your real inbox automatically.'],
]

function Features() {
  return (
    <ul className="tm-feats">
      {FEATURES.map(([Icon, title, text]) => (
        <li key={title}><Icon className="tm-icon" /><span><b>{title}</b><small>{text}</small></span></li>
      ))}
    </ul>
  )
}

/** The small card under the address for visitors who are not Premium yet. */
export function PremiumPromo({ config, prem, onOpen }) {
  const plan = config?.premium
  if (!plan?.enabled || prem.active) return null
  return (
    <div className="tm-promo">
      <span className="tm-promo-ic"><HiOutlineSparkles className="tm-icon" /></span>
      <div className="min-w-0 flex-1">
        <b>Temp Mail Premium · from ${plan.monthlyPrice}/month</b>
        <small>Long-lasting inbox, your own names, attachments, no ads, forwarding.</small>
      </div>
      <button type="button" className="tm-btn tm-btn-primary" onClick={onOpen}>{prem.waiting ? 'Activating…' : 'See plans'}</button>
    </div>
  )
}

function AuthForm({ onDone }) {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const run = async (task) => {
    setBusy(true)
    setMessage('')
    try { await task(); onDone() } catch (e) { setMessage(clientSignInMessage(e)) } finally { setBusy(false) }
  }
  const submit = (event) => {
    event.preventDefault()
    const found = validateCredentials(form, mode)
    setErrors(found)
    if (Object.keys(found).length) return
    run(() => (mode === 'signup' ? signUpWithEmail(form) : signInWithEmail(form)))
  }

  return (
    <form className="tm-auth" onSubmit={submit} noValidate>
      <p className="tm-hint" style={{ marginTop: 0 }}>Sign in so your plan follows you on every device. This is the same Nexora account used by GeoLint.</p>
      <button type="button" className="tm-btn tm-btn-block" disabled={busy} onClick={() => run(signInWithGoogle)}>Continue with Google</button>
      <p className="tm-or"><span>or use email</span></p>
      {mode === 'signup' ? (
        <label className="tm-lbl">Name<input className="tm-input" value={form.name} onChange={set('name')} autoComplete="name" />{errors.name ? <em>{errors.name}</em> : null}</label>
      ) : null}
      <label className="tm-lbl">Email<input className="tm-input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />{errors.email ? <em>{errors.email}</em> : null}</label>
      <label className="tm-lbl">Password<input className="tm-input" type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />{errors.password ? <em>{errors.password}</em> : null}</label>
      {mode === 'signup' ? (
        <label className="tm-lbl">Repeat password<input className="tm-input" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />{errors.confirm ? <em>{errors.confirm}</em> : null}</label>
      ) : null}
      {message ? <p role="alert" className="tm-error">{message}</p> : null}
      <button type="submit" className="tm-btn tm-btn-primary tm-btn-block" disabled={busy}>{mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      <button type="button" className="tm-link" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setErrors({}); setMessage('') }}>
        {mode === 'signup' ? 'I already have an account' : 'Create a new account'}
      </button>
    </form>
  )
}

function PlanPicker({ plan, prem }) {
  const [cycle, setCycle] = useState('yearly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = yearlySavingPercent(plan.monthlyPrice, plan.yearlyPrice)

  const checkout = async () => {
    setBusy(true)
    setError('')
    try {
      window.location.assign(await premiumCheckoutUrl(cycle))
    } catch (e) {
      if (e.code === 'already_premium') prem.reload()
      setError(premiumErrorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="tm-cycle" role="radiogroup" aria-label="Billing period">
        <button type="button" role="radio" aria-checked={cycle === 'monthly'} className={cycle === 'monthly' ? 'is-on' : ''} onClick={() => setCycle('monthly')}>Monthly</button>
        <button type="button" role="radio" aria-checked={cycle === 'yearly'} className={cycle === 'yearly' ? 'is-on' : ''} onClick={() => setCycle('yearly')}>
          Yearly{saving ? <span className="tm-save">Save {saving}%</span> : null}
        </button>
      </div>
      <p className="tm-price"><b>${cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}</b><span>/{cycle === 'yearly' ? 'year' : 'month'}</span></p>
      {cycle === 'yearly' ? <p className="tm-hint" style={{ marginTop: 0 }}>That is about ${(Number(plan.yearlyPrice) / 12).toFixed(2)} a month.</p> : null}
      <Features />
      {error ? <p role="alert" className="tm-error">{error}</p> : null}
      <button type="button" className="tm-btn tm-btn-primary tm-btn-block" onClick={checkout} disabled={busy}>{busy ? 'Opening checkout…' : 'Get Premium'}</button>
      <p className="tm-hint">Secure checkout by Polar. Cancel any time from your account; your address keeps working until the paid period ends.</p>
    </div>
  )
}

function ManageBilling({ prem }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const open = async () => {
    setBusy(true)
    setError('')
    try { window.location.assign(await premiumPortalUrl()) } catch (e) { setError(premiumErrorMessage(e)); setBusy(false) }
  }
  const until = prem.me?.premium?.expiresAt
  return (
    <div>
      <p className="tm-ok"><HiOutlineCheck className="tm-icon" /> You have Premium{prem.me?.premium?.cycle ? ` (${prem.me.premium.cycle})` : ''}.</p>
      {until ? <p className="tm-hint">Current period ends {formatDate(until)}.</p> : null}
      <Features />
      {error ? <p role="alert" className="tm-error">{error}</p> : null}
      {prem.me?.premium?.source === 'polar' || !prem.me?.premium?.source ? (
        <button type="button" className="tm-btn tm-btn-block" onClick={open} disabled={busy}>{busy ? 'Opening…' : 'Manage billing or cancel'}</button>
      ) : null}
    </div>
  )
}

/** Modal: sign in -> pick a plan -> checkout (or manage billing for an active plan). */
export function PremiumDialog({ config, prem, onClose }) {
  const plan = config?.premium
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  if (!plan?.enabled) return null
  let body
  if (prem.user === undefined) body = <p className="tm-hint">Checking your account…</p>
  else if (!prem.signedIn) body = <AuthForm onDone={() => {}} />
  else if (prem.active) body = <ManageBilling prem={prem} />
  else body = <PlanPicker plan={plan} prem={prem} />

  return (
    <div className="tm-modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="tm-modal" role="dialog" aria-modal="true" aria-labelledby="tm-prem-title" tabIndex={-1} ref={ref}>
        <button type="button" className="tm-btn tm-btn-ghost tm-modal-x" onClick={onClose} aria-label="Close"><HiOutlineXMark className="tm-icon" /></button>
        <p className="tm-eyebrow"><HiOutlineSparkles className="tm-icon" style={{ verticalAlign: '-3px' }} /> Nexora Temp Mail</p>
        <h2 id="tm-prem-title">Premium</h2>
        {body}
        {prem.signedIn ? (
          <p className="tm-signed">Signed in as {prem.user.email}{' '}
            <button type="button" className="tm-link" onClick={() => signOutClient().catch(() => {})}><HiOutlineArrowRightOnRectangle className="tm-icon" style={{ verticalAlign: '-3px' }} /> Sign out</button>
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ForwardingEditor({ row, say, onChanged }) {
  const [to, setTo] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await startForwarding(row.address, to.trim())
      setPending(true)
      say('Code sent. Check that inbox.')
    } catch (e) { setError(premiumErrorMessage(e)) } finally { setBusy(false) }
  }
  const verify = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await verifyForwarding(row.address, code)
      setPending(false); setCode(''); setTo('')
      say('Forwarding is on')
      onChanged()
    } catch (e) { setError(premiumErrorMessage(e)) } finally { setBusy(false) }
  }
  const stop = async () => {
    setBusy(true)
    try { await stopForwarding(row.address); say('Forwarding stopped'); onChanged() } catch (e) { setError(premiumErrorMessage(e)) } finally { setBusy(false) }
  }

  if (row.forwardTo && !pending) {
    return (
      <div className="tm-fw">
        <p><HiOutlineEnvelope className="tm-icon" /> Forwarding to <b>{row.forwardTo}</b></p>
        <button type="button" className="tm-btn tm-btn-ghost" onClick={stop} disabled={busy}>Stop forwarding</button>
        {error ? <p role="alert" className="tm-error">{error}</p> : null}
      </div>
    )
  }
  return (
    <div className="tm-fw">
      {pending ? (
        <form className="tm-field" onSubmit={verify}>
          <input className="tm-input grow" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Forwarding code" />
          <button type="submit" className="tm-btn tm-btn-primary" disabled={busy || code.trim().length < 6}>Verify</button>
          <button type="button" className="tm-btn tm-btn-ghost" onClick={() => { setPending(false); setCode('') }}>Cancel</button>
        </form>
      ) : (
        <form className="tm-field" onSubmit={send}>
          <input className="tm-input grow" type="email" placeholder="Forward to your real email" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Forward to" autoComplete="email" />
          <button type="submit" className="tm-btn" disabled={busy || !to.trim()}>Send code</button>
        </form>
      )}
      {error ? <p role="alert" className="tm-error">{error}</p> : null}
      <p className="tm-hint">Forwarded copies are plain text without attachments. We email a code to the address first, so nobody can forward mail to an inbox that is not theirs.</p>
    </div>
  )
}

/** Premium owner's list of addresses: switch to one, add forwarding, delete. */
export function MyAddresses({ prem, current, forwardingReady, onSwitch, onNew, busy, say }) {
  const [openRow, setOpenRow] = useState('')
  const [confirm, setConfirm] = useState('')
  const [now] = useState(() => Date.now())
  const rows = prem.me?.addresses || []
  const max = prem.me?.limits?.maxAddresses || 10

  const remove = async (address) => {
    try {
      await deleteOwnedAddress(address)
      setConfirm('')
      say('Address deleted')
      prem.reload()
    } catch (e) { say(premiumErrorMessage(e)) }
  }

  return (
    <section className="tm-card tm-mine" aria-label="My Premium addresses">
      <div className="tm-inbox-head">
        <div className="tm-inbox-title"><HiOutlineSparkles className="tm-icon" /> My addresses <span className="tm-count">{rows.length}/{max}</span></div>
        <button type="button" className="tm-btn tm-btn-primary" onClick={onNew} disabled={busy || rows.length >= max}>New Premium address</button>
      </div>
      {rows.length === 0 ? <p className="tm-hint" style={{ padding: '0 1rem 1rem' }}>Addresses you create while signed in with Premium are kept here.</p> : (
        <ul className="tm-mine-list">
          {rows.map((row) => {
            const left = splitLongTime((new Date(row.expiresAt).getTime() - now) / 1000)
            return (
              <li key={row.address} className={row.address === current ? 'is-current' : ''}>
                <div className="tm-mine-row">
                  <button type="button" className="tm-mine-addr" onClick={() => onSwitch(row)} title="Open this inbox">
                    <b>{row.address}</b>
                    <small>{left.days} days left{row.forwardTo ? ' · forwarding on' : ''}</small>
                  </button>
                  <button type="button" className="tm-btn tm-btn-ghost" onClick={() => setOpenRow(openRow === row.address ? '' : row.address)} aria-expanded={openRow === row.address}>Forwarding</button>
                  {confirm === row.address ? (
                    <span className="flex gap-1"><button type="button" className="tm-btn tm-btn-danger" onClick={() => remove(row.address)}>Delete for good</button><button type="button" className="tm-btn tm-btn-ghost" onClick={() => setConfirm('')}>Keep</button></span>
                  ) : (
                    <button type="button" className="tm-btn tm-btn-ghost tm-btn-danger" onClick={() => setConfirm(row.address)} aria-label={`Delete ${row.address}`}><HiOutlineTrash className="tm-icon" /></button>
                  )}
                </div>
                {openRow === row.address ? (
                  forwardingReady
                    ? <ForwardingEditor row={row} say={say} onChanged={prem.reload} />
                    : <p className="tm-hint">Forwarding is not switched on yet. Please check back soon.</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
