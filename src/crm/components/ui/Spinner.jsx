import { cn } from '../../utils/cn.js'

export default function Spinner({ className }) {
  return (
    <div
      className={cn(
        'h-5 w-5 rounded-full border-2 border-indigo-500/25 border-t-indigo-500',
        className,
      )}
      aria-label="Loading"
      role="status"
    />
  )
}
