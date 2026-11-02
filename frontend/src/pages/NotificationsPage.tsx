import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { BellRing, CheckCircle2, Clock, Info, Loader2, RotateCw, Search, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FilterSelect } from '@/components/FilterSelect'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, TableMessage, TableSkeleton } from '@/components/PageStates'
import { StatCard } from '@/components/StatCard'
import { EventTypeBadge, NotificationStatusBadge, SimulatedTag } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { dashboardApi, notificationsApi } from '@/services/api'
import { getErrorMessage } from '@/services/http'
import type { Notification, NotificationStatus, ScanEventType } from '@/types/api'
import { formatDateTime, notificationStatusLabel } from '@/utils/format'

const PAGE_SIZE = 12
const COLUMNS = 7
const POLL = 5000

export default function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (searchParams.get('status') as NotificationStatus | null) ?? undefined
  const [eventType, setEventType] = useState<ScanEventType>()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [viewingId, setViewingId] = useState<number | null>(null)
  const [retrying, setRetrying] = useState<number | null>(null)

  const summary = useApi(dashboardApi.summary, [], { pollMs: POLL })
  const list = useApi(
    () => notificationsApi.list({ status, eventType, q: q.trim(), page, size: PAGE_SIZE }),
    [status, eventType, q, page],
    { pollMs: POLL },
  )

  const setStatus = (v: string | undefined) => { setSearchParams(v ? { status: v } : {}, { replace: true }); setPage(0) }

  async function retry(n: Notification) {
    setRetrying(n.id)
    try {
      await notificationsApi.retry(n.id)
      toast.success('Notification re-queued', { description: `To ${n.recipientName} about ${n.studentName}` })
      void list.reload()
      void summary.reload()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setRetrying(null)
    }
  }

  const s = summary.data
  const hasFilters = !!(status || eventType || q)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Parent SMS uses a <strong>simulated provider</strong>: messages are not actually sent. Delivery receipts and occasional
          failures are simulated so the full PENDING → SENT → DELIVERED / FAILED lifecycle can be demonstrated.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total sent" value={s?.notificationsSent} icon={BellRing} hint={s && <span>{s.notificationsToday} today</span>} />
        <StatCard label="Delivered" value={s?.notificationsDelivered} icon={CheckCircle2} iconClassName="bg-emerald-50 text-emerald-700"
          hint={s && <span>{s.deliveryRate}% delivery rate</span>} />
        <StatCard label="Pending" value={s?.notificationsPending} icon={Clock} iconClassName="bg-amber-50 text-amber-700"
          hint={<span>queued or awaiting receipt</span>} />
        <StatCard label="Failed" value={s?.notificationsFailed} icon={XCircle} iconClassName="bg-red-50 text-red-600"
          hint={<span>can be retried</span>} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Student, parent or bus" className="h-9 bg-card pl-8" aria-label="Search notifications" />
        </div>
        <FilterSelect ariaLabel="Filter by status" allLabel="All statuses" value={status} onChange={setStatus}
          options={Object.entries(notificationStatusLabel).map(([value, label]) => ({ value, label }))} />
        <FilterSelect ariaLabel="Filter by event" allLabel="All events" value={eventType}
          onChange={(v) => { setEventType(v as ScanEventType | undefined); setPage(0) }}
          options={[{ value: 'BOARDING', label: 'Boarding' }, { value: 'EXIT', label: 'Exit' }]} />
      </div>

      <Card className="gap-0 py-0 shadow-xs ring-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Created</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="hidden md:table-cell">Recipient</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="hidden xl:table-cell">Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.error && !list.data ? <TableMessage columns={COLUMNS}><ErrorState message={list.error} onRetry={list.reload} /></TableMessage>
              : list.loading && !list.data ? <TableSkeleton columns={COLUMNS} rows={PAGE_SIZE} />
              : list.data?.content.length === 0 ? (
                <TableMessage columns={COLUMNS}>
                  <EmptyState icon={BellRing} title={hasFilters ? 'No notifications match these filters' : 'No notifications yet'}
                    description={hasFilters ? 'Try a different status or search.' : 'Parents are notified automatically on every verified boarding and exit.'} />
                </TableMessage>
              )
              : list.data?.content.map((n) => (
                <TableRow key={n.id} className="cursor-pointer" onClick={() => setViewingId(n.id)}>
                  <TableCell className="tabular pl-4 text-xs whitespace-nowrap">{formatDateTime(n.createdAt)}</TableCell>
                  <TableCell>
                    <p className="font-medium">{n.studentName}</p>
                    <p className="text-xs text-muted-foreground">{n.busNumber}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p>{n.recipientName}</p>
                    <p className="text-xs text-muted-foreground">{n.recipientPhone}</p>
                  </TableCell>
                  <TableCell><EventTypeBadge type={n.eventType} /></TableCell>
                  <TableCell className="hidden max-w-xs xl:table-cell"><p className="truncate text-xs text-muted-foreground" title={n.message}>{n.message}</p></TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <NotificationStatusBadge status={n.status} />
                      {n.simulated && <SimulatedTag />}
                    </div>
                  </TableCell>
                  <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {n.status === 'FAILED' ? (
                      <Button size="sm" variant="outline" disabled={retrying === n.id} onClick={() => retry(n)}>
                        {retrying === n.id ? <Loader2 className="animate-spin" /> : <RotateCw />} Retry
                      </Button>
                    ) : <Button size="sm" variant="ghost" onClick={() => setViewingId(n.id)}>View</Button>}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        {list.data && <Pagination {...list.data} onPageChange={setPage} />}
      </Card>

      <NotificationDetailSheet id={viewingId} onClose={() => setViewingId(null)} onRetry={retry} retrying={retrying} />
    </div>
  )
}

