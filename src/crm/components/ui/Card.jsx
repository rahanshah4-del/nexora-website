import { cn } from '../../utils/cn.js'

export default function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'glass min-w-0 overflow-hidden rounded-[1.35rem] transition-colors duration-200 ease-out hover:border-sky-100 hover:bg-white',
        className,
      )}
      {...props}
    />
  )
}
