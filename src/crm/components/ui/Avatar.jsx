import { cn } from '../../utils/cn.js'

export default function Avatar({ name = 'User', className }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  return (
    <div
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-semibold text-white shadow-glow',
        className,
      )}
      aria-label={name}
      title={name}
    >
      {initials || 'U'}
    </div>
  )
}

