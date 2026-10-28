import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/** An animated walk through a temp-mail inbox: address, mail arriving, OTP picked out, then everything erased. Sample data only. */

const STEPS = [
  { id: 'address', title: 'Get an address', text: 'One click gives you a real inbox. No signup, no password.' },
  { id: 'arrive', title: 'Watch mail arrive', text: 'Messages show up live, with real delivery from any sender.' },
  { id: 'otp', title: 'OTP found for you', text: 'Verification codes are picked out so you can copy them in one tap.' },
  { id: 'erase', title: 'Erased on its own', text: 'When the timer ends, the address and every message are deleted.' },
]
const MAILS = [
  { from: 'Acme Verify', subject: 'Your sign-in code', time: 'now', tone: '#6366f1' },
  { from: 'Shop Orders', subject: 'Order confirmed', time: '1m', tone: '#0ea5e9' },
  { from: 'Weekly Digest', subject: 'Your reading list', time: '2m', tone: '#f59e0b' },
]
const ADDRESS = 'crispkiwi8590@mail.nexorasolution.us'
const SPRING = { type: 'spring', stiffness: 300, damping: 26 }
const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }

function AddressView({ reduce }) {
  const [n, setN] = useState(reduce ? ADDRESS.length : 0)
  useEffect(() => {
    if (reduce) return undefined
    const t = setInterval(() => setN((v) => (v >= ADDRESS.length ? v : v + 1)), 38)
    return () => clearInterval(t)
  }, [reduce])
  return (
    <div className="pt-2">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--tm-mute)' }}>Your temporary address</p>
      <div className="mt-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold" style={{ ...mono, background: 'var(--tm-soft)', borderColor: 'var(--tm-line)', wordBreak: 'break-all' }}>
        {ADDRESS.slice(0, n)}<span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse" style={{ background: 'var(--tm-brand)' }} />
      </div>
      <div className="mt-4 flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--tm-mute)' }}>
        <span className="flex gap-1">{[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--tm-brand)' }} animate={reduce ? {} : { opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />)}</span>
        Waiting for mail…
      </div>
    </div>
  )
}

function MailRow({ m, i, highlight }) {
  return (
    <motion.li initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...SPRING, delay: i * 0.22 }}
      className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ background: highlight ? 'color-mix(in srgb, var(--tm-brand) 10%, var(--tm-bg))' : 'var(--tm-bg)', borderColor: highlight ? 'var(--tm-brand)' : 'var(--tm-line)' }}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: m.tone }}>{m.from[0]}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-bold">{m.from}</span><span className="block truncate text-[12px]" style={{ color: 'var(--tm-mute)' }}>{m.subject}</span></span>
      <span className="text-[11px]" style={{ color: 'var(--tm-mute)' }}>{m.time}</span>
    </motion.li>
  )
}

function OtpView({ reduce }) {
  const digits = ['4', '8', '2', '9', '1', '7']
  return (
    <div className="pt-1">
      <MailRow m={MAILS[0]} i={0} highlight />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, ...SPRING }} className="mt-3 rounded-2xl border p-4 text-center" style={{ background: 'var(--tm-bg)', borderColor: 'var(--tm-line)' }}>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider" style={{ background: 'color-mix(in srgb, var(--tm-ok) 15%, transparent)', color: 'var(--tm-ok)' }}>
          <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden="true"><path d="M8 14.4 3.8 10.2l1.4-1.4L8 11.6l6.8-6.8 1.4 1.4z" /></svg>OTP detected
        </span>
        <div className="mt-3 flex justify-center gap-1.5">
          {digits.map((d, i) => (
            <motion.span key={i} initial={reduce ? false : { opacity: 0, y: 14, rotateX: -70 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.45 + i * 0.09, ...SPRING }} className="grid h-10 w-8 place-items-center rounded-lg text-[19px] font-bold" style={{ ...mono, background: 'var(--tm-soft)', border: '1px solid var(--tm-line)' }}>{d}</motion.span>
          ))}
        </div>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-3 inline-flex min-h-[34px] items-center rounded-full px-4 text-[12.5px] font-semibold text-white" style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>Copy code</motion.span>
      </motion.div>
    </div>
  )
}

