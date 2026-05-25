import { cn } from '../../utils/cn.js'

export default function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'glass min-w-0 overflow-hidden rounded-[1.35rem] shadow-[0_22px_70px_-48px_rgba(15,23,42,0.42)] transition duration-300 ease-out hover:-translate-y-0.5 hover:border-sky-100 hover:bg-white hover:shadow-[0_28px_80px_-48px_rgba(14,165,233,0.34)]',
        className,
      )}
      {...props}
    />
  )
}
