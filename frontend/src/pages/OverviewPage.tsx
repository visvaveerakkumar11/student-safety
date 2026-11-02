import { Link } from 'react-router'
import {
  ArrowRight,
  BellRing,
  Bus,
  CheckCircle2,
  Clock,
  Radar,
  ShieldCheck,
  ShieldX,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BoardingExitChart } from '@/components/charts'
import { OccupancyBar } from '@/components/OccupancyBar'
import { EmptyState, ErrorState, TableMessage, TableSkeleton } from '@/components/PageStates'
import { StatCard } from '@/components/StatCard'
import { BusStatusBadge, EventTypeBadge, ScanResultBadge } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { analyticsApi, busesApi, dashboardApi, rfidApi } from '@/services/api'
import type { ActivityKind } from '@/types/api'
import { formatNumber, formatShortDay, formatTime, formatUid, percentChange, timeAgo } from '@/utils/format'

const POLL = 10000

export default function OverviewPage() {
  const summary = useApi(dashboardApi.summary, [], { pollMs: POLL })
  const activity = useApi(() => dashboardApi.activity(10), [], { pollMs: POLL })
  const buses = useApi(busesApi.list, [], { pollMs: POLL })
  const scans = useApi(() => rfidApi.activity({ size: 8 }), [], { pollMs: POLL })
  const daily = useApi(() => analyticsApi.series('daily'), [], { pollMs: 60000 })
  const s = summary.data

  if (summary.error && !s) return <Card><ErrorState message={summary.error} onRetry={summary.reload} /></Card>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total Students" value={s?.totalStudents} icon={Users}
          hint={s && <span>{s.unassignedStudents} without a bus</span>} />
        <StatCard label="Currently Onboard" value={s?.studentsOnboard} icon={Radar}
          hint={s && <span>across {s.busesOnRoute} {s.busesOnRoute === 1 ? 'bus' : 'buses'} on route</span>} />
        <StatCard label="Active Buses" value={s?.activeBuses} icon={Bus}
          hint={s && <span>of {s.totalBuses} in fleet</span>} />
        <StatCard label="Notifications Sent" value={s?.notificationsSent} icon={BellRing}
          change={s ? percentChange(s.notificationsToday, s.notificationsYesterday) : undefined}
          changeLabel={s ? `${formatNumber(s.notificationsToday)} today vs yesterday` : undefined} />
        <StatCard label="Delivered" value={s?.notificationsDelivered} icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-700"
          hint={s && <span>{s.deliveryRate}% delivery success</span>} />
        <StatCard label="Failed Notifications" value={s?.notificationsFailed} icon={XCircle}
          iconClassName="bg-red-50 text-red-600"
          hint={s && <span>{s.notificationsPending} pending in queue</span>} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="shadow-xs ring-border xl:col-span-2">
          <CardHeader>
            <CardTitle>Transport Overview</CardTitle>
            <CardDescription>Verified boardings and exits per day, last 14 days</CardDescription>
            <CardAction>
              {s && (
                <div className="text-right text-xs text-muted-foreground">
                  Today: <span className="font-medium text-foreground">{s.boardingsToday}</span> boardings ·{' '}
                  <span className="font-medium text-foreground">{s.exitsToday}</span> exits
                </div>
              )}
            </CardAction>
          </CardHeader>
          <CardContent>
            {daily.error ? <ErrorState message={daily.error} onRetry={daily.reload} />
              : daily.data ? <BoardingExitChart data={daily.data} formatLabel={formatShortDay} />
              : <Skeleton className="h-[300px] w-full" />}
          </CardContent>
        </Card>

        <NotificationOverview
          delivered={s?.notificationsDelivered} pending={s?.notificationsPending}
          failed={s?.notificationsFailed} sent={s?.notificationsSent} rate={s?.deliveryRate}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="shadow-xs ring-border xl:col-span-2">
          <CardHeader>
            <CardTitle>Live Bus Status</CardTitle>
            <CardDescription>Fleet occupancy, refreshed every 10 seconds</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm"><Link to="/live">Live view <ArrowRight /></Link></Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Bus</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="hidden md:table-cell">Route</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="w-44">Onboard</TableHead>
                  <TableHead className="pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buses.error && !buses.data ? <TableMessage columns={6}><ErrorState message={buses.error} onRetry={buses.reload} /></TableMessage>
                  : !buses.data ? <TableSkeleton columns={6} rows={5} />
                  : buses.data.length === 0 ? <TableMessage columns={6}><EmptyState icon={Bus} title="No buses yet" description="Add buses to start monitoring." /></TableMessage>
                  : buses.data.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="pl-4">
                        <Link to={`/buses/${b.id}`} className="font-medium text-foreground hover:text-brand">{b.busNumber}</Link>
                        <p className="text-xs text-muted-foreground">{b.registrationNumber}</p>
                      </TableCell>
                      <TableCell>{b.driverName}</TableCell>
                      <TableCell className="hidden max-w-48 truncate text-muted-foreground md:table-cell">{b.routeName}</TableCell>
                      <TableCell className="tabular text-right">{b.assignedCount}</TableCell>
                      <TableCell><OccupancyBar onboard={b.onboardCount} capacity={b.capacity} /></TableCell>
                      <TableCell className="pr-4"><BusStatusBadge status={b.status} /></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-xs ring-border">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Scans and parent notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.error && !activity.data ? <ErrorState message={activity.error} onRetry={activity.reload} />
              : !activity.data ? <div className="space-y-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              : activity.data.length === 0 ? <EmptyState title="No activity yet" description="Scans will appear here as they happen." />
              : (
                <ol className="relative space-y-4 before:absolute before:inset-y-1 before:left-[13px] before:w-px before:bg-border">
                  {activity.data.map((item, i) => {
                    const { icon: Icon, className } = activityStyle[item.kind]
                    return (
                      <li key={i} className="relative flex gap-3">
                        <span className={cn('relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card', className)}>
                          <Icon className="size-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                            <time className="shrink-0 text-[11px] text-muted-foreground" dateTime={item.timestamp}>{timeAgo(item.timestamp)}</time>
                          </div>
                          <p className="truncate text-xs text-muted-foreground" title={item.description}>{item.description}</p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xs ring-border">
        <CardHeader>
          <CardTitle>Recent RFID Activity</CardTitle>
          <CardDescription>Latest card scans across all buses</CardDescription>
          <CardAction>
            <Button asChild variant="ghost" size="sm"><Link to="/rfid">Open scan log <ArrowRight /></Link></Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Student</TableHead>
                <TableHead className="hidden sm:table-cell">Card UID</TableHead>
                <TableHead>Bus</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="pr-4">Verification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.error && !scans.data ? <TableMessage columns={6}><ErrorState message={scans.error} onRetry={scans.reload} /></TableMessage>
                : !scans.data ? <TableSkeleton columns={6} rows={5} />
                : scans.data.content.length === 0 ? <TableMessage columns={6}><EmptyState title="No scans yet" description="Use the RFID simulator to record a scan." /></TableMessage>
                : scans.data.content.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="pl-4">
                      <p className="font-medium">{e.studentName ?? <span className="text-muted-foreground">Unidentified card</span>}</p>
                      {e.studentId && <p className="text-xs text-muted-foreground">STU-{String(e.studentId).padStart(4, '0')}</p>}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs sm:table-cell">{formatUid(e.rfidUid)}</TableCell>
                    <TableCell>{e.busNumber ?? '—'}</TableCell>
                    <TableCell><EventTypeBadge type={e.eventType} /></TableCell>
                    <TableCell className="tabular text-muted-foreground">{formatTime(e.scannedAt)}</TableCell>
                    <TableCell className="pr-4"><ScanResultBadge result={e.result} /></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

const activityStyle: Record<ActivityKind, { icon: LucideIcon; className: string }> = {
  SCAN_ACCEPTED: { icon: ShieldCheck, className: 'bg-brand-soft text-brand' },
  SCAN_REJECTED: { icon: ShieldX, className: 'bg-red-50 text-red-600' },
  NOTIFICATION_DELIVERED: { icon: BellRing, className: 'bg-emerald-50 text-emerald-700' },
  NOTIFICATION_FAILED: { icon: XCircle, className: 'bg-red-50 text-red-600' },
}

function NotificationOverview({ delivered, pending, failed, sent, rate }: {
  delivered?: number; pending?: number; failed?: number; sent?: number; rate?: number
}) {
  const total = (sent ?? 0) + (failed ?? 0) + (pending ?? 0)
  const rows: { label: string; value?: number; color: string; icon: LucideIcon }[] = [
    { label: 'Delivered', value: delivered, color: 'bg-status-good', icon: CheckCircle2 },
    { label: 'Awaiting receipt', value: sent !== undefined && delivered !== undefined ? sent - delivered : undefined, color: 'bg-brand', icon: BellRing },
    { label: 'Pending', value: pending, color: 'bg-status-warning', icon: Clock },
    { label: 'Failed', value: failed, color: 'bg-status-critical', icon: XCircle },
  ]
  return (
    <Card className="shadow-xs ring-border">
      <CardHeader>
        <CardTitle>Notification Overview</CardTitle>
        <CardDescription>Parent alert delivery, all time</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm"><Link to="/notifications">View <ArrowRight /></Link></Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Delivery success rate</p>
          {rate === undefined ? <Skeleton className="mt-2 h-10 w-28" /> : (
            <p className="mt-1 text-4xl font-semibold tracking-tight">{rate}<span className="text-xl text-muted-foreground">%</span></p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Delivered ÷ messages the provider has handled</p>
        </div>
        <ul className="space-y-4">
          {rows.map(({ label, value, color, icon: Icon }) => (
            <li key={label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><Icon className="size-3.5" aria-hidden />{label}</span>
                <span className="tabular font-medium">{value === undefined ? '—' : formatNumber(value)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', color)} style={{ width: `${total && value ? Math.max(2, (value / total) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
