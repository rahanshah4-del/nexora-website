import { cn } from '../../utils/cn.js'

/**
 * FeatureBadge — "NEW" pill badge for feature discovery.
 *
 * Renders a small gradient pill with pulse animation.
 * Automatically handles light / dark mode.
 * RTL-safe via logical CSS properties.
 *
 * Props:
 *   className – additional classes (spacing, positioning)
 *   label     – override text (default "NEW")
 *   noPulse   – disable the pulse animation
 */
export default function FeatureBadge({ className, label = 'NEW', noPulse = false }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        // Base: pill shape, gradient, shadow
        'inline-flex items-center justify-center',
        'rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none',
        'select-none pointer-events-none',
        // Red→Orange gradient
        'bg-gradient-to-r from-rose-500 to-orange-500',
        // White text, small shadow
        'text-white shadow-sm',
        // Pulse animation (GPU friendly — uses transform/opacity only)
        !noPulse && 'animate-feature-pulse',
        // Dark mode: slightly brighter
        'dark:from-rose-400 dark:to-orange-400 dark:shadow-none',
        className,
      )}
    >
      {label}
    </span>
  )
}
