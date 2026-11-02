import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BellRing, CheckCircle2, Clock, Radio, Send, ShieldCheck, ShieldX, XCircle, type LucideIcon } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { axisProps, BoardingExitChart, chartColors, ChartTooltip } from '@/components/charts'
import { OccupancyBar } from '@/components/OccupancyBar'
import { EmptyState, ErrorState } from '@/components/PageStates'
import { StatCard } from '@/components/StatCard'
import { useApi } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { analyticsApi, type Granularity } from '@/services/api'
import type { AnalyticsSummary, NotificationStatus } from '@/types/api'
import { daysAgo, formatDate, formatMonth, formatNumber, formatShortDay, notificationStatusLabel, rejectionReasonLabel, toIsoDate } from '@/utils/format'

const PRESETS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'custom', label: 'Custom' },
]

const labelFor: Record<Granularity, (d: string) => string> = {
  daily: formatShortDay,
  weekly: (d) => `Wk of ${formatShortDay(d)}`,
  monthly: formatMonth,
}

export default function AnalyticsPage() {
  const [preset, setPreset] = useState('30')
  const [customFrom, setCustomFrom] = useState(toIsoDate(daysAgo(13)))
  const [customTo, setCustomTo] = useState(toIsoDate(new Date()))
  const [granularity, setGranularity] = useState<Granularity>('daily')

  const from = preset === 'custom' ? customFrom : toIsoDate(daysAgo(Number(preset) - 1))
  const to = preset === 'custom' ? customTo : toIsoDate(new Date())

  const series = useApi(() => analyticsApi.series(granularity, from, to), [granularity, from, to])
  const summary = useApi(() => analyticsApi.summary(from, to), [from, to])
  const s = summary.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Showing <span className="font-medium text-foreground">{formatDate(`${from}T00:00:00`)}</span> to <span className="font-medium text-foreground">{formatDate(`${to}T00:00:00`)}</span></p>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={preset} onValueChange={setPreset}>
            <TabsList>{PRESETS.map((p) => <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>)}</TabsList>
          </Tabs>
          {preset === 'custom' && (
            <>
              <Input type="date" value={customFrom} max={customTo} onChange={(e) => e.target.value && setCustomFrom(e.target.value)} className="h-9 w-36" aria-label="From date" />
              <Input type="date" value={customTo} min={customFrom} max={toIsoDate(new Date())} onChange={(e) => e.target.value && setCustomTo(e.target.value)} className="h-9 w-36" aria-label="To date" />
            </>
          )}
        </div>
      </div>

      {summary.error && !s ? <Card><ErrorState message={summary.error} onRetry={summary.reload} /></Card> : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Total scans" value={s?.totalScans} icon={Radio} hint={s && <span>{formatNumber(s.acceptedScans)} verified</span>} />
          <StatCard label="Verification success" value={s ? `${s.verificationSuccessRate}%` : undefined} icon={ShieldCheck}
            iconClassName="bg-emerald-50 text-emerald-700" hint={<span>accepted / all scans</span>} />
          <StatCard label="Failed verifications" value={s?.rejectedScans} icon={ShieldX} iconClassName="bg-red-50 text-red-600"
            hint={s && <span>{s.rejectionsByReason.length} distinct reasons</span>} />
          <StatCard label="Notification delivery" value={s ? `${s.notificationDeliveryRate}%` : undefined} icon={BellRing}
            hint={<span>delivered / attempted</span>} />
        </div>
      )}

      <Card className="shadow-xs ring-border">
        <CardHeader>
          <CardTitle>Boarding & exit trend</CardTitle>
          <CardDescription>Verified scans per {granularity === 'daily' ? 'day' : granularity === 'weekly' ? 'week' : 'month'}</CardDescription>
          <CardAction>
            <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent>
          {series.error && !series.data ? <ErrorState message={series.error} onRetry={series.reload} />
            : series.loading || !series.data ? <Skeleton className="h-80" />
            : series.data.every((p) => p.boardings + p.exits === 0) ? <EmptyState icon={Radio} title="No verified scans in this range" />
            : <BoardingExitChart data={series.data} formatLabel={labelFor[granularity]} height={300} />}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="shadow-xs ring-border">
          <CardHeader>
            <CardTitle>Failed verifications by reason</CardTitle>
            <CardDescription>Why scans were rejected in this range</CardDescription>
          </CardHeader>
          <CardContent>
            {!s ? <Skeleton className="h-64" />
              : s.rejectionsByReason.length === 0 ? <EmptyState icon={ShieldCheck} title="No rejected scans" description="Every tap in this range passed verification." />
              : <RejectionChart data={s.rejectionsByReason} />}
          </CardContent>
        </Card>

        <Card className="shadow-xs ring-border">
          <CardHeader>
            <CardTitle>Notification delivery</CardTitle>
            <CardDescription>Parent SMS by final status (simulated provider)</CardDescription>
          </CardHeader>
          <CardContent>
            {!s ? <Skeleton className="h-64" /> : <NotificationBreakdown summary={s} />}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xs ring-border">
        <CardHeader>
          <CardTitle>Bus usage</CardTitle>
          <CardDescription>Boardings per bus in this range, with today’s occupancy</CardDescription>
        </CardHeader>
        <CardContent>
          {!s ? <Skeleton className="h-64" />
            : s.busUsage.length === 0 ? <EmptyState title="No buses" />
            : <BusUsage usage={s.busUsage} />}
        </CardContent>
      </Card>
    </div>
  )
}

