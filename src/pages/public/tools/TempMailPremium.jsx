import { useEffect, useRef, useState } from 'react'
import {
  HiOutlineArrowRightOnRectangle, HiOutlineCheck, HiOutlineClipboardDocument, HiOutlineClock, HiOutlineEnvelope, HiOutlinePaperClip, HiOutlineSparkles,
  HiOutlineXMark, HiOutlineCog6Tooth, HiOutlineArrowUturnRight, HiOutlineSquares2X2, HiOutlineEye, HiOutlineEyeSlash, HiOutlineLockClosed,
} from 'react-icons/hi2'
import logoUrl from '../../../assets/logo/nexora-logo-160.png'
import {
  clientSignInMessage, sendResetEmail, signInWithEmail, signInWithGoogle, signOutClient, signUpWithEmail, validateCredentials,
} from '../../../lib/geolintClient.js'
import {
  daysLeftLabel, premiumCheckoutUrl, premiumErrorMessage, premiumPortalUrl, startForwarding, stopForwarding,
  verifyForwarding, yearlySavingPercent,
} from './tempMailPremiumClient.js'
import { formatDate, lockScroll, splitLongTime } from './tempMailClient.js'

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

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

function PasswordField({ label, value, onChange, autoComplete, error, id, onKeyUp }) {
  const [show, setShow] = useState(false)
  return (
    <label className="tm-lbl" htmlFor={id}>{label}
      <span className="tm-pass">
        <input id={id} className={`tm-input ${error ? 'is-invalid' : ''}`} type={show ? 'text' : 'password'} value={value} onChange={onChange} onKeyUp={onKeyUp} autoComplete={autoComplete} autoCapitalize="none" spellCheck="false" aria-invalid={Boolean(error)} />
        <button type="button" className="tm-pass-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
          {show ? <HiOutlineEyeSlash className="tm-icon" /> : <HiOutlineEye className="tm-icon" />}
        </button>
      </span>
      {error ? <em>{error}</em> : null}
    </label>
  )
}

function AuthForm({ mode, setMode }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [caps, setCaps] = useState(false)
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const run = async (task) => {
    setBusy(true)
    setMessage('')
    setInfo('')
    try { await task() } catch (e) {
      // closing the Google window is not an error worth showing
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return
      setMessage(clientSignInMessage(e))
    } finally { setBusy(false) }
  }
  const submit = (event) => {
    event.preventDefault()
    const found = validateCredentials(form, mode)
    setErrors(found)
    if (Object.keys(found).length) return
    run(() => (mode === 'signup' ? signUpWithEmail(form) : signInWithEmail(form)))
  }
  const forgot = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { setErrors({ email: 'Type your email above first, then press "Forgot password".' }); return }
    setErrors({})
    run(async () => { await sendResetEmail(form.email); setInfo('Done. If that email has an account, a reset link is on its way. Check spam too.') })
  }
  const switchMode = () => { setMode(mode === 'signup' ? 'signin' : 'signup'); setErrors({}); setMessage(''); setInfo('') }
  const capsCheck = (event) => setCaps(Boolean(event.getModifierState && event.getModifierState('CapsLock')))

  return (
    <form className="tm-auth" onSubmit={submit} noValidate>
      <button type="button" className="tm-btn tm-btn-block tm-google" disabled={busy} onClick={() => run(signInWithGoogle)}><GoogleG /> Continue with Google</button>
      <p className="tm-or"><span>or use email</span></p>
      {mode === 'signup' ? (
        <label className="tm-lbl" htmlFor="tm-auth-name">Name<input id="tm-auth-name" className={`tm-input ${errors.name ? 'is-invalid' : ''}`} value={form.name} onChange={set('name')} autoComplete="name" autoFocus aria-invalid={Boolean(errors.name)} />{errors.name ? <em>{errors.name}</em> : null}</label>
      ) : null}
      <label className="tm-lbl" htmlFor="tm-auth-email">Email<input id="tm-auth-email" className={`tm-input ${errors.email ? 'is-invalid' : ''}`} type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" autoCapitalize="none" spellCheck="false" autoFocus={mode !== 'signup'} aria-invalid={Boolean(errors.email)} />{errors.email ? <em>{errors.email}</em> : null}</label>
      <PasswordField id="tm-auth-pass" label="Password" value={form.password} onChange={set('password')} onKeyUp={capsCheck} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} error={errors.password} />
      {caps ? <p className="tm-caps" role="status">Caps Lock is on.</p> : null}
      {mode === 'signup' ? (
        <PasswordField id="tm-auth-confirm" label="Repeat password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" error={errors.confirm} />
      ) : null}
      {message ? <p role="alert" className="tm-error">{message}</p> : null}
      {info ? <p role="status" className="tm-info">{info}</p> : null}
      <button type="submit" className="tm-btn tm-btn-primary tm-btn-block" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      {mode === 'signin' ? <button type="button" className="tm-link tm-forgot" onClick={forgot} disabled={busy}>Forgot password?</button> : null}
      <p className="tm-switch">{mode === 'signup' ? 'Already have an account?' : 'New to Nexora?'} <button type="button" className="tm-link" onClick={switchMode}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>
      <p className="tm-legal"><HiOutlineLockClosed className="tm-icon" /> Same Nexora account as GeoLint. Your plan follows you on every device.</p>
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

