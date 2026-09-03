import { cn } from '../../utils/cn.js'

// A curated set of premium-feeling gradients — picked per user (by a stable
// hash of their name) so avatars stay visually distinct across a team
// without looking random, unlike a name-hashed emoji (e.g. a bar-chart icon
// for a person's profile reads as an unrelated stock icon, not an avatar).
const gradients = [
  'from-indigo-500 via-violet-500 to-fuchsia-500',
  'from-sky-500 via-blue-500 to-indigo-600',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-amber-500 via-orange-500 to-rose-500',
  'from-fuchsia-500 via-pink-500 to-rose-500',
  'from-violet-500 via-purple-500 to-indigo-600',
]

function hashName(name) {
  return Array.from(String(name || 'User')).reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function gradientForName(name) {
  return gradients[hashName(name) % gradients.length]
}

function initialsForName(name) {
  const parts = String(name || 'User').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name = 'User', className }) {
  return (
    <div
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br text-sm font-bold uppercase tracking-wide text-white shadow-glow',
        gradientForName(name),
        className,
      )}
      aria-label={name}
      title={name}
    >
      {initialsForName(name)}
    </div>
  )
}
