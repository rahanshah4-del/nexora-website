import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineArrowRight, HiOutlineXMark } from 'react-icons/hi2'

const CATEGORY_LABELS = {
  product: 'Product',
  feature: 'Feature',
  ai: 'AI',
  finance: 'Finance',
  analytics: 'Analytics',
  security: 'Security',
  automation: 'Automation',
}

export default function AIHighlightTooltip() {
  const [popover, setPopover] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const container = document.createElement('div')
    container.id = 'nexora-ai-highlight-root'
    document.body.appendChild(container)
    containerRef.current = container

    const handleClick = (e) => {
      const highlightEl = e.target.closest('.ai-highlight')
      if (!highlightEl) {
        // Click outside — close popover
        if (popover && !e.target.closest('#nexora-ai-highlight-root')) {
          setPopover(null)
        }
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const text = highlightEl.textContent?.trim() || ''
      const category = highlightEl.dataset.category || 'feature'
      const explanation = highlightEl.dataset.explanation || ''
      const link = highlightEl.dataset.link || ''
      const color = highlightEl.dataset.color || ''
      const id = highlightEl.dataset.highlightId || ''

      if (popover?.id === id) {
        setPopover(null) // toggle off if same term clicked
        return
      }

      const rect = highlightEl.getBoundingClientRect()
      setPopover({
        id,
        text,
        category,
        explanation,
        link,
        color,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
        topEdge: rect.top,
      })
    }

    const handleKey = (e) => {
      if (e.key === 'Escape') setPopover(null)
    }

    document.addEventListener('click', handleClick, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('keydown', handleKey)
      if (container) document.body.removeChild(container)
    }
  }, [popover])

  const close = useCallback(() => setPopover(null), [])

  if (!containerRef.current || !popover) return null

  // Position: prefer below term, flip above if too close to bottom
  const cardWidth = 320
  const cardHeight = 220
  let left = Math.min(Math.max(popover.x - cardWidth / 2, 8), window.innerWidth - cardWidth - 8)
  let top = popover.y
  if (top + cardHeight > window.innerHeight - 16) {
    top = popover.topEdge - cardHeight - 8 // flip above
    if (top < 8) top = 8
  }

  const categoryLabel = CATEGORY_LABELS[popover.category] || popover.category

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={popover.id}
        initial={{ opacity: 0, y: 10, scale: 0.93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed z-[201] w-80 rounded-2xl border border-white/20 bg-white/88 p-4 shadow-[0_20px_60px_-16px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
        style={{ left, top, WebkitBackdropFilter: 'saturate(180%) blur(20px)' }}
      >
        {/* Arrow — points toward the term */}
        <div
          className={`absolute h-3 w-3 rotate-45 border-l border-t border-white/20 bg-white/90 ${
            top < popover.topEdge ? '-bottom-1.5 left-1/2 -translate-x-1/2' : '-top-1.5 left-1/2 -translate-x-1/2'
          }`}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100/80 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
        >
          <HiOutlineXMark className="h-3.5 w-3.5" />
        </button>

        {/* Header with AI logo + category badge */}
        <div className="flex items-center gap-2.5 pr-6">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
            <span
              className="absolute inset-0 animate-pulse rounded-lg opacity-60 blur-sm"
              style={{ background: popover.color || 'linear-gradient(135deg, #4facfe, #00f2fe)', animationDuration: '2.5s' }}
            />
            <img
              src="/nexora-ai-logo.png"
              alt="Nexora AI"
              className="relative h-7 w-7 rounded-lg object-cover shadow-sm ring-1 ring-white/60"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#1d1d1f] truncate">
              {popover.text}
            </p>
            <p className="text-[11px] font-medium text-[#8e8e93]">{categoryLabel}</p>
          </div>
        </div>

        {/* Explanation */}
        {popover.explanation ? (
          <p className="mt-3 text-[13px] leading-[1.55] text-[#3c3c43]">
            {popover.explanation}
          </p>
        ) : null}

        {/* Category badge with gradient */}
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
          style={{ background: popover.color || 'linear-gradient(135deg, #667eea, #764ba2)' }}
        >
          🤖 Nexora AI · {categoryLabel}
        </div>

        {/* Read More link */}
        {popover.link ? (
          <a
            href={popover.link}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 px-3.5 py-2 text-[12px] font-semibold text-violet-700 transition hover:from-violet-100 hover:to-purple-100 active:scale-[0.97]"
          >
            Read More
            <HiOutlineArrowRight className="h-3.5 w-3.5" />
          </a>
        ) : null}

        {/* Nexora AI brand footer */}
        <div className="mt-3 flex items-center gap-1.5 border-t border-[#e5e5ea] pt-2.5">
          <svg className="h-3 w-3 text-violet-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" />
          </svg>
          <p className="text-[10px] font-medium text-[#aeaeb2]">Nexora AI · Smart Highlight</p>
        </div>
      </motion.div>
    </AnimatePresence>,
    containerRef.current,
  )
}