export function ManageBilling({ prem }) {
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
  const [mode, setMode] = useState('signin')

  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }) // newest handler, without re-running the effect below every second

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') closeRef.current() }
    const unlock = lockScroll()
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => { unlock(); document.removeEventListener('keydown', onKey) }
  }, [])

  if (!plan?.enabled) return null
  const signedOut = prem.user !== undefined && !prem.signedIn
  let body
  if (prem.user === undefined) body = <p className="tm-hint">Checking your account…</p>
  else if (!prem.signedIn) body = <AuthForm mode={mode} setMode={setMode} />
  else if (prem.active) body = <ManageBilling prem={prem} />
  else body = <PlanPicker plan={plan} prem={prem} />

  return (
    <div className="tm-modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="tm-modal" role="dialog" aria-modal="true" aria-labelledby="tm-prem-title" tabIndex={-1} ref={ref}>
        <button type="button" className="tm-btn tm-btn-ghost tm-modal-x" onClick={onClose} aria-label="Close"><HiOutlineXMark className="tm-icon" /></button>
        <div className="tm-brandbar">
          <img className="tm-brand-logo" src={logoUrl} alt="" width="44" height="44" decoding="async" />
          <div>
            <p className="tm-eyebrow">Nexora Temp Mail</p>
            <p className="tm-brand-sub">👑 Premium</p>
          </div>
        </div>
        <h2 id="tm-prem-title">{signedOut ? (mode === 'signup' ? 'Create your account' : 'Welcome back') : 'Premium'}</h2>
        {signedOut ? <p className="tm-lead">{mode === 'signup' ? 'One account for Temp Mail Premium and GeoLint.' : 'Sign in to unlock long-lasting inboxes, your own names, attachments and forwarding.'}</p> : null}
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

const FORWARD_PER_DAY = 100

export function ForwardingEditor({ row, say, onChanged, ops, target = 'address' }) {
  const run = ops || {
    start: (to) => startForwarding(row.address, to),
    verify: (code) => verifyForwarding(row.address, code),
    stop: () => stopForwarding(row.address),
  }
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
      await run.start(to.trim())
      setPending(true)
      say('Code sent. Check that inbox.')
    } catch (e) { setError(premiumErrorMessage(e)) } finally { setBusy(false) }
  }
  const verify = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await run.verify(code)
      setPending(false); setCode(''); setTo('')
      say('Forwarding is on')
      onChanged()
    } catch (e) { setError(premiumErrorMessage(e)) } finally { setBusy(false) }
  }
  const stop = async () => {
    setBusy(true)
    try { await run.stop(); say('Forwarding stopped'); onChanged() } catch (e) { setError(premiumErrorMessage(e)) } finally { setBusy(false) }
  }

  if (row.forwardTo && !pending) {
    return (
      <div className="tm-fw">
        <p><HiOutlineEnvelope className="tm-icon" /> {target === 'domain' ? <span>Every mail sent to <b>anything@{row.domain}</b> is forwarded to <b>{row.forwardTo}</b>.</span> : <span>Every new mail to this address is also copied to <b>{row.forwardTo}</b>.</span>}</p>
        <button type="button" className="tm-btn tm-btn-ghost" onClick={stop} disabled={busy}>Stop forwarding</button>
        {error ? <p role="alert" className="tm-error">{error}</p> : null}
      </div>
    )
  }
  return (
    <div className="tm-fw">
      <ol className="tm-steps" aria-label="How forwarding works">
        <li className={pending ? 'is-done' : 'is-now'}><b>1</b> Enter your real email</li>
        <li className={pending ? 'is-now' : ''}><b>2</b> Type the 6-digit code we send there</li>
        <li><b>3</b> {target === 'domain' ? 'All mail for your domain is forwarded there' : 'New mail is copied to your inbox'}</li>
      </ol>
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
      <p className="tm-hint">Each mail is copied to your real inbox as plain text (attachments stay here in the temp inbox). We email a code first, so nobody can send mail to an inbox that is not theirs. Up to {FORWARD_PER_DAY} forwarded mails a day per {target}.</p>
    </div>
  )
}


