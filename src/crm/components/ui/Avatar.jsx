import { cn } from '../../utils/cn.js'

const avatarEmojis = ['👤', '💼', '🚀', '✨', '📊', '🧩', '⭐', '🌐']

function emojiForName(name) {
  const source = String(name || 'User')
  const index = Array.from(source).reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarEmojis.length
  return avatarEmojis[index]
}

export default function Avatar({ name = 'User', className }) {
  return (
    <div
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-semibold text-white shadow-glow',
        className,
      )}
      aria-label={name}
      title={name}
    >
      {emojiForName(name)}
    </div>
  )
}
