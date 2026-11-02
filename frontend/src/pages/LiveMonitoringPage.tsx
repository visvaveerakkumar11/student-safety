import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Bus as BusIcon, MapPin, Phone, Radio, ShieldCheck, ShieldX, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OccupancyBar } from '@/components/OccupancyBar'
import { EmptyState, ErrorState } from '@/components/PageStates'
import { BusStatusBadge, EventTypeBadge } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { busesApi, rfidApi, studentsApi } from '@/services/api'
import type { Bus, Student } from '@/types/api'
import { formatTime, initials, timeAgo } from '@/utils/format'

const POLL = 5000

export default function LiveMonitoringPage() {
  const [filter, setFilter] = useState<'all' | 'route'>('all')
  const buses = useApi(busesApi.list, [], { pollMs: POLL })
  const onboard = useApi(() => studentsApi.list({ status: 'ONBOARD', size: 100, sort: 'lastScanAt', direction: 'desc' }), [], { pollMs: POLL })
  const feed = useApi(() => rfidApi.activity({ size: 15 }), [], { pollMs: POLL })

  const onboardByBus = useMemo(() => {
    const map = new Map<number, Student[]>()
    for (const s of onboard.data?.content ?? []) {
      if (!s.bus) continue
      map.set(s.bus.id, [...(map.get(s.bus.id) ?? []), s])
    }
    return map
  }, [onboard.data])

  const visible = (buses.data ?? []).filter((b) => filter === 'all' || b.onboardCount > 0)
  const totalOnboard = (buses.data ?? []).reduce((sum, b) => sum + b.onboardCount, 0)

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
            Live · {totalOnboard} students onboard · updates every 5s
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'route')}>
            <TabsList>
              <TabsTrigger value="all">All buses</TabsTrigger>
              <TabsTrigger value="route">On route</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {buses.error && !buses.data ? <Card><ErrorState message={buses.error} onRetry={buses.reload} /></Card>
          : !buses.data ? (
            <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>
          ) : visible.length === 0 ? (
            <Card><EmptyState icon={BusIcon} title={filter === 'route' ? 'No buses on route' : 'No buses yet'}
              description={filter === 'route' ? 'Buses appear here as soon as a student boards.' : 'Add buses from the Buses page.'} /></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visible.map((bus) => <BusLiveCard key={bus.id} bus={bus} students={onboardByBus.get(bus.id) ?? []} />)}
            </div>
          )}
      </div>

      <Card className="h-fit shadow-xs ring-border xl:sticky xl:top-22">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Radio className="size-4 text-brand" /> Live scan feed</CardTitle>
          <CardDescription>Most recent RFID taps across the fleet</CardDescription>
        </CardHeader>
        <CardContent>
          {feed.error && !feed.data ? <ErrorState message={feed.error} onRetry={feed.reload} />
            : !feed.data ? <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : feed.data.content.length === 0 ? <EmptyState title="Waiting for scans" />
            : (
              <ul className="divide-y">
                {feed.data.content.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 py-2.5 first:pt-0">
                    {e.result === 'ACCEPTED'
                      ? <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Verified" />
                      : <ShieldX className="mt-0.5 size-4 shrink-0 text-red-600" aria-label="Rejected" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[13px] font-medium">{e.studentName ?? 'Unidentified card'}</p>
                        <span className="tabular shrink-0 text-[11px] text-muted-foreground">{formatTime(e.scannedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <EventTypeBadge type={e.eventType} />
                        <span>· {e.busNumber ?? '—'}</span>
                      </div>
                      {e.result === 'REJECTED' && <p className="mt-0.5 line-clamp-2 text-xs text-red-700">{e.message}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>
    </div>
  )
}

function BusLiveCard({ bus, students }: { bus: Bus; students: Student[] }) {
  const onRoute = bus.onboardCount > 0
  return (
    <Card className={cn('gap-4 shadow-xs ring-border', onRoute && 'ring-brand/30')}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={cn('flex size-10 items-center justify-center rounded-lg', onRoute ? 'bg-brand text-white' : 'bg-muted text-muted-foreground')}>
              <BusIcon className="size-5" aria-hidden />
            </span>
            <div>
              <Link to={`/buses/${bus.id}`} className="text-[15px] font-semibold hover:text-brand">{bus.busNumber}</Link>
              <p className="text-xs text-muted-foreground">{bus.registrationNumber}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <BusStatusBadge status={bus.status} />
            {bus.status === 'ACTIVE' && (
              <Badge variant="outline" className={cn('text-[11px]', onRoute ? 'border-brand/30 text-brand' : 'text-muted-foreground')}>
                {onRoute ? 'On route' : 'Idle'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate"><MapPin className="size-3.5 shrink-0" />{bus.routeName}</span>
          <span className="flex items-center gap-1.5 truncate"><UserRound className="size-3.5 shrink-0" />{bus.driverName}</span>
          <span className="flex items-center gap-1.5 truncate"><Phone className="size-3.5 shrink-0" />{bus.driverPhone}</span>
          <span className="truncate">{bus.assignedCount} students assigned</span>
        </div>
        <OccupancyBar onboard={bus.onboardCount} capacity={bus.capacity} />
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Onboard now</p>
          {students.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">No students onboard</p>
          ) : (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {students.map((s) => (
                <li key={s.id} className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-2.5 py-1.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">{initials(s.fullName)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{s.fullName}</span>
                  <span className="text-[11px] text-muted-foreground">{s.className}-{s.section}</span>
                  <span className="text-[11px] text-muted-foreground" title={formatTime(s.lastScanAt)}>{s.lastScanAt ? timeAgo(s.lastScanAt) : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to={`/rfid?busId=${bus.id}`}>Simulate scan on {bus.busNumber}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
