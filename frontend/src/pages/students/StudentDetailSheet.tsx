import { Link } from 'react-router'
import { Bus, CreditCard, Pencil, Phone, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/PageStates'
import { EventTypeBadge, NotificationStatusBadge, ScanResultBadge, SimulatedTag, TransportStatusBadge } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { studentsApi } from '@/services/api'
import { formatDateTime, formatUid, initials } from '@/utils/format'

export function StudentDetailSheet({ studentId, onClose, onEdit }: {
  studentId: number | null
  onClose: () => void
  onEdit: (id: number) => void
}) {
  const detail = useApi(() => (studentId ? studentsApi.get(studentId) : Promise.resolve(null)), [studentId])
  const d = detail.data

  return (
    <Sheet open={studentId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>Student details</SheetTitle>
          <SheetDescription>Profile, transport status and recent history</SheetDescription>
        </SheetHeader>

        {detail.error ? <ErrorState message={detail.error} onRetry={detail.reload} />
          : detail.loading || !d ? (
            <div className="space-y-4 p-4"><Skeleton className="h-16" /><Skeleton className="h-32" /><Skeleton className="h-48" /></div>
          ) : (
            <div className="space-y-6 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{initials(d.student.fullName)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{d.student.fullName}</p>
                  <p className="text-xs text-muted-foreground">STU-{String(d.student.id).padStart(4, '0')} · {d.student.admissionNumber} · {d.student.className} {d.student.section}</p>
                </div>
                <TransportStatusBadge status={d.student.transportStatus} />
              </div>

              <dl className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/30 p-4 text-sm">
                <Info icon={UserRound} label="Parent / guardian" value={d.student.parentName} />
                <Info icon={Phone} label="Parent contact" value={d.student.parentPhone} />
                <Info icon={CreditCard} label="RFID card" value={<span className="font-mono">{formatUid(d.student.rfidUid)}</span>} />
                <Info icon={Bus} label="Assigned bus" value={d.student.bus
                  ? <Link className="text-brand hover:underline" to={`/buses/${d.student.bus.id}`}>{d.student.bus.busNumber}</Link>
                  : 'Not assigned'} />
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Last scan</dt>
                  <dd className="mt-0.5 font-medium">{formatDateTime(d.student.lastScanAt)}</dd>
                </div>
              </dl>

              <Button variant="outline" size="sm" onClick={() => onEdit(d.student.id)}><Pencil /> Edit student</Button>

              <section>
                <h3 className="mb-3 text-sm font-semibold">Recent scans</h3>
                {d.recentScans.length === 0 ? <p className="text-sm text-muted-foreground">No scans recorded yet.</p> : (
                  <ul className="space-y-2">
                    {d.recentScans.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                        <div className="min-w-0">
                          <EventTypeBadge type={e.eventType} />
                          <p className="text-xs text-muted-foreground">{e.busNumber} · {formatDateTime(e.scannedAt)}</p>
                          {e.result === 'REJECTED' && <p className="text-xs text-red-700">{e.message}</p>}
                        </div>
                        <ScanResultBadge result={e.result} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <Separator />

              <section>
                <h3 className="mb-3 text-sm font-semibold">Parent notifications</h3>
                {d.recentNotifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications sent yet.</p> : (
                  <ul className="space-y-2">
                    {d.recentNotifications.map((n) => (
                      <li key={n.id} className="space-y-1.5 rounded-lg border px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                          <div className="flex items-center gap-1.5">
                            {n.simulated && <SimulatedTag />}
                            <NotificationStatusBadge status={n.status} />
                          </div>
                        </div>
                        <p className="text-[13px] leading-snug">{n.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
      </SheetContent>
    </Sheet>
  )
}

function Info({ icon: Icon, label, value }: { icon: typeof Bus; label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  )
}
