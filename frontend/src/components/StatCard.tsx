import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format'

interface StatCardProps {
  label: string
  value: number | string | null | undefined
  icon: LucideIcon
  iconClassName?: string
  hint?: React.ReactNode
  /** Percentage change vs. a previous period; positive renders as an increase. */
  change?: number | null
  changeLabel?: string
}

export function StatCard({ label, value, icon: Icon, iconClassName, hint, change, changeLabel }: StatCardProps) {
  return (
    <Card className="gap-3 p-4 shadow-xs ring-border">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <span className={cn('flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand', iconClassName)}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      {value === null || value === undefined ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <p className="text-[28px] leading-none font-semibold tracking-tight text-foreground">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
      )}
      <div className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
        {change !== undefined && change !== null && (
          <span className={cn('inline-flex items-center gap-0.5 font-medium', change >= 0 ? 'text-emerald-700' : 'text-red-700')}>
            {change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
        {changeLabel && <span>{changeLabel}</span>}
        {hint}
      </div>
    </Card>
  )
}
