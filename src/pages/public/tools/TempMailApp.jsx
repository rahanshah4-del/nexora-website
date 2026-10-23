import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HiOutlineArrowDownTray, HiOutlineArrowLeft, HiOutlineDevicePhoneMobile, HiOutlineArrowPath, HiOutlineBell, HiOutlineBellSlash, HiOutlineCheck,
  HiOutlineArrowsPointingIn, HiOutlineArrowsPointingOut, HiOutlineClipboardDocument, HiOutlineDocumentText, HiOutlineEnvelopeOpen, HiOutlineFlag, HiOutlineInbox, HiOutlinePaperClip,
  HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash,
} from 'react-icons/hi2'
import {
  APP_MANIFEST, LOCAL_PART_RE, api, attachmentReason, attachmentUrl, avatarFor, disablePush, enablePush, formatClock, formatSize,
  isIos, isStandalone, loadConfig, loadTurnstile, nameError, playChime, pushSupported, readStored, registerSw, shareStateWithSw, timeAgo, writeStored,
} from './tempMailClient.js'
import { extractCode } from '../../../../workers/nexora-temp-mail/src/lib.js' // same detector the Worker uses
import './tempmail.css'

const POLL_MS = 5000
const FAST_POLL_MS = 1000 // while waiting for a mail
const FAST_WINDOW_MS = 120000
const REPORT_REASONS = [['spam', 'Spam'], ['phishing', 'Phishing / scam'], ['abuse', 'Abuse'], ['illegal', 'Illegal content'], ['other', 'Other']]
const enc = encodeURIComponent

/** Turnstile token supplier. Tokens are single use, so one is prepared ahead and renewed after each use. */
function useTurnstile() {
  const holder = useRef(null)
  const ts = useRef({ widgetId: null, token: null, waiters: [] })

  const renew = () => {
    ts.current.token = null
    try { if (window.turnstile && ts.current.widgetId !== null) window.turnstile.reset(ts.current.widgetId) } catch { /* widget gone */ }
  }

  const mount = useCallback(async (siteKey) => {
    const turnstile = await loadTurnstile()
    if (!holder.current || ts.current.widgetId !== null) return
    ts.current.widgetId = turnstile.render(holder.current, {
      sitekey: siteKey,
      size: 'flexible',
      appearance: 'interaction-only',
      callback: (token) => {
        const waiter = ts.current.waiters.shift()
        if (waiter) { waiter.resolve(token); renew() } else ts.current.token = token
      },
      'expired-callback': () => { ts.current.token = null },
      'error-callback': () => { ts.current.waiters.splice(0).forEach((w) => w.reject(new Error('captcha_error'))) },
    })
  }, [])

  const getToken = useCallback(() => new Promise((resolve, reject) => {
    if (ts.current.token) {
      const token = ts.current.token
      renew()
      resolve(token)
      return
    }
    const waiter = { resolve, reject }
    ts.current.waiters.push(waiter)
    window.setTimeout(() => {
      const i = ts.current.waiters.indexOf(waiter)
      if (i >= 0) { ts.current.waiters.splice(i, 1); reject(new Error('captcha_timeout')) }
    }, 25000)
  }), [])

  return { holder, mount, getToken }
}

function Avatar({ name }) {
  const { letter, color } = avatarFor(name)
  return <span className="tm-avatar" style={{ background: color }} aria-hidden="true">{letter}</span>
}

