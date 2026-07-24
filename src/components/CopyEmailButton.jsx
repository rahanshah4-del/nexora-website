import { useState, useCallback, useRef } from 'react'
import { HiOutlineClipboard, HiOutlineCheck } from 'react-icons/hi2'

/**
 * A small professional copy button for email addresses.
 * Self-contained — renders its own inline toast on success.
 *
 * Usage:
 *   <CopyEmailButton email="support@nexorasolution.online" />
 */
export default function CopyEmailButton({ email, className = '' }) {
  const [state, setState] = useState('idle') // idle | copied | error
  const timerRef = useRef(null)

  const handleCopy = useCallback(async () => {
    if (state === 'copied') return

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(email)
      } else {
        // Graceful fallback for older browsers / non-HTTPS origins
        const textarea = document.createElement('textarea')
        textarea.value = email
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (!success) throw new Error('execCommand failed')
      }

      setState('copied')
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setState('idle'), 2000)
    }
  }, [email, state])

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleCopy}
        disabled={state === 'copied'}
        className={`
          ml-1.5 inline-flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center
          rounded-md border transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1
          active:scale-90
          ${state === 'copied'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400'
            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300'
          }
        `}
        aria-label={`Copy ${email} to clipboard`}
        title={state === 'copied' ? 'Copied!' : `Copy ${email}`}
      >
        {state === 'copied' ? (
          <HiOutlineCheck className="h-3 w-3" />
        ) : (
          <HiOutlineClipboard className="h-3 w-3" />
        )}
      </button>
      {state === 'copied' ? (
        <span
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
          aria-live="polite"
        >
          Copied!
        </span>
      ) : null}
      {state === 'error' ? (
        <span
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
          aria-live="polite"
        >
          Failed
        </span>
      ) : null}
    </span>
  )
}
