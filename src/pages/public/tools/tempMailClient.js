/**
 * Browser-side helpers for the temp-mail tool: API client, formatters, the
 * new-mail beep and the Turnstile loader. No React in here.
 */
export const API = (import.meta.env.VITE_TEMP_MAIL_API_URL || 'https://nexora-temp-mail.rahanshah4.workers.dev').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(status, code, reason) {
    super(code || `HTTP ${status}`)
    this.status = status
    this.code = code || ''
    this.reason = reason || ''
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 204) return null
  let data = null
  try { data = await res.json() } catch { /* non-JSON error body */ }
  if (!res.ok) throw new ApiError(res.status, data?.error, data?.reason)
  return data
}

let configPromise = null
/** Fetch /api/config once and share it; warmUp() starts it before the app has even rendered. */
export function loadConfig() {
  if (!configPromise) configPromise = api('/api/config').catch((e) => { configPromise = null; throw e })
  return configPromise
}

/** Open the connection to the Worker and fetch its config while the page is still rendering. */
export function warmUp() {
  if (typeof document === 'undefined') return
  try {
    if (!document.querySelector('link[data-tm-preconnect]')) {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = API
      link.crossOrigin = ''
      link.setAttribute('data-tm-preconnect', '')
      document.head.appendChild(link)
    }
    loadConfig().catch(() => {})
  } catch { /* best effort */ }
}

export const attachmentUrl = (address, id, index) => `${API}/api/inbox/${encodeURIComponent(address)}/${encodeURIComponent(id)}/attachment/${index}`

export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function timeAgo(iso, now) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, Math.round((now - t) / 1000))
  if (diff < 10) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0891b2', '#4f46e5', '#b45309']
export function avatarFor(name) {
  const text = String(name || '?').trim()
  let hash = 0
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return { letter: (text.match(/[a-z0-9]/i)?.[0] || '?').toUpperCase(), color: AVATAR_COLORS[hash % AVATAR_COLORS.length] }
}

export function nameError(reason) {
  switch (reason) {
    case 'too_short': return 'Use at least 3 characters.'
    case 'too_long': return 'Use at most 32 characters.'
    case 'reserved': return 'That name is reserved. Please pick another.'
    default: return 'Use letters, numbers, dots, dashes or underscores (no double symbols, no symbol at the end).'
  }
}

export function attachmentReason(reason) {
  if (reason === 'blocked_type') return 'Not kept (risky file type)'
  if (reason === 'too_large') return 'Not kept (too large)'
  if (reason === 'too_many') return 'Not kept (too many files)'
  return 'Not available'
}

/** Short two-tone chime. Silent if audio is unavailable or not yet allowed by the browser. */
export function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[[880, 0], [1320, 0.12]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.18, now + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.3)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + 0.32)
    })
    window.setTimeout(() => { ctx.close().catch(() => {}) }, 800)
  } catch { /* no audio: the title and highlight still signal new mail */ }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let turnstileLoading = null
export function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!turnstileLoading) {
    turnstileLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = TURNSTILE_SRC
      script.async = true
      script.onload = () => resolve(window.turnstile)
      script.onerror = () => { turnstileLoading = null; reject(new Error('turnstile failed to load')) }
      document.head.appendChild(script)
    })
  }
  return turnstileLoading
}

const STORAGE = {
  address: 'nexora-temp-mail-address',
  sound: 'nexora-temp-mail-sound',
  alerts: 'nexora-temp-mail-alerts',
}
export function readStored(key) {
  try { return window.localStorage.getItem(STORAGE[key]) || '' } catch { return '' }
}
export function writeStored(key, value) {
  try {
    if (value) window.localStorage.setItem(STORAGE[key], value)
    else window.localStorage.removeItem(STORAGE[key])
  } catch { /* storage unavailable: nothing is remembered */ }
}

export const LOCAL_PART_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/

// ----------------------------------------------------------- PWA + web push

const SW_URL = '/tools/temp-mail/sw.js'
const SW_SCOPE = '/tools/temp-mail/'
export const APP_MANIFEST = '/tools/temp-mail/manifest.webmanifest'

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function isIos() {
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1)
}

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function registerSw() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null)
  return navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }).then(() => navigator.serviceWorker.ready).catch(() => null)
}

function keyBytes(base64url) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Tell the service worker which inbox to describe in a notification (null clears it). */
export async function shareStateWithSw(address) {
  const reg = await registerSw()
  const target = reg?.active || navigator.serviceWorker.controller
  if (target) target.postMessage({ type: 'state', address: address || '', api: API })
}

/** Ask permission, subscribe this browser and register it for the address. Returns 'on' | 'denied' | 'unsupported' | 'error'. */
export async function enablePush(address, vapidPublicKey) {
  if (!pushSupported() || !vapidPublicKey) return 'unsupported'
  try {
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'
    const reg = await registerSw()
    if (!reg) return 'unsupported'
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }))
    await api('/api/push', { method: 'POST', body: { address, endpoint: sub.endpoint } })
    await shareStateWithSw(address)
    return 'on'
  } catch { return 'error' }
}

export async function disablePush(address) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration(SW_SCOPE)
    const sub = await reg?.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    if (address) await api('/api/push', { method: 'DELETE', body: { address } })
    await shareStateWithSw('')
  } catch { /* already gone */ }
}
