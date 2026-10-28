/**
 * Pure helpers for the order chat (no React, no network): how messages group into bubbles,
 * the time labels, file sizes and kinds, and the emoji picker's data.
 */

export const CHAT_MAX_CHARS = 2000
export const CHAT_MAX_FILES = 4
export const CHAT_MAX_FILE_BYTES = 5_000_000
export const CHAT_FILE_ACCEPT = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv,.docx,.xlsx,.zip'
const GROUP_GAP_MS = 3 * 60 * 1000
const STAMP_GAP_MS = 60 * 60 * 1000

export function formatBytes(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1000) return `${n} B`
  if (n < 1_000_000) return `${Math.round(n / 100) / 10} KB`
  return `${Math.round(n / 100_000) / 10} MB`
}

const EXT_KIND = { png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', pdf: 'pdf', txt: 'text', csv: 'sheet', xlsx: 'sheet', docx: 'doc', zip: 'zip' }
export const fileExt = (name) => String(name || '').toLowerCase().split('.').pop() || ''
export const fileKind = (file) => (String(file?.type || '').startsWith('image/') ? 'image' : EXT_KIND[fileExt(file?.name)] || 'file')

/** Why a file cannot be sent, or '' when it can. Mirrors the server so people learn before uploading. */
export function fileProblem(file) {
  if (!file) return 'No file.'
  if (!(fileExt(file.name) in EXT_KIND)) return 'This kind of file cannot be sent. Use an image, PDF, text, Word, Excel or ZIP file.'
  if (file.size === 0) return 'This file is empty.'
  if (file.size > CHAT_MAX_FILE_BYTES) return 'This file is bigger than 5 MB.'
  return ''
}

const pad = (n) => String(n).padStart(2, '0')
const clock = (d) => { const h = d.getHours(); return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}` }
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Today 4:59 PM", "Yesterday 9:10 AM", "Mon 26 Oct, 3:00 PM" (iMessage style). */
export function stampLabel(value, now = new Date()) {
  const d = new Date(value || '')
  if (Number.isNaN(d.getTime())) return ''
  if (dayKey(d) === dayKey(now)) return `Today ${clock(d)}`
  const yesterday = new Date(now.getTime() - 86_400_000)
  if (dayKey(d) === dayKey(yesterday)) return `Yesterday ${clock(d)}`
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`}, ${clock(d)}`
}

/**
 * Chat rows for display: a time stamp before the first message and after every long pause,
 * and each message marked `first` / `last` of its run (same sender, a few minutes apart), so only the last
 * bubble of a run gets the tail.
 */
export function buildRows(messages = [], mine = 'client') {
  const rows = []
  let prev = null
  messages.forEach((m, i) => {
    const at = new Date(m.at).getTime()
    const prevAt = prev ? new Date(prev.at).getTime() : 0
    const stamp = !prev || !Number.isFinite(at) || at - prevAt >= STAMP_GAP_MS
    if (stamp) rows.push({ type: 'stamp', key: `s-${m.id}`, label: stampLabel(m.at) })
    const next = messages[i + 1]
    const nextAt = next ? new Date(next.at).getTime() : 0
    const joinsPrev = Boolean(prev) && !stamp && prev.from === m.from && at - prevAt < GROUP_GAP_MS
    const joinsNext = Boolean(next) && next.from === m.from && nextAt - at < GROUP_GAP_MS && nextAt - at < STAMP_GAP_MS
    rows.push({ type: 'message', key: m.id, message: m, own: m.from === mine, first: !joinsPrev, last: !joinsNext })
    prev = m
  })
  return rows
}

// ---- emoji picker data: a small, well chosen set instead of a 3,000 emoji dump

export const EMOJI_GROUPS = Object.freeze([
  { id: 'smileys', label: 'Smileys', icon: '😊', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎', '🤩', '🥳', '🤗', '🤔', '🫡', '😐', '😶', '🙄', '😏', '😴', '😌', '😢', '😭', '😤', '😮', '😳', '🥺', '😬', '🤯', '😇'] },
  { id: 'gestures', label: 'Gestures', icon: '👍', emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤝', '🙏', '👏', '🙌', '💪', '👋', '🤙', '👀', '✅', '❌', '⚠️', '❓', '❗', '💯', '🔥', '✨', '🎉', '🎊', '🏆'] },
  { id: 'hearts', label: 'Hearts', icon: '❤️', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '💖', '💗', '💝', '😻', '🌹', '☀️', '🌙', '⭐', '🌈', '🍀'] },
  { id: 'work', label: 'Work', icon: '💼', emojis: ['💼', '💻', '🖥️', '📱', '🌐', '🔗', '🔒', '🔑', '⚙️', '🛠️', '🚀', '📈', '📊', '📌', '📎', '📁', '📝', '📧', '📞', '⏰', '📅', '💡', '🔍', '🎯'] },
])

const RECENT_KEY = 'geolint-chat-emoji'
export function loadRecentEmoji(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    const list = JSON.parse(storage?.getItem(RECENT_KEY) || '[]')
    return Array.isArray(list) ? list.filter((e) => typeof e === 'string').slice(0, 12) : []
  } catch {
    return []
  }
}
export function rememberEmoji(emoji, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  const next = [emoji, ...loadRecentEmoji(storage).filter((e) => e !== emoji)].slice(0, 12)
  try { storage?.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* private mode: recents just are not kept */ }
  return next
}

// ---- technical extras for the team side: rich text, receipts, search, previews, quick replies

/**
 * Splits message text into display parts: ```fenced code```, `inline code`, links (http and https only) and plain text.
 * Nothing is turned into HTML: the caller renders each part as text, so a message can never inject markup.
 */
export function parseRichText(input) {
  const text = String(input ?? '')
  const parts = []
  const push = (type, value, extra = {}) => { if (value) parts.push({ type, value, ...extra }) }
  const inline = (chunk) => {
    const re = /`([^`\n]+)`|(https?:\/\/[^\s<>"'`]+)/g
    let last = 0
    let m
    while ((m = re.exec(chunk))) {
      push('text', chunk.slice(last, m.index))
      if (m[1] !== undefined) push('inline', m[1])
      else {
        const url = m[2].replace(/[.,;:!?)\]}]+$/, '')
        push('link', url, { href: url })
        push('text', m[2].slice(url.length))
      }
      last = m.index + m[0].length
    }
    push('text', chunk.slice(last))
  }
  const fence = /```[^\S\n]*([A-Za-z0-9_+-]*)\n?([\s\S]*?)```/g
  let last = 0
  let m
  while ((m = fence.exec(text))) {
    inline(text.slice(last, m.index))
    push('code', m[2].replace(/\n$/, ''), { lang: m[1] || '' })
    last = m.index + m[0].length
  }
  inline(text.slice(last))
  return parts
}

