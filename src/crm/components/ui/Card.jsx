import { memo } from 'react'
import { cn } from '../../utils/cn.js'

function Card({ className, ...props }) {
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

export default memo(Card)
