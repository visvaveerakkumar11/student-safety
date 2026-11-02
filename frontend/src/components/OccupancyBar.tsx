import { cn } from '@/lib/utils'

/** Onboard vs. capacity. Turns amber at 80% and red when full; the numbers are always shown as text. */
export function OccupancyBar({ onboard, capacity, className, showLabel = true }: {
  onboard: number
  capacity: number
  className?: string
  showLabel?: boolean
}) {
  const pct = capacity > 0 ? Math.min(100, Math.round((onboard / capacity) * 100)) : 0
  const color = pct >= 100 ? 'bg-status-critical' : pct >= 80 ? 'bg-status-warning' : 'bg-brand'
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {showLabel && (
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">Occupancy</span>
          <span className="tabular font-medium text-foreground">
            {onboard}/{capacity} <span className="font-normal text-muted-foreground">· {pct}%</span>
          </span>
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={onboard}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-label={`${onboard} of ${capacity} seats occupied`}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
