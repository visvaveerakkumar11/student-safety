import { useState } from 'react'
import { Link } from 'react-router'
import { Bus as BusIcon, MapPin, MoreHorizontal, Pencil, Phone, Plus, Trash2, UserRound, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { OccupancyBar } from '@/components/OccupancyBar'
import { EmptyState, ErrorState } from '@/components/PageStates'
import { BusStatusBadge } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { busesApi } from '@/services/api'
import { getErrorMessage } from '@/services/http'
import type { Bus } from '@/types/api'
import { BusFormDialog } from './buses/BusFormDialog'

export default function BusesPage() {
  const buses = useApi(busesApi.list, [])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bus | null>(null)
  const [deleting, setDeleting] = useState<Bus | null>(null)

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (bus: Bus) => { setEditing(bus); setFormOpen(true) }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await busesApi.remove(deleting.id)
      toast.success('Bus deleted', { description: `${deleting.busNumber} removed; its students are now unassigned.` })
      void buses.reload()
    } catch (e) {
      toast.error(getErrorMessage(e))
      throw e
    }
  }

  const list = buses.data ?? []
  const totals = list.reduce((t, b) => ({ capacity: t.capacity + b.capacity, assigned: t.assigned + b.assignedCount, onboard: t.onboard + b.onboardCount }),
    { capacity: 0, assigned: 0, onboard: 0 })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {buses.data ? `${list.length} buses · ${totals.assigned} students assigned · ${totals.onboard} onboard of ${totals.capacity} seats` : 'Loading fleet…'}
        </p>
        <Button onClick={openCreate} className="h-9"><Plus /> Add bus</Button>
      </div>

      {buses.error && !buses.data ? <Card><ErrorState message={buses.error} onRetry={buses.reload} /></Card>
        : !buses.data ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-60 rounded-xl" />)}</div>
        ) : list.length === 0 ? (
          <Card><EmptyState icon={BusIcon} title="No buses yet" description="Add a bus to start assigning students and verifying boardings."
            action={<Button size="sm" onClick={openCreate}><Plus /> Add bus</Button>} /></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {list.map((bus) => (
              <Card key={bus.id} className="gap-4 shadow-xs ring-border">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/buses/${bus.id}`} className="group flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <BusIcon className="size-5" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[15px] font-semibold group-hover:text-brand">{bus.busNumber}</p>
                        <p className="text-xs text-muted-foreground">{bus.registrationNumber}</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1">
                      <BusStatusBadge status={bus.status} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${bus.busNumber}`}><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link to={`/buses/${bus.id}`}><Users /> Manage students</Link></DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEdit(bus)}><Pencil /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(bus)}><Trash2 /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="col-span-2 flex items-center gap-1.5 truncate"><MapPin className="size-3.5 shrink-0" />{bus.routeName}</span>
                    <span className="flex items-center gap-1.5 truncate"><UserRound className="size-3.5 shrink-0" />{bus.driverName}</span>
                    <span className="flex items-center gap-1.5 truncate"><Phone className="size-3.5 shrink-0" />{bus.driverPhone}</span>
                  </div>
                  <OccupancyBar onboard={bus.onboardCount} capacity={bus.capacity} />
                  <div className="flex items-center justify-between border-t pt-3 text-xs">
                    <span className="text-muted-foreground">
                      <span className="tabular font-semibold text-foreground">{bus.assignedCount}</span> / {bus.capacity} seats assigned
                    </span>
                    <Link to={`/buses/${bus.id}`} className="font-medium text-brand hover:underline">View details</Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      <BusFormDialog open={formOpen} onOpenChange={setFormOpen} bus={editing} onSaved={() => void buses.reload()} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.busNumber ?? 'bus'}?`}
        description="Assigned students will become unassigned. A bus with students onboard cannot be deleted. Scan history is kept for audit."
        onConfirm={confirmDelete}
      />
    </div>
  )
}