function RejectionChart({ data }: { data: AnalyticsSummary['rejectionsByReason'] }) {
  const rows = [...data].sort((a, b) => b.count - a.count).map((r) => ({ label: rejectionReasonLabel[r.reason], count: r.count }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 40)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid horizontal={false} stroke={chartColors.grid} />
        <XAxis type="number" allowDecimals={false} {...axisProps} />
        <YAxis type="category" dataKey="label" width={150} {...axisProps} tick={{ ...axisProps.tick, fill: '#3d4555' }} />
        <Tooltip cursor={{ fill: 'rgba(208, 59, 59, 0.06)' }} content={(props) => <ChartTooltip {...props} />} />
        <Bar dataKey="count" name="Rejected scans" fill={chartColors.critical} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const statusStyle: Record<NotificationStatus, { icon: LucideIcon; color: string; text: string }> = {
  DELIVERED: { icon: CheckCircle2, color: chartColors.good, text: 'text-emerald-700' },
  SENT: { icon: Send, color: '#94a3b8', text: 'text-sky-700' },
  PENDING: { icon: Clock, color: chartColors.warning, text: 'text-amber-700' },
  FAILED: { icon: XCircle, color: chartColors.critical, text: 'text-red-700' },
}

function NotificationBreakdown({ summary }: { summary: AnalyticsSummary }) {
  const total = summary.notificationsByStatus.reduce((t, r) => t + r.count, 0)
  if (total === 0) return <EmptyState icon={BellRing} title="No notifications in this range" />
  const order: NotificationStatus[] = ['DELIVERED', 'SENT', 'PENDING', 'FAILED']
  const counts = Object.fromEntries(summary.notificationsByStatus.map((r) => [r.status, r.count])) as Partial<Record<NotificationStatus, number>>

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-2">
        <span className="tabular text-3xl font-semibold">{summary.notificationDeliveryRate}%</span>
        <span className="text-sm text-muted-foreground">delivered of {formatNumber(total)} messages</span>
      </div>
      {/* Part-to-whole strip; segments separated by a 2px surface gap. */}
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Notification status breakdown">
        {order.filter((st) => counts[st]).map((st) => (
          <div key={st} style={{ width: `${(counts[st]! / total) * 100}%`, background: statusStyle[st].color }} />
        ))}
      </div>
      <ul className="space-y-2.5">
        {order.map((st) => {
          const { icon: Icon, text } = statusStyle[st]
          const count = counts[st] ?? 0
          return (
            <li key={st} className="flex items-center justify-between text-sm">
              <span className={cn('flex items-center gap-2 font-medium', text)}><Icon className="size-4" />{notificationStatusLabel[st]}</span>
              <span className="tabular text-muted-foreground">
                <span className="font-medium text-foreground">{formatNumber(count)}</span> · {((count / total) * 100).toFixed(1)}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function BusUsage({ usage }: { usage: AnalyticsSummary['busUsage'] }) {
  const rows = usage.map((b) => ({ ...b, label: b.busNumber }))
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,420px)]">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={chartColors.grid} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} width={44} />
          <Tooltip cursor={{ fill: 'rgba(37, 87, 214, 0.06)' }} content={(props) => <ChartTooltip {...props} />} />
          <Bar dataKey="boardings" name="Boardings" fill={chartColors.boarding} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
      <ul className="space-y-3">
        {usage.map((b) => (
          <li key={b.busId} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{b.busNumber}</span>
              <span className="text-xs text-muted-foreground">
                {b.assigned} assigned · avg <span className="tabular font-medium text-foreground">{b.averageDailyBoardings}</span> boardings/day
              </span>
            </div>
            <OccupancyBar onboard={b.onboard} capacity={b.capacity} />
          </li>
        ))}
      </ul>
    </div>
  )
}
