import { cn } from '../../utils/cn.js'

export default function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'glass min-w-0 overflow-hidden rounded-2xl shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]',
        className,
      )}
      {...props}
    />
  )
}