function EraseView({ reduce }) {
  const r = 38
  const c = 2 * Math.PI * r
  return (
    <div className="grid place-items-center pt-3 text-center">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--tm-line)" strokeWidth="7" />
          <motion.circle cx="50" cy="50" r={r} fill="none" stroke="url(#tmg)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: c }} transition={{ duration: reduce ? 0 : 2.4, ease: 'easeInOut' }} />
          <defs><linearGradient id="tmg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#7c3aed" /></linearGradient></defs>
        </svg>
        <motion.div initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: 0.8 }} transition={{ delay: reduce ? 0 : 2.2 }} className="absolute inset-0 grid place-content-center text-[13px] font-bold tabular-nums" style={mono}>00:00</motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduce ? 0 : 2.4, ...SPRING }} className="absolute inset-0 grid place-items-center">
          <span className="grid h-12 w-12 place-items-center rounded-full text-white" style={{ background: 'var(--tm-ok)' }}><svg viewBox="0 0 20 20" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M8 14.4 3.8 10.2l1.4-1.4L8 11.6l6.8-6.8 1.4 1.4z" /></svg></span>
        </motion.div>
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 2.6 }} className="mt-3 text-[13px] font-bold">Inbox erased</motion.p>
      <p className="text-[12px]" style={{ color: 'var(--tm-mute)' }}>Nothing is kept.</p>
    </div>
  )
}

export default function TempMailShowcase() {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const go = useCallback((i) => setStep((i + STEPS.length) % STEPS.length), [])
  useEffect(() => {
    if (paused || reduce) return undefined
    const t = setTimeout(() => go(step + 1), step === 3 ? 4200 : 3600)
    return () => clearTimeout(t)
  }, [step, paused, reduce, go])

  const id = STEPS[step].id
  return (
    <section aria-labelledby="tm-show" className="tm-app relative overflow-hidden px-4 py-14 sm:px-6" style={{ background: 'var(--tm-soft)' }}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-6 h-72 w-72 rounded-full bg-violet-500/15 blur-[90px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-sky-400/15 blur-[90px]" />
      <div className="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1fr_auto] md:gap-16">
        <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55 }}>
          <p className="tm-eyebrow" style={{ color: 'var(--tm-brand)' }}>See it in action</p>
          <h2 id="tm-show" className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">From a new address to a clean slate in minutes</h2>
          <ol className="mt-7 overflow-hidden rounded-[1.4rem] border backdrop-blur-xl" style={{ background: 'color-mix(in srgb, var(--tm-bg) 78%, transparent)', borderColor: 'var(--tm-line)', boxShadow: '0 1px 0 rgba(255,255,255,.6) inset, 0 18px 40px -22px rgba(30,41,99,.35)' }}>
            {STEPS.map((s, i) => {
              const on = i === step
              return (
                <li key={s.id} style={i ? { borderTop: '1px solid var(--tm-line)' } : undefined}>
                  <button type="button" onClick={() => go(i)} aria-current={on ? 'step' : undefined} className="relative flex w-full items-start gap-3.5 px-4 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset">
                    {on ? <motion.span layoutId="tm-row" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }} className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--tm-brand) 9%, transparent)' }} aria-hidden="true" /> : null}
                    <span className="relative grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[12.5px] font-semibold transition-colors duration-300" style={on ? { background: 'var(--tm-brand)', color: '#fff' } : { background: 'color-mix(in srgb, var(--tm-mute) 16%, transparent)', color: 'var(--tm-mute)' }}>{i + 1}</span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block text-[15.5px] font-semibold leading-[26px] tracking-tight transition-colors duration-300" style={{ color: on ? 'var(--tm-text)' : 'var(--tm-mute)' }}>{s.title}</span>
                      <AnimatePresence initial={false}>
                        {on ? <motion.span initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="block overflow-hidden text-[14px] leading-6" style={{ color: 'var(--tm-mute)' }}>{s.text}</motion.span> : null}
                      </AnimatePresence>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="mx-auto w-full max-w-[300px]">
          <div className="relative rounded-[2.4rem] p-[9px]" style={{ background: 'linear-gradient(160deg,#1e293b,#0b1120)', boxShadow: '0 40px 80px -30px rgba(49,46,129,.6), inset 0 0 0 1px rgba(255,255,255,.12)' }}>
            <div className="absolute left-1/2 top-[14px] z-10 h-[18px] w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
            <div className="tm-app relative overflow-hidden rounded-[1.9rem]" style={{ background: 'var(--tm-bg)', minHeight: 420 }}>
              <div className="flex items-center justify-between px-5 pb-1 pt-4 text-[11px] font-semibold" style={{ color: 'var(--tm-mute)' }}><span>9:41</span><span aria-hidden="true">●●●</span></div>
              <div className="px-4 pb-5 pt-5">
                <div className="mb-3 flex items-center justify-between"><span className="font-display text-[17px] font-bold">Inbox</span><span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--tm-soft)', color: 'var(--tm-mute)' }}>Sample</span></div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={id} initial={{ opacity: 0, x: reduce ? 0 : 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduce ? 0 : -28 }} transition={{ duration: 0.3 }}>
                    {id === 'address' ? <AddressView reduce={reduce} /> : null}
                    {id === 'arrive' ? <ul className="space-y-2">{MAILS.map((m, i) => <MailRow key={m.from} m={m} i={i} />)}</ul> : null}
                    {id === 'otp' ? <OtpView reduce={reduce} /> : null}
                    {id === 'erase' ? <EraseView reduce={reduce} /> : null}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
