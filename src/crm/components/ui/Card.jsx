import { cn } from '../../utils/cn.js'

export default function Card({ className, ...props }) {
  return <div className={cn('glass rounded-2xl min-w-0', className)} {...props} />
}