/** Premium owner's compact address list. Everything else (forwarding, delete, domains, billing) lives in the settings window. */
/** Compact Premium strip on the page. The full list of addresses and the account live in the Settings window. */
export function PremiumBar({ prem, onSettings, onNew, busy }) {
  const rows = prem.me?.addresses || []
  const max = prem.me?.limits?.maxAddresses || 10
  const plan = prem.me?.premium
  const email = prem.user?.email || ''
  const used = Math.min(100, Math.round((rows.length / max) * 100))
  return (
    <section className="tm-card tm-pbar" aria-label="Your Premium account">
      <button type="button" className="tm-pbar-who" onClick={() => onSettings('account')} title="Open your account">
        <span className="tm-acct-av" aria-hidden="true">{(email[0] || 'P').toUpperCase()}</span>
        <span className="min-w-0">
          <b>👑 Premium <em className="tm-tag is-on">{plan?.cycle === 'yearly' ? 'Yearly' : plan?.cycle === 'monthly' ? 'Monthly' : 'Active'}</em></b>
          <small>{email}{plan?.expiresAt ? ` · until ${formatDate(plan.expiresAt)}` : ''}</small>
        </span>
      </button>
      <button type="button" className="tm-pbar-use" onClick={() => onSettings('addresses')} title="See all your addresses">
        <span><b>{rows.length}</b> of <b>{max}</b> addresses</span>
        <span className="tm-mine-meter" aria-hidden="true"><i style={{ width: `${used}%` }} /></span>
      </button>
      <span className="tm-pbar-actions">
        <button type="button" className="tm-btn" onClick={() => onSettings('addresses')}>My addresses</button>
        <button type="button" className="tm-btn" onClick={() => onSettings('account')}><HiOutlineCog6Tooth className="tm-icon" /> Settings</button>
        <button type="button" className="tm-btn tm-btn-primary" onClick={onNew} disabled={busy || rows.length >= max}>New address</button>
      </span>
    </section>
  )
}

export function MyAddresses({ prem, current, onSwitch, onNew, onCopy, onSettings, busy }) {
  const [now] = useState(() => Date.now())
  const rows = prem.me?.addresses || []
  const max = prem.me?.limits?.maxAddresses || 10
  const plan = prem.me?.premium
  const used = Math.min(100, Math.round((rows.length / max) * 100))

  return (
    <section className="tm-card tm-mine" aria-label="My Premium addresses">
      <div className="tm-inbox-head">
        <div className="tm-inbox-title"><HiOutlineSparkles className="tm-icon" /> My addresses <span className="tm-count">{rows.length}/{max}</span></div>
        <div className="flex items-center gap-1">
          <button type="button" className="tm-btn" onClick={() => onSettings('addresses')}><HiOutlineCog6Tooth className="tm-icon" /> Settings</button>
          <button type="button" className="tm-btn tm-btn-primary" onClick={onNew} disabled={busy || rows.length >= max}>New address</button>
        </div>
      </div>
      <div className="tm-mine-intro">
        <div className="tm-mine-meter" role="img" aria-label={`${rows.length} of ${max} addresses used`}><i style={{ width: `${used}%` }} /></div>
        <ul className="tm-mine-facts">
          <li><b>{rows.length}</b> of <b>{max}</b> addresses used</li>
          {plan?.cycle ? <li>Plan: <b>{plan.cycle === 'yearly' ? 'Yearly' : 'Monthly'}</b></li> : null}
          {plan?.expiresAt ? <li>Paid until <b>{formatDate(plan.expiresAt)}</b></li> : null}
          <li><button type="button" className="tm-link" onClick={() => onSettings('domains')}>Connect your own domain</button></li>
        </ul>
      </div>
      {rows.length === 0 ? (
        <div className="tm-mine-empty">
          <b>No Premium addresses yet</b>
          <p>Press "New address" to make your first one. It is kept for you, and mail sent to it is waiting whenever you open it.</p>
        </div>
      ) : (
        <ul className="tm-mine-list">
          {rows.map((row) => {
            const left = splitLongTime((new Date(row.expiresAt).getTime() - now) / 1000)
            const isCurrent = row.address === current
            return (
              <li key={row.address} className={isCurrent ? 'is-current' : ''}>
                <div className="tm-mine-top">
                  <button type="button" className="tm-mine-addr" onClick={() => onSwitch(row)} title="Open this inbox">
                    <b>{row.address}</b>
                    <span className="tm-mine-tags">
                      <em className="tm-tag">{daysLeftLabel(left.days)}</em>
                      {row.forwardTo ? <em className="tm-tag is-fw">Forwarding on</em> : null}
                    </span>
                  </button>
                  <span className="tm-mine-actions">
                    {isCurrent ? <em className="tm-tag is-on">Open now</em> : <button type="button" className="tm-btn tm-btn-primary" onClick={() => onSwitch(row)}>Open inbox</button>}
                    <button type="button" className="tm-btn" onClick={() => onCopy(row.address, 'Address')} title="Copy this address" aria-label={`Copy ${row.address}`}><HiOutlineClipboardDocument className="tm-icon" /></button>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
