import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Bus as BusIcon, MapPin, Pencil, Phone, Radio, UserMinus, UserPlus, UserRound, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { OccupancyBar } from '@/components/OccupancyBar'
import { EmptyState, ErrorState } from '@/components/PageStates'
import { BusStatusBadge, EventTypeBadge, ScanResultBadge, TransportStatusBadge } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { busesApi } from '@/services/api'
import { getErrorMessage } from '@/services/http'
import type { Student } from '@/types/api'
import { formatDateTime, formatUid, initials } from '@/utils/format'
import { AssignStudentsDialog } from './buses/AssignStudentsDialog'
import { BusFormDialog } from './buses/BusFormDialog'

export default function BusDetailPage() {
  const id = Number(useParams().id)
  const detail = useApi(() => busesApi.get(id), [id], { pollMs: 10000 })
  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [removing, setRemoving] = useState<Student | null>(null)

  async function confirmUnassign() {
    if (!removing) return
    try {
      await busesApi.unassignStudent(id, removing.id)
      toast.success(`${removing.fullName} unassigned from ${detail.data?.bus.busNumber}`)
      void detail.reload()
    } catch (e) {
      toast.error(getErrorMessage(e))
      throw e
    }
  }

  if (detail.error && !detail.data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card><ErrorState message={detail.error} onRetry={detail.reload} /></Card>
      </div>
    )
  }
  if (!detail.data) {
    return <div className="space-y-4"><BackLink /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>
  }

  const { bus, students, recentScans } = detail.data

  return (
    <div className="space-y-6">
      <BackLink />

      <Card className="shadow-xs ring-border">
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand text-white"><BusIcon className="size-7" aria-hidden /></span>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{bus.busNumber}</h2>
                <BusStatusBadge status={bus.status} />
                <span className="text-sm text-muted-foreground">{bus.registrationNumber}</span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="size-4" />{bus.routeName}</span>
                <span className="flex items-center gap-1.5"><UserRound className="size-4" />{bus.driverName}</span>
                <span className="flex items-center gap-1.5"><Phone className="size-4" />{bus.driverPhone}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil /> Edit bus</Button>
                {bus.status === 'ACTIVE' && (
                  <Button variant="outline" size="sm" asChild><Link to={`/rfid?busId=${bus.id}`}><Radio /> Simulate scan</Link></Button>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <OccupancyBar onboard={bus.onboardCount} capacity={bus.capacity} />
            <div className="grid grid-cols-3 text-center">
              <Metric label="Capacity" value={bus.capacity} />
              <Metric label="Assigned" value={bus.assignedCount} />
              <Metric label="Onboard" value={bus.onboardCount} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="gap-0 shadow-xs ring-border">
          <CardHeader className="border-b pb-4">
            <CardTitle>Assigned students</CardTitle>
            <CardDescription>{students.length} of {bus.capacity} seats assigned</CardDescription>
            <CardAction><Button size="sm" onClick={() => setAssignOpen(true)}><UserPlus /> Assign students</Button></CardAction>
          </CardHeader>
          {students.length === 0 ? (
            <EmptyState icon={Users} title="No students assigned" description="Assign students so their RFID cards are authorised on this bus."
              action={<Button size="sm" onClick={() => setAssignOpen(true)}><UserPlus /> Assign students</Button>} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead className="hidden sm:table-cell">Class</TableHead>
                  <TableHead className="hidden md:table-cell">RFID card</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-6"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">{initials(s.fullName)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.fullName}</p>
                          <p className="text-xs text-muted-foreground">{s.admissionNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{s.className} · {s.section}</TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">{formatUid(s.rfidUid)}</TableCell>
                    <TableCell><TransportStatusBadge status={s.transportStatus} /></TableCell>
                    <TableCell className="pr-6">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {/* span keeps the tooltip working while the button is disabled */}
                          <span>
                            <Button variant="ghost" size="icon-sm" aria-label={`Unassign ${s.fullName}`}
                              disabled={s.transportStatus === 'ONBOARD'} onClick={() => setRemoving(s)}>
                              <UserMinus />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{s.transportStatus === 'ONBOARD' ? 'Cannot unassign while onboard' : 'Unassign from bus'}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="h-fit shadow-xs ring-border">
          <CardHeader>
            <CardTitle>Recent scans</CardTitle>
            <CardDescription>Latest RFID taps on this bus</CardDescription>
            <CardAction><Link to={`/rfid?busId=${bus.id}`} className="text-xs font-medium text-brand hover:underline">Open log</Link></CardAction>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? <EmptyState icon={Radio} title="No scans yet" /> : (
              <ul className="divide-y">
                {recentScans.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{e.studentName ?? 'Unidentified card'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <EventTypeBadge type={e.eventType} />
                        <span>{formatDateTime(e.scannedAt)}</span>
                      </div>
                      {e.result === 'REJECTED' && <p className="mt-0.5 text-xs text-red-700">{e.message}</p>}
                    </div>
                    <ScanResultBadge result={e.result} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <BusFormDialog open={editOpen} onOpenChange={setEditOpen} bus={bus} onSaved={() => void detail.reload()} />
      <AssignStudentsDialog open={assignOpen} onOpenChange={setAssignOpen} bus={bus} onAssigned={() => void detail.reload()} />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Unassign ${removing?.fullName ?? 'student'}?`}
        description={`Their card will no longer be accepted on ${bus.busNumber} until they are assigned to a bus again.`}
        confirmLabel="Unassign"
        onConfirm={confirmUnassign}
      />
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/buses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> All buses
    </Link>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="tabular text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
