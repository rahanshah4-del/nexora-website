/**
 * Mobile Premium Scroll Animations
 * Observes [data-ai] elements, adds .ai-visible on enter.
 * All animation logic is in CSS. This is just the trigger.
 *
 * Bundle: ~0.5 KB gzipped.
 */

let observer = null
let mutObs = null
let visHandler = null
let initialized = false

export function initMobileAiAnimations() {
  if (initialized) return
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const mq = window.matchMedia('(max-width: 767px)')
  if (!mq.matches) {
    mq.addEventListener('change', e => { if (e.matches) initMobileAiAnimations() })
    return
  }

  initialized = true

  observer = new IntersectionObserver(
    entries => {
      for (const e of entries) {
        if (e.isIntersecting) e.target.classList.add('ai-visible')
      }
    },
    { rootMargin: '60px 0px', threshold: 0.05 },
  )

  document.querySelectorAll('[data-ai]').forEach(el => observer.observe(el))

  if (typeof MutationObserver !== 'undefined') {
    mutObs = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue
          if (n.hasAttribute?.('data-ai')) observer.observe(n)
          n.querySelectorAll?.('[data-ai]')?.forEach(el => observer.observe(el))
        }
      }
    })
    mutObs.observe(document.body, { childList: true, subtree: true })
  }

  visHandler = () => {
    document.documentElement.classList.toggle('ai-animations-paused', document.visibilityState === 'hidden')
  }
  document.addEventListener('visibilitychange', visHandler)
}
