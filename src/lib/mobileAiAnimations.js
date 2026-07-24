/**
 * Mobile Animation Observer — ultra-lightweight.
 * Only fires IntersectionObserver. No MutationObserver.
 * Threshold 0.01 = trigger as soon as 1% visible (reduces missed elements).
 */

let observer = null
let visHandler = null
let initialized = false

export function initMobileAiAnimations() {
  if (initialized) return
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const mq = window.matchMedia('(max-width: 767px)')
  if (!mq.matches) return

  initialized = true

  observer = new IntersectionObserver(
    entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('ai-visible')
          observer.unobserve(e.target) // only once
        }
      }
    },
    { rootMargin: '100px 0px', threshold: 0.01 },
  )

  document.querySelectorAll('[data-ai]').forEach(el => observer.observe(el))

  visHandler = () => {
    document.documentElement.classList.toggle('ai-animations-paused', document.visibilityState === 'hidden')
  }
  document.addEventListener('visibilitychange', visHandler)
}