/** Countdown ring: gradient arc that drains smoothly, a glowing head, ticking seconds and a "+1h" burst on extend. */
function TimerRing({ remaining, total, active, bump }) {
  const r = 44
  const c = 2 * Math.PI * r
  const progress = active && total > 0 ? Math.min(1, remaining / total) : 0
  const state = !active ? 'is-idle' : remaining <= 60 ? 'is-low' : remaining <= 300 ? 'is-warn' : ''
  const clock = formatClock(active ? remaining : 0)
  const cut = clock.lastIndexOf(':')
  return (
    <div className={`tm-timer ${state} ${clock.length > 5 ? 'is-long' : ''}`} role="timer" aria-label={`Time left ${clock}`}>
      <span className="tm-timer-glow" aria-hidden="true" />
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="tm-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--tm-g1)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--tm-g2)' }} />
          </linearGradient>
        </defs>
        <circle className="track" cx="50" cy="50" r={r} fill="none" strokeWidth="7" />
        <circle className="bar" cx="50" cy="50" r={r} fill="none" strokeWidth="7" stroke="url(#tm-ring-grad)" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
        <g className="head" style={{ transform: `rotate(${progress * 360}deg)` }}><circle cx={50 + r} cy="50" r="4.2" /></g>
      </svg>
      <div className="tm-timer-text">
        <b>{active ? clock.slice(0, cut) : '--'}<span key={active ? clock.slice(cut) : 'idle'} className="tick">{active ? clock.slice(cut) : ':--'}</span></b>
        <small>left</small>
      </div>
      {bump ? <span key={bump} className="tm-plus" aria-hidden="true">+1h</span> : null}
    </div>
  )
}

function ReportMenu({ onReport }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="tm-menu">
      <button type="button" className="tm-btn tm-btn-ghost" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <HiOutlineFlag className="tm-icon" /> Report
      </button>
      {open ? (
        <span className="tm-menu-list" role="menu">
          {REPORT_REASONS.map(([value, label]) => (
            <button key={value} type="button" role="menuitem" onClick={() => { setOpen(false); onReport(value) }}>{label}</button>
          ))}
        </span>
      ) : null}
    </span>
  )
}

/** Plain text of a message: the text part, or the visible text of the (already sanitised) HTML. */
function messageText(message) {
  if (message.text) return message.text
  if (!message.html) return ''
  try {
    // Keep block boundaries as line breaks so e.g. a big code box stays on its own line.
    const html = message.html
      .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6]|table|section)>|<\/t[dh]>/gi, '\n')
    return new DOMParser().parseFromString(html, 'text/html').body.textContent.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  } catch { return '' }
}

