/**
 * Pure helpers and constants for the module intro videos (no React). Components
 * live in fx.jsx, kept apart so each file follows the react-refresh rule.
 */

export const W = 1280
export const H = 720

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const ease = (x) => 1 - (1 - clamp(x)) ** 3
export const easeIO = (x) => { const c = clamp(x); return c < 0.5 ? 4 * c * c * c : 1 - ((-2 * c + 2) ** 3) / 2 }
export const easeBack = (x) => { const c = clamp(x); const s = 1.70158; return 1 + (s + 1) * (c - 1) ** 3 + s * (c - 1) ** 2 }
export const seg = (t, a, b) => clamp((t - a) / (b - a))
export const lerp = (a, b, k) => a + (b - a) * k
export const fmt = (n) => Math.round(n).toLocaleString('en-US')
/** 1 while t is inside [a, b], fading in and out over f seconds. */
export const win = (t, a, b, f = 0.5) => ease(seg(t, a, a + f)) * (1 - ease(seg(t, b - f, b)))

export const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'
export const MONO = '"JetBrains Mono", "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace'

/** [main, deep, soft glow] per module accent. */
export const ACCENT = {
  orange: ['#fb923c', '#f97316', 'rgba(249,115,22,.38)'],
  blue: ['#60a5fa', '#3b82f6', 'rgba(59,130,246,.38)'],
  emerald: ['#34d399', '#10b981', 'rgba(16,185,129,.36)'],
  violet: ['#a78bfa', '#8b5cf6', 'rgba(139,92,246,.4)'],
  indigo: ['#818cf8', '#6366f1', 'rgba(99,102,241,.4)'],
  cyan: ['#22d3ee', '#06b6d4', 'rgba(6,182,212,.36)'],
  amber: ['#fbbf24', '#f59e0b', 'rgba(245,158,11,.36)'],
  rose: ['#fb7185', '#f43f5e', 'rgba(244,63,94,.36)'],
}
export const INK = '#e8eefc'
export const MUTE = '#8b9bbd'
export const GOOD = '#34d399'
export const BAD = '#fb7185'

/** Count-up number: eased from `from` to `to` between a and b. */
export function countAt(t, a, b, to, from = 0) {
  return lerp(from, to, ease(seg(t, a, b)))
}
