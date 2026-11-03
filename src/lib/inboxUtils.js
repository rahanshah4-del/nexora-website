/** Small pure helpers for the Control Centre Inbox (unit tested in tests/inbox-utils.test.mjs). */

/** "just now", "5m ago", "3h ago", "2d ago", then a short date. */
export function relativeTime(value, now = Date.now()) {
  const time = value ? new Date(value).getTime() : NaN
  if (!Number.isFinite(time)) return ''
  const seconds = Math.max(0, Math.round((now - time) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(time).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: new Date(time).getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' })
}

/** "5s ago" style for the live badge. */
export function secondsAgo(then, now = Date.now()) {
  if (!then) return ''
  const s = Math.max(0, Math.round((now - then) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.round(s / 60)}m ago`
}

export function initials(name = '') {
  const clean = String(name).replace(/[<>"()]/g, ' ').trim().split('@')[0]
  if (!clean) return '?'
  const words = clean.split(/[\s@._-]+/).filter(Boolean)
  const letters = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)) || '?'
  return letters.toUpperCase()
}

const AVATAR_TONES = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700', 'bg-fuchsia-100 text-fuchsia-700', 'bg-lime-100 text-lime-800']
export function avatarTone(seed = '') {
  let hash = 0
  for (const char of String(seed).toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}

/** The email after/before `currentId` in `list` (stops at the ends). */
export function neighbourId(list, currentId, step) {
  if (!list.length) return ''
  const at = list.findIndex((item) => item.id === currentId)
  if (at === -1) return list[0].id
  return list[Math.min(list.length - 1, Math.max(0, at + step))].id
}

/**
 * Keyboard shortcut -> action name, or ''. Ignored while typing in a field and when a modifier is held,
 * except Ctrl/Cmd+Enter which means "send".
 */
export function shortcutFor(event) {
  const target = event?.target
  const tag = String(target?.tagName || '').toLowerCase()
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable === true
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) return 'send'
  if (event.key === 'Escape') return 'escape'
  if (typing || event.ctrlKey || event.metaKey || event.altKey) return ''
  switch (event.key) {
    case 'j': case 'ArrowDown': return 'next'
    case 'k': case 'ArrowUp': return 'previous'
    case 'e': return 'archive'
    case '#': case 'Delete': return 'trash'
    case 's': return 'star'
    case 'u': return 'unread'
    case 'r': return 'reply'
    case 'c': return 'compose'
    case 'x': return 'select'
    case '/': return 'search'
    case '?': return 'help'
    default: return ''
  }
}

export const SHORTCUT_HELP = [
  ['j / k', 'Next / previous email'],
  ['r', 'Reply'],
  ['e', 'Archive'],
  ['#', 'Move to trash'],
  ['s', 'Star or unstar'],
  ['u', 'Mark as unread'],
  ['x', 'Select for bulk actions'],
  ['c', 'Write a new email'],
  ['/', 'Search'],
  ['Ctrl/Cmd + Enter', 'Send reply'],
  ['Esc', 'Close'],
]

/** Toggle one id in a Set (returns a new Set). */
export function toggleId(set, id) {
  const next = new Set(set)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** "> quoted" copy of the original message for a reply, kept short. */
export function quoteOriginal({ from = '', date = '', body = '' }, max = 1500) {
  const text = String(body).trim().slice(0, max)
  if (!text) return ''
  const quoted = text.split(/\r?\n/).map((line) => `> ${line}`).join('\n')
  return `On ${date}, ${from} wrote:\n${quoted}`
}

export const draftKey = (emailId) => `nexora:inboxDraft:${emailId}`
