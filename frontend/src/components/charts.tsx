import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { TimeSeriesPoint } from '@/types/api'
import { formatNumber } from '@/utils/format'

export const chartColors = {
  boarding: 'var(--chart-boarding)',
  exit: 'var(--chart-exit)',
  critical: 'var(--status-critical)',
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  grid: '#e6e9ef',
  axis: '#7b8394',
}

export const axisProps = {
  tick: { fill: chartColors.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

/** Shared hover card: series swatch + label in ink, value right-aligned. */
export function ChartTooltip({ active, payload, label, formatLabel }: Partial<TooltipContentProps<ValueType, NameType>> & {
  formatLabel?: (label: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-foreground">{formatLabel ? formatLabel(String(label)) : label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-sm" style={{ background: entry.color }} aria-hidden />
              {entry.name}
            </span>
            <span className="tabular font-medium text-foreground">{formatNumber(Number(entry.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2.5 rounded-sm" style={{ background: color }} aria-hidden />
      {label}
    </span>
  )
}

/** Grouped bars of accepted boardings vs. exits per period. */
export function BoardingExitChart({ data, formatLabel, height = 280 }: {
  data: TimeSeriesPoint[]
  formatLabel: (periodStart: string) => string
  height?: number
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        <LegendItem color={chartColors.boarding} label="Boardings" />
        <LegendItem color={chartColors.exit} label="Exits" />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barGap={2} barCategoryGap="24%" margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={chartColors.grid} />
          <XAxis dataKey="periodStart" tickFormatter={formatLabel} {...axisProps} minTickGap={12} />
          <YAxis allowDecimals={false} {...axisProps} width={44} />
          <Tooltip
            cursor={{ fill: 'rgba(37, 87, 214, 0.06)' }}
            content={(props) => <ChartTooltip {...props} formatLabel={formatLabel} />}
          />
          <Bar dataKey="boardings" name="Boardings" fill={chartColors.boarding} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="exits" name="Exits" fill={chartColors.exit} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