/** Whether a message matches a search: its text or the name of one of its files, ignoring case. */
export function messageMatches(message, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  if (String(message?.text || '').toLowerCase().includes(q)) return true
  return (message?.files || []).some((f) => String(f.name || '').toLowerCase().includes(q))
}

/** The id of the last message `mine` sent and the receipt under it (null when receipts are off, i.e. otherReadAt is null): "Delivered", or "Read 5:10 PM" once the other side has opened the chat since. */
export function receiptFor(messages = [], mine = 'staff', otherReadAt = null, now = new Date()) {
  if (otherReadAt === null) return null
  const own = [...messages].reverse().find((m) => m.from === mine)
  if (!own) return null
  const read = Boolean(otherReadAt) && String(otherReadAt) >= String(own.at)
  return { id: own.id, read, label: read ? `Read ${stampLabel(otherReadAt, now).replace(/^Today /, '')}` : 'Delivered' }
}

/** The first message from the other side that the reader has not seen, for the "New messages" line. */
export function firstUnreadId(messages = [], mine = 'staff', readAt = '') {
  const seen = String(readAt || '')
  return messages.find((m) => m.from !== mine && String(m.at) > seen)?.id || ''
}

/** Every file in the chat, newest first, with who sent it. */
export function collectFiles(messages = [], mine = 'staff') {
  const out = []
  messages.forEach((m) => (m.files || []).forEach((f) => out.push({ ...f, at: m.at, own: m.from === mine, messageId: m.id })))
  return out.reverse()
}

/** How a file opens: in the viewer as an image, PDF or text, or as a plain download. */
export function previewKind(file) {
  const kind = fileKind(file)
  if (kind === 'image' || kind === 'pdf') return kind
  if (kind === 'text' || fileExt(file?.name) === 'csv') return 'text'
  return 'download'
}

export const PREVIEW_TEXT_BYTES = 200_000

/** One-tap replies for the team. They only fill the message box, so nothing is sent until a person presses send. */
export const STAFF_QUICK_REPLIES = Object.freeze([
  { label: 'Started', text: 'Thanks. I have started on your fix and will update you here as soon as the first changes are live.' },
  { label: 'Need access', text: 'To continue I need access to your site. Please share it in the way you chose at checkout. Do not send passwords here.' },
  { label: 'Need details', text: 'Can you share a bit more detail, or a screenshot of what you mean? That helps me get it right the first time.' },
  { label: 'Live now', text: 'The changes are live now. Please open your site, check it, and tell me here if anything looks off.' },
  { label: 'Re-scan', text: 'I will run a new GeoLint scan after the changes and send you the before and after scores.' },
  { label: 'Done', text: 'Everything is finished. If you are happy, nothing more is needed. If not, write here and I will fix it.' },
])
