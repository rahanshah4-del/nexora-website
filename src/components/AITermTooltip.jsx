import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { findDefinition } from '../lib/blogGlossary.js'

export default function AITermTooltip() {
  const [tooltip, setTooltip] = useState(null)
  const containerRef = useRef(null)
  const hideTimer = useRef(null)

  useEffect(() => {
    const container = document.createElement('div')
    container.id = 'nexora-ai-tooltip-root'
    document.body.appendChild(container)
    containerRef.current = container

    let currentTarget = null

    const handleOver = (e) => {
      // Check if mouse is over a highlighted term OR the tooltip itself
      const term = e.target.closest('.blog-highlight, .blog-term')
      const isTooltip = e.target.closest('#nexora-ai-tooltip-root')

      if (isTooltip) {
        if (hideTimer.current) clearTimeout(hideTimer.current)
        return
      }

      if (!term) return
      if (term === currentTarget) return
      currentTarget = term

      if (hideTimer.current) clearTimeout(hideTimer.current)

      const text = (term.textContent || '').trim()
      if (text.length < 2) return

      const def = findDefinition(text) || {
        title: text,
        definition: 'This key point was highlighted by Nexora AI as important for your business understanding.',
        why: 'AI automatically detected this as a significant insight worth your attention.',
      }

      const rect = term.getBoundingClientRect()
      setTooltip({
        text,
        definition: def,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 6,
      })
    }

    const handleOut = (e) => {
      const term = e.target.closest('.blog-highlight, .blog-term')
      const isTooltip = e.target.closest('#nexora-ai-tooltip-root')
      if (term && !isTooltip) {
        currentTarget = null
      }
      // Delay hiding — if mouse moves to tooltip, handleOver will cancel
      hideTimer.current = setTimeout(() => setTooltip(null), 200)
    }

    document.addEventListener('mouseover', handleOver, true)
    document.addEventListener('mouseout', handleOut, true)

    return () => {
      document.removeEventListener('mouseover', handleOver, true)
      document.removeEventListener('mouseout', handleOut, true)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      document.body.removeChild(container)
    }
  }, [])

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  const startHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setTooltip(null), 200)
  }, [])

  if (!containerRef.current || !tooltip) return null

  const left = Math.min(Math.max(tooltip.x - 160, 8), window.innerWidth - 328)
  const top = Math.min(tooltip.y, window.innerHeight - 300)

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={tooltip.text}
        initial={{ opacity: 0, y: 6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.95 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={cancelHide}
        onMouseLeave={startHide}
        className="fixed z-[200] w-80 rounded-2xl border border-white/20 bg-white/85 p-4 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
        style={{ left, top, WebkitBackdropFilter: 'saturate(180%) blur(20px)' }}
      >
        {/* Arrow */}
        <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-white/20 bg-white/85" />

        {/* Header with AI logo */}
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
            <span className="absolute inset-0 animate-pulse rounded-lg bg-gradient-to-br from-violet-400/40 via-purple-400/30 to-fuchsia-400/40 blur-sm" style={{ animationDuration: '2.5s' }} />
            <img src="/nexora-ai-logo.png" alt="Nexora AI" className="relative h-8 w-8 rounded-lg object-cover shadow-sm ring-1 ring-white/60" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#1d1d1f] truncate">
              {tooltip.definition.title || tooltip.text}
            </p>
            <p className="text-[11px] font-medium text-[#8e8e93] truncate">{tooltip.text}</p>
          </div>
        </div>

        {/* Definition */}
        <p className="mt-3 text-[13px] leading-[1.55] text-[#3c3c43]">
          {tooltip.definition.definition}
        </p>

        {/* Why it matters */}
        {tooltip.definition.why ? (
          <div className="mt-3 rounded-xl bg-gradient-to-br from-violet-50/80 to-purple-50/80 px-3.5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-violet-600">Why it matters</p>
            <p className="mt-0.5 text-[12px] font-medium leading-[1.55] text-violet-900">
              {tooltip.definition.why}
            </p>
          </div>
        ) : null}

        {/* Nexora AI brand */}
        <div className="mt-3 flex items-center gap-1.5 border-t border-[#e5e5ea] pt-2.5">
          <svg className="h-3 w-3 text-violet-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" />
          </svg>
          <p className="text-[10px] font-medium text-[#aeaeb2]">Nexora AI</p>
        </div>
      </motion.div>
    </AnimatePresence>,
    containerRef.current,
  )
}