function NotificationDetailSheet({ id, onClose, onRetry, retrying }: {
  id: number | null
  onClose: () => void
  onRetry: (n: Notification) => Promise<void>
  retrying: number | null
}) {
  const detail = useApi(() => (id ? notificationsApi.get(id) : Promise.resolve(null)), [id], { pollMs: id ? POLL : undefined })
  const n = detail.data

  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Notification #{id}</SheetTitle>
          <SheetDescription>Parent SMS delivery details</SheetDescription>
        </SheetHeader>
        {detail.error && !n ? <ErrorState message={detail.error} onRetry={detail.reload} />
          : !n || n.id !== id ? <div className="space-y-3 p-4"><Skeleton className="h-24" /><Skeleton className="h-48" /></div>
          : (
            <div className="space-y-5 p-4">
              <div className="flex items-center gap-2">
                <NotificationStatusBadge status={n.status} />
                {n.simulated && <SimulatedTag />}
                <EventTypeBadge type={n.eventType} />
              </div>
              <blockquote className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed">{n.message}</blockquote>
              {n.failureReason && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"><strong>Failure:</strong> {n.failureReason}</p>
              )}
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Recipient" value={n.recipientName} />
                <Field label="Phone" value={n.recipientPhone} />
                <Field label="Student" value={n.studentName} />
                <Field label="Bus" value={n.busNumber} />
                <Field label="Provider" value={n.provider} />
                <Field label="Attempts" value={n.attempts} />
                <Field label="Provider message ID" value={<span className="font-mono text-xs">{n.providerMessageId ?? '—'}</span>} />
                <Field label="Scan event" value={n.scanEventId ? `#${n.scanEventId}` : '—'} />
              </dl>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Timeline</p>
                <ol className="space-y-2 border-l pl-4 text-sm">
                  <TimelineItem label="Queued" at={n.createdAt} />
                  <TimelineItem label="Sent to provider" at={n.sentAt} />
                  <TimelineItem label={n.status === 'FAILED' ? 'Failed' : 'Delivered'} at={n.status === 'FAILED' ? null : n.deliveredAt} failed={n.status === 'FAILED'} />
                </ol>
              </div>
              {n.status === 'FAILED' && (
                <Button className="w-full" disabled={retrying === n.id} onClick={async () => { await onRetry(n); void detail.reload() }}>
                  {retrying === n.id ? <Loader2 className="animate-spin" /> : <RotateCw />} Retry delivery
                </Button>
              )}
            </div>
          )}
      </SheetContent>
    </Sheet>
  )
}

function TimelineItem({ label, at, failed }: { label: string; at: string | null; failed?: boolean }) {
  return (
    <li className="relative">
      <span className={`absolute top-1.5 -left-[21px] size-2.5 rounded-full ${failed ? 'bg-red-500' : at ? 'bg-brand' : 'bg-muted-foreground/30'}`} aria-hidden />
      <p className={failed ? 'font-medium text-red-700' : at ? 'font-medium' : 'text-muted-foreground'}>{label}</p>
      <p className="text-xs text-muted-foreground">{failed ? 'Delivery not confirmed' : at ? formatDateTime(at) : 'Waiting'}</p>
    </li>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  )
}
