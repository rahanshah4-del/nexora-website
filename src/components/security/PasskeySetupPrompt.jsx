import { useEffect, useState } from 'react'
import { HiOutlineKey, HiOutlineShieldCheck, HiOutlineXMark } from 'react-icons/hi2'
import { auth } from '../../lib/firebase.js'
import { listMyPasskeys, passkeysSupported, registerPasskey } from '../../lib/passkeys.js'

const PASSKEY_REMINDER_DELAY_MS = 3 * 24 * 60 * 60 * 1000

export default function PasskeySetupPrompt({ enabled = true, emailVerified = false }) {
  const user = auth?.currentUser
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!enabled || !user?.uid || !emailVerified) return
      const skipKey = `nexoraPasskeySkipped:${user.uid}`
      const skippedAt = Number(localStorage.getItem(skipKey) || 0)
      if (skippedAt && Date.now() - skippedAt < PASSKEY_REMINDER_DELAY_MS) return
      const isSupported = passkeysSupported()
      if (!isSupported) return
      const passkeys = await listMyPasskeys().catch(() => [])
      if (!cancelled) {
        setSupported(true)
        setOpen(!passkeys.some((item) => item.status === 'active'))
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [enabled, emailVerified, user?.uid])

  if (!open || !supported) return null

  async function enablePasskey() {
    setBusy(true)
    setMessage('')
    try {
      await registerPasskey()
      if (user?.uid) localStorage.removeItem(`nexoraPasskeySkipped:${user.uid}`)
      setMessage('✅ Passkey enabled. Next time you can sign in with fingerprint, Face ID, Windows Hello, or device PIN.')
      window.setTimeout(() => setOpen(false), 1200)
    } catch (error) {
      setMessage(error?.message || '⚠️ Passkey setup failed. You can try again from Settings > Security.')
    } finally {
      setBusy(false)
    }
  }

  function skip() {
    if (user?.uid) localStorage.setItem(`nexoraPasskeySkipped:${user.uid}`, String(Date.now()))
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-indigo-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-5">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
              <HiOutlineShieldCheck className="h-4 w-4" />
              Secure sign-in 🔐
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">Enable Passkey? ✨</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Sign in faster and more securely using your device. This is optional, and password login will still work.</p>
          </div>
          <button type="button" onClick={skip} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          {['👆 Fingerprint', '😊 Face ID', '🪟 Windows Hello', '🔢 Device PIN'].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-indigo-600">
                <HiOutlineKey className="h-4 w-4" />
              </span>
              {item}
            </div>
          ))}
          {message ? <p className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white">{message}</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={enablePasskey} disabled={busy} className="min-h-11 rounded-2xl bg-indigo-600 px-4 text-sm font-black text-white disabled:opacity-60">
              {busy ? 'Opening…' : 'Enable Passkey'}
            </button>
            <button type="button" onClick={skip} className="min-h-11 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700">
              Maybe Later
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
