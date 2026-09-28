import { useElementSize } from '../ui/hooks.js'

export const MM_TO_PX = 96 / 25.4

/**
 * Shows `children` (a paper at its real CSS size) scaled by `scale`.
 *
 * A CSS transform does not change an element's layout box, so a scaled paper
 * left in normal flow would still take its full unscaled height and leave a
 * large empty area under the preview. Here the paper is taken out of flow
 * (absolute) and the wrapper gets exactly the scaled size, measured with a
 * ResizeObserver (contentRect ignores transforms, so it is the true height).
 *
 * @param {{ scale: number, widthPx: number, estimatedHeightPx?: number, className?: string, paperClassName?: string, children: import('react').ReactNode }} props
 */
export default function ScaledPaper({ scale, widthPx, estimatedHeightPx = 0, className = '', paperClassName = '', children }) {
  const [ref, size] = useElementSize()
  const height = size.height || estimatedHeightPx
  return (
    <div className={`relative ${className}`} style={{ width: widthPx * scale, height: height * scale }} data-analytics-ignore>
      <div ref={ref} className={`absolute left-0 top-0 origin-top-left ${paperClassName}`} style={{ width: widthPx, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}