function Reader({ address, message, loading, onBack, onCopy, onDelete, onReport }) {
  const [view, setView] = useState('html')
  const [full, setFull] = useState(false)

  // Full view: Esc closes it and the page behind does not scroll.
  useEffect(() => {
    if (!full) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setFull(false) }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [full])

  if (loading || !message) {
    return (
      <div className="tm-reader" aria-busy="true">
        <button type="button" className="tm-btn tm-btn-ghost tm-back" onClick={onBack}><HiOutlineArrowLeft className="tm-icon" /> Inbox</button>
        <div className="tm-skel" style={{ margin: '.5rem 0' }} />
        <div className="tm-skel" style={{ margin: '.5rem 0', height: 180 }} />
      </div>
    )
  }
  // Try the plain-text part and the HTML part separately: either can be the one that carries the code.
  const code = message.code || extractCode(message.text) || extractCode(messageText({ html: message.html })) || extractCode(message.subject)
  const hasHtml = Boolean(message.html)
  const mode = hasHtml ? view : 'text'
  const doc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><base target="_blank"><style>body{font:14px/1.6 system-ui,sans-serif;color:#0f172a;margin:14px;word-wrap:break-word}img{max-width:100%;height:auto}a{color:#2563eb}</style>${message.html}`
  return (
    <div className={`tm-reader ${full ? 'is-full' : ''}`} {...(full ? { role: 'dialog', 'aria-modal': 'true', 'aria-label': message.subject } : {})}>
      <button type="button" className="tm-btn tm-btn-ghost tm-back" onClick={onBack}><HiOutlineArrowLeft className="tm-icon" /> Inbox</button>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3>{message.subject}</h3>
        <span className="flex flex-wrap items-center gap-1">
          <button type="button" className="tm-btn tm-btn-ghost" onClick={() => onCopy(messageText(message) || '(empty message)', 'Message text')} title="Copy the message as plain text"><HiOutlineDocumentText className="tm-icon" /> Copy text</button>
          <button type="button" className="tm-btn tm-btn-ghost" onClick={() => setFull((v) => !v)} aria-pressed={full} title={full ? 'Close full view (Esc)' : 'Open in full view'}>
            {full ? <><HiOutlineArrowsPointingIn className="tm-icon" /> Close</> : <><HiOutlineArrowsPointingOut className="tm-icon" /> Full view</>}
          </button>
          <ReportMenu onReport={onReport} />
          <button type="button" className="tm-btn tm-btn-ghost tm-btn-danger" onClick={onDelete}><HiOutlineTrash className="tm-icon" /> Delete</button>
        </span>
      </div>
      <p className="tm-meta">From <b>{message.fromName || message.fromAddress}</b> &lt;{message.fromAddress}&gt; · to {message.to} · {new Date(message.receivedAt).toLocaleString()}</p>

      {code ? (
        <div className="tm-otp">
          <div><small>Verification code</small><b>{code}</b></div>
          <button type="button" className="tm-btn tm-btn-primary" onClick={() => onCopy(code, 'Code')}><HiOutlineClipboardDocument className="tm-icon" /> Copy code</button>
        </div>
      ) : null}

      {hasHtml ? (
        <div className="tm-tabs mt-3" role="tablist" aria-label="Message view">
          <button type="button" role="tab" aria-selected={mode === 'html'} className={`tm-tab ${mode === 'html' ? 'is-on' : ''}`} onClick={() => setView('html')}>Formatted</button>
          <button type="button" role="tab" aria-selected={mode === 'text'} className={`tm-tab ${mode === 'text' ? 'is-on' : ''}`} onClick={() => setView('text')}>Plain text</button>
        </div>
      ) : null}
      {mode === 'html'
        ? <iframe title="Email content" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={doc} className="tm-body-frame" />
        : <pre className="tm-body-text">{message.text || '(empty message)'}</pre>}

      {message.attachments?.length ? (
        <div className="tm-files" aria-label="Attachments">
          {message.attachments.map((a) => (
            <div key={a.index} className="tm-file">
              <HiOutlinePaperClip className="tm-icon" />
              <span className="name" title={a.filename}>{a.filename}</span>
              <span className="size">{formatSize(a.size)}</span>
              {a.available
                ? <a href={attachmentUrl(address, message.id, a.index)} download={a.filename} rel="noopener"><HiOutlineArrowDownTray className="tm-icon" /> Download</a>
                : <span className="size">{attachmentReason(a.reason)}</span>}
            </div>
          ))}
          <p className="tm-hint">Files come from unknown senders. Only open ones you expect, and scan them first.</p>
        </div>
      ) : null}
    </div>
  )
}

export default function TempMailApp() {
  const { holder: captchaRef, mount: mountCaptcha, getToken: getCaptchaToken } = useTurnstile()
  const [config, setConfig] = useState(null)
  const [address, setAddress] = useState(() => readStored('address'))
  const [expiresAt, setExpiresAt] = useState(0)
  const [canExtend, setCanExtend] = useState(true)
  const [totalSeconds, setTotalSeconds] = useState(3600)
  const [bump, setBump] = useState(0)
  const [messages, setMessages] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [expired, setExpired] = useState(false)
  const [online, setOnline] = useState(true)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [sound, setSound] = useState(() => readStored('sound') !== 'off')
  const [newIds, setNewIds] = useState([])
  const [unread, setUnread] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customLocal, setCustomLocal] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [toast, setToast] = useState('')
  const [alerts, setAlerts] = useState(() => readStored('alerts') === 'on')
  const [installEvent, setInstallEvent] = useState(null)

  const addressRef = useRef(address)
  const configRef = useRef(null)
  const seenRef = useRef(new Set())
  const loadedRef = useRef(false)
  const selectedRef = useRef(null)
  const soundRef = useRef(sound)
  const toastTimer = useRef(0)

  const say = useCallback((text) => {
    setToast(text)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }, [])

  const copyText = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      say(`${label} copied`)
    } catch { say('Copy failed. Select the text and copy it manually.') }
  }, [say])

  const openMessage = useCallback(async (id) => {
    const addr = addressRef.current
    selectedRef.current = id
    setSelectedId(id)
    setDetail(null)
    setDetailLoading(true)
    try {
      const data = await api(`/api/inbox/${enc(addr)}/${enc(id)}`)
      if (selectedRef.current === id) setDetail(data.message)
    } catch {
      if (selectedRef.current === id) { say('Could not open that message. It may have expired.'); selectedRef.current = null; setSelectedId(null) }
    } finally {
      if (selectedRef.current === id) setDetailLoading(false)
    }
  }, [say])

  const fastUntil = useRef(0)
  const inflight = useRef(false)
  const speedUp = useCallback(() => { fastUntil.current = Date.now() + FAST_WINDOW_MS }, [])

  const refresh = useCallback(async () => {
    const addr = addressRef.current
    if (!addr || inflight.current) return
    inflight.current = true
    try {
      const data = await api(`/api/inbox/${enc(addr)}`)
      if (addressRef.current !== addr) return
      setExpiresAt(new Date(data.expiresAt).getTime())
      setCanExtend(Boolean(data.canExtend))
      if (data.totalSeconds) setTotalSeconds(data.totalSeconds)
      const fresh = data.messages.filter((m) => !seenRef.current.has(m.id))
      data.messages.forEach((m) => seenRef.current.add(m.id))
      if (loadedRef.current && fresh.length) {
        const ids = fresh.map((m) => m.id)
        setNewIds((prev) => [...prev, ...ids])
        window.setTimeout(() => setNewIds((prev) => prev.filter((id) => !ids.includes(id))), 2600)
        fastUntil.current = 0
        if (soundRef.current) playChime()
        if (document.visibilityState === 'hidden') setUnread((u) => u + fresh.length)
      }
      const firstLoad = !loadedRef.current
      loadedRef.current = true
      setMessages(data.messages)
      setLoaded(true)
      setOnline(true)
      if (firstLoad || (!selectedRef.current && fresh.length)) {
        if (!selectedRef.current && data.messages.length && window.matchMedia('(min-width: 1024px)').matches) openMessage(data.messages[0].id)
      }
    } catch (e) {
      if (e.status === 404) setExpired(true)
      else setOnline(false)
    } finally {
      inflight.current = false
    }
  }, [openMessage])

  const adopt = useCallback((data) => {
    addressRef.current = data.address
    seenRef.current = new Set()
    loadedRef.current = false
    selectedRef.current = null
    setAddress(data.address)
    setExpiresAt(new Date(data.expiresAt).getTime())
    setCanExtend(Boolean(data.canExtend))
    setTotalSeconds(data.totalSeconds || data.expiresInSeconds || 3600)
    setNow(Date.now())
    setMessages([])
    setLoaded(false)
    setExpired(false)
    setSelectedId(null)
    setDetail(null)
    setNewIds([])
    speedUp()
    writeStored('address', data.address)
  }, [speedUp])

  const createAddress = useCallback(async ({ local = '', domain = '' } = {}) => {
    setBusy(true)
    setError('')
    try {
      const token = configRef.current?.captchaRequired ? await getCaptchaToken() : undefined
      const data = await api('/api/address', { method: 'POST', body: { local: local || undefined, domain: domain || undefined, turnstileToken: token } })
      adopt(data)
      return true
    } catch (e) {
      if (e.status === 429) setError('Too many new addresses from your network. Please wait a minute and try again.')
      else if (e.code === 'name_taken') setError('That name is already in use. Try another one.')
      else if (e.code === 'invalid_name') setError(nameError(e.reason))
      else if (e.code === 'captcha_failed' || e.message === 'captcha_timeout' || e.message === 'captcha_error') setError('Could not verify you are human. Please try again.')
      else setError('Could not create an address right now. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }, [adopt, getCaptchaToken])

  // Start: load the config, then resume the remembered address or make a new one.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let cfg = { domains: [], periodSeconds: 3600, captchaRequired: false }
      try { cfg = await loadConfig() } catch { /* defaults: the create call reports real errors */ }
      if (cancelled) return
      configRef.current = cfg
      setConfig(cfg)
      setCustomDomain(cfg.domains?.[0] || '')
      if (cfg.captchaRequired && cfg.turnstileSiteKey) mountCaptcha(cfg.turnstileSiteKey).catch(() => {})
      if (addressRef.current) { await refresh(); if (!cancelled) setBusy(false) } else await createAddress()
    })()
    return () => { cancelled = true }
  }, [createAddress, refresh, mountCaptcha])

  // Poll while the tab is visible and the address is live; refresh as soon as the tab is shown again.
  const live = Boolean(address) && !expired
  useEffect(() => {
    if (!live) return undefined
    // Every second while waiting for a mail (new address, tab shown, address copied); every 5s otherwise.
    let beat = 0
    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      beat += 1
      if (Date.now() < fastUntil.current || beat % (POLL_MS / FAST_POLL_MS) === 0) refresh()
    }, FAST_POLL_MS)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    const onVisible = () => { if (document.visibilityState === 'visible') { setUnread(0); speedUp(); refresh() } }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible); window.clearInterval(poll); window.clearInterval(tick); document.removeEventListener('visibilitychange', onVisible) }
  }, [live, refresh, speedUp])

  // Tab title shows mail that arrived while the tab was hidden.
  useEffect(() => {
    if (!unread) return undefined
    const base = document.title
    document.title = `(${unread}) New mail · ${base}`
    return () => { document.title = base }
  }, [unread])

  const remaining = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : 0
  const isExpired = expired || (Boolean(expiresAt) && remaining <= 0 && loaded)

  const extend = async () => {
    try {
      const data = await api(`/api/inbox/${enc(address)}/extend`, { method: 'POST' })
      setExpiresAt(new Date(data.expiresAt).getTime())
      setCanExtend(Boolean(data.canExtend))
      if (data.totalSeconds) setTotalSeconds(data.totalSeconds)
      setNow(Date.now())
      setBump((n) => n + 1)
      say(`Added ${Math.round((data.periodSeconds || 3600) / 60)} minutes`)
    } catch (e) {
      if (e.code === 'max_extensions' || e.code === 'max_lifetime') { setCanExtend(false); say('Time can be added only once per address.') }
      else if (e.status === 429) say('Too many requests. Please wait a moment.')
      else say('Could not extend. Please try again.')
    }
  }

  const clearInbox = async () => {
    try {
      await api(`/api/inbox/${enc(address)}`, { method: 'DELETE' })
      setMessages([])
      selectedRef.current = null
      setSelectedId(null)
      setDetail(null)
      say('Inbox emptied')
    } catch { say('Could not delete. Please try again.') }
  }

  const deleteOne = async () => {
    const id = selectedRef.current
    try {
      await api(`/api/inbox/${enc(address)}/${enc(id)}`, { method: 'DELETE' })
      setMessages((list) => list.filter((m) => m.id !== id))
      selectedRef.current = null
      setSelectedId(null)
      setDetail(null)
    } catch { say('Could not delete that message.') }
  }

  const report = async (reason) => {
    try {
      await api('/api/report', { method: 'POST', body: { address, id: selectedRef.current, reason } })
      say('Reported. Thank you.')
    } catch (e) { say(e.status === 429 ? 'Too many reports. Please wait.' : 'Could not send the report.') }
  }

  // Use this tool's own app manifest (and service worker) while the page is open, so "Install" installs Temp Mail only.
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]')
    const previous = link?.getAttribute('href')
    if (link) link.setAttribute('href', APP_MANIFEST)
    registerSw()
    const onPrompt = (event) => { event.preventDefault(); setInstallEvent(event) }
    const onInstalled = () => setInstallEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      if (link && previous) link.setAttribute('href', previous)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Keep the push registration pointed at the current address (new address = new registration).
  const vapidKey = config?.vapidPublicKey || ''
  useEffect(() => {
    if (!live || !vapidKey || !pushSupported()) return
    if (alerts && Notification.permission === 'granted') enablePush(address, vapidKey)
    else shareStateWithSw('')
  }, [alerts, live, address, vapidKey])

  const toggleAlerts = async () => {
    if (alerts) {
      setAlerts(false)
      writeStored('alerts', '')
      disablePush(address)
      say('Alerts off')
      return
    }
    const result = await enablePush(address, vapidKey)
    if (result === 'on') { setAlerts(true); writeStored('alerts', 'on'); say('Alerts on. You will be notified even when this tab is closed.') }
    else if (result === 'denied') say('Notifications are blocked. Allow them in your browser settings for this site.')
    else say('Could not turn on alerts in this browser.')
  }

  const installApp = async () => {
    if (installEvent) {
      installEvent.prompt()
      await installEvent.userChoice.catch(() => null)
      setInstallEvent(null)
    } else if (isIos()) say('On iPhone: tap Share, then "Add to Home Screen".')
  }

  const toggleSound = () => {
    const next = !sound
    soundRef.current = next
    setSound(next)
    writeStored('sound', next ? '' : 'off')
    if (next) playChime()
  }

  const submitCustom = async (event) => {
    event.preventDefault()
    const local = customLocal.trim().toLowerCase()
    if (!LOCAL_PART_RE.test(local)) { setError(nameError('invalid')); return }
    if (await createAddress({ local, domain: customDomain })) { setShowCustom(false); setCustomLocal('') }
  }

  const showAddress = busy && !address ? 'Creating your address…' : address || 'Could not create an address'
  const domains = config?.domains?.length ? config.domains : ['mail.nexorasolution.us']

  return (
    <div className="tm-app">
      <div className="tm-hero-card">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="tm-eyebrow">Your temporary email address</p>
            <button type="button" className={`tm-address ${busy && !address ? 'is-loading' : ''}`} onClick={() => { if (address) { speedUp(); copyText(address, 'Address') } }} aria-label="Copy your temporary email address" title="Click to copy">
              <span className="min-w-0 flex-1">{showAddress}</span>
              {address ? <HiOutlineClipboardDocument className="tm-icon" /> : null}
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="tm-btn tm-btn-primary" onClick={() => { speedUp(); copyText(address, 'Address') }} disabled={!address}><HiOutlineClipboardDocument className="tm-icon" /> Copy</button>
              <button type="button" className="tm-btn" onClick={() => createAddress()} disabled={busy}><HiOutlineArrowPath className="tm-icon" /> New address</button>
              <button type="button" className="tm-btn" onClick={() => setShowCustom((v) => !v)} aria-expanded={showCustom}><HiOutlinePencilSquare className="tm-icon" /> Customize</button>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:flex-col sm:gap-2">
            <TimerRing remaining={remaining} total={totalSeconds} active={Boolean(address) && !isExpired} bump={bump} />
            <button type="button" className="tm-btn" onClick={extend} disabled={!address || isExpired || !canExtend} title={canExtend ? 'Add one more hour (one time only)' : 'Time can be added only once'}>{canExtend ? <><HiOutlinePlus className="tm-icon" /> Add 1 hour</> : <><HiOutlineCheck className="tm-icon" /> Time added</>}</button>
          </div>
        </div>

        {showCustom ? (
          <form className="tm-panel" onSubmit={submitCustom}>
            <label htmlFor="tm-custom" className="tm-eyebrow">Choose your own address</label>
            <div className="tm-field mt-2">
              <input id="tm-custom" className="tm-input grow" value={customLocal} onChange={(e) => setCustomLocal(e.target.value)} placeholder="yourname" autoComplete="off" autoCapitalize="none" spellCheck="false" maxLength={32} />
              <span className="tm-at">@</span>
              <select className="tm-input" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} aria-label="Domain">
                {domains.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <button type="submit" className="tm-btn tm-btn-primary" disabled={busy || !customLocal.trim()}><HiOutlineCheck className="tm-icon" /> Create</button>
            </div>
            <p className="tm-hint">3 to 32 characters: letters, numbers, dots, dashes, underscores. Anyone who knows or guesses this name can read its inbox, so use a random address for anything sensitive.</p>
          </form>
        ) : null}

        {error ? <p role="alert" className="tm-error">{error}</p> : null}
        <div ref={captchaRef} className="tm-captcha" />
      </div>

      <div className="tm-card tm-inbox">
        <div className="tm-inbox-head">
          <div className="tm-inbox-title">
            <HiOutlineInbox className="tm-icon" /> Inbox {messages.length ? <span className="tm-count">{messages.length}</span> : null}
            <span className={`tm-live ${online && live ? '' : 'is-off'}`}><i /> {online ? (live ? 'Live' : 'Closed') : 'Reconnecting…'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="tm-btn tm-btn-ghost" onClick={toggleSound} aria-pressed={sound} title={sound ? 'Sound on' : 'Sound off'}>
              {sound ? <HiOutlineBell className="tm-icon" /> : <HiOutlineBellSlash className="tm-icon" />}<span className="hidden sm:inline">{sound ? 'Sound on' : 'Sound off'}</span>
            </button>
            {vapidKey && pushSupported() ? (
              <button type="button" className="tm-btn tm-btn-ghost" onClick={toggleAlerts} aria-pressed={alerts} disabled={!live} title="Notify me about new mail, even when this tab is closed">
                <HiOutlineBell className="tm-icon" /><span className="hidden sm:inline">{alerts ? 'Alerts on' : 'Enable alerts'}</span>
              </button>
            ) : null}
            {(installEvent || (isIos() && !isStandalone())) ? (
              <button type="button" className="tm-btn tm-btn-ghost" onClick={installApp} title="Install as an app">
                <HiOutlineDevicePhoneMobile className="tm-icon" /><span className="hidden sm:inline">Install app</span>
              </button>
            ) : null}
            <button type="button" className="tm-btn tm-btn-ghost" onClick={() => { speedUp(); refresh() }} disabled={!live}><HiOutlineArrowPath className="tm-icon" /><span className="hidden sm:inline">Refresh</span></button>
            {messages.length ? <button type="button" className="tm-btn tm-btn-ghost tm-btn-danger" onClick={clearInbox}><HiOutlineTrash className="tm-icon" /><span className="hidden sm:inline">Delete all</span></button> : null}
          </div>
        </div>

        {isExpired ? (
          <div className="tm-expired">
            <div className="tm-empty" style={{ minHeight: 0, padding: 0 }}>
              <span className="art"><HiOutlineEnvelopeOpen /></span>
              <h3>This address has expired</h3>
              <p>The inbox was closed and its mail is being erased. Get a fresh address to keep going.</p>
            </div>
            <button type="button" className="tm-btn tm-btn-primary" onClick={() => createAddress()} disabled={busy}><HiOutlineArrowPath className="tm-icon" /> Get a new address</button>
          </div>
        ) : !loaded ? (
          <div aria-busy="true"><div className="tm-skel" /><div className="tm-skel" /><div className="tm-skel" /></div>
        ) : messages.length === 0 ? (
          <div className="tm-empty" aria-live="polite">
            <span className="art"><HiOutlineEnvelopeOpen /></span>
            <h3>Waiting for incoming mail…</h3>
            <p>Use the address above on any site. New messages and verification codes appear here by themselves.</p>
          </div>
        ) : (
          <div className={`tm-split ${selectedId ? 'has-open' : ''}`}>
            <ul className="tm-list" aria-live="polite" aria-label="Messages">
              {messages.map((m) => (
                <li key={m.id}>
                  <div role="button" tabIndex={0} className={`tm-item ${m.id === selectedId ? 'is-active' : ''} ${newIds.includes(m.id) ? 'is-new' : ''}`} onClick={() => openMessage(m.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMessage(m.id) } }}>
                    <Avatar name={m.fromName || m.fromAddress} />
                    <span className="tm-item-main">
                      <span className="tm-row"><span className="tm-from">{m.fromName || m.fromAddress}</span><span className="tm-time">{timeAgo(m.receivedAt, now)}</span></span>
                      <span className="tm-subject block">{m.subject}</span>
                      <span className="tm-preview block">{m.preview}</span>
                      {(m.code || m.attachmentCount) ? (
                        <span className="tm-tags">
                          {m.code ? <button type="button" className="tm-chip code" onClick={(e) => { e.stopPropagation(); copyText(m.code, 'Code') }} title="Copy code">{m.code} <HiOutlineClipboardDocument className="tm-icon" style={{ width: 13, height: 13 }} /></button> : null}
                          {m.attachmentCount ? <span className="tm-chip plain"><HiOutlinePaperClip className="tm-icon" style={{ width: 13, height: 13 }} /> {m.attachmentCount}</span> : null}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="tm-reader-wrap">
              {selectedId
                ? <Reader address={address} message={detail} loading={detailLoading} onBack={() => { selectedRef.current = null; setSelectedId(null); setDetail(null) }} onCopy={copyText} onDelete={deleteOne} onReport={report} />
                : <div className="tm-empty"><span className="art"><HiOutlineEnvelopeOpen /></span><h3>Select a message</h3><p>Pick a message on the left to read it.</p></div>}
            </div>
          </div>
        )}
      </div>

      {toast ? <div className="tm-toast" role="status">{toast}</div> : null}
    </div>
  )
}
