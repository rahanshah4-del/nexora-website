import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineCheck } from 'react-icons/hi2'

const ACTIVATION_WAIT_MS = 60000

/**
 * Full-screen welcome shown once after a successful Polar checkout (/app?checkout=success).
 * The plan is switched on by the Polar webhook, which can land a few seconds after the redirect, so the card
 * first says "activating" and flips to "Welcome" the moment the workspace shows an active paid plan.
 */
export default function CheckoutSuccessWelcome({ open, activated, planLabel = 'your plan', onClose }) {
  const [waitedTooLong, setWaitedTooLong] = useState(false)

  useEffect(() => {
    if (!open || activated) return undefined
    const timer = setTimeout(() => setWaitedTooLong(true), ACTIVATION_WAIT_MS)
    return () => clearTimeout(timer)
  }, [open, activated])

  const title = activated ? `Welcome to Nexora ${planLabel}` : 'Payment received'
  const body = activated
    ? 'Your subscription is active. Everything in your plan is unlocked and ready to use.'
    : waitedTooLong
      ? 'Your payment went through. Activation is taking longer than usual — refresh this page in a minute. If it still shows no plan, contact support and we will fix it right away.'
      : 'Activating your plan. This takes a few seconds.'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-success-title"
        >
          <motion.div
            className="w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-[0_30px_90px_-20px_rgba(15,23,42,0.55)]"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              {activated ? (
                <motion.span
                  className="absolute inset-0 rounded-full bg-emerald-400/30"
                  initial={{ scale: 0.6, opacity: 0.9 }}
                  animate={{ scale: 1.9, opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut', repeat: 1 }}
                />
              ) : null}
              <motion.div
                key={activated ? 'done' : 'wait'}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full ${activated ? 'bg-emerald-500 shadow-[0_0_32px_rgba(16,185,129,0.45)]' : 'bg-slate-100'}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                {activated ? (
                  <HiOutlineCheck className="h-10 w-10 text-white" strokeWidth={3} />
                ) : (
                  <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-900" aria-hidden="true" />
                )}
              </motion.div>
            </div>
            <h2 id="checkout-success-title" className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{body}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 text-[15px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
            >
              {activated ? 'Get started' : 'Continue to dashboard'}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
