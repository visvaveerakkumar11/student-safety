import { useEffect, useState } from 'react'
import { Loader2, Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/PageStates'
import { useApi } from '@/hooks/useApi'
import { busesApi, studentsApi } from '@/services/api'
import { getErrorMessage } from '@/services/http'
import type { Bus } from '@/types/api'
import { initials } from '@/utils/format'

/** Pick unassigned students and assign them to the bus. */
export function AssignStudentsDialog({ open, onOpenChange, bus, onAssigned }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bus: Bus
  onAssigned: () => void
}) {
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const freeSeats = Math.max(0, bus.capacity - bus.assignedCount)

  useEffect(() => {
    if (open) { setQ(''); setQuery(''); setSelected(new Set()) }
  }, [open])
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q), 250)
    return () => window.clearTimeout(t)
  }, [q])

  const candidates = useApi(
    () => (open ? studentsApi.list({ busId: 0, q: query, size: 100, sort: 'fullName' }) : Promise.resolve(null)),
    [open, query],
  )

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function submit() {
    setSaving(true)
    try {
      await busesApi.assignStudents(bus.id, [...selected])
      toast.success(`${selected.size} student${selected.size === 1 ? '' : 's'} assigned to ${bus.busNumber}`)
      onAssigned()
      onOpenChange(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const list = candidates.data?.content ?? []

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign students to {bus.busNumber}</DialogTitle>
          <DialogDescription>
            Showing students without a bus. {freeSeats} of {bus.capacity} seats free. To move a student from another bus, edit them on the Students page.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or admission number" className="pl-8" aria-label="Search unassigned students" />
        </div>

        <div className="max-h-80 min-h-40 overflow-y-auto rounded-lg border">
          {candidates.error ? <ErrorState message={candidates.error} onRetry={candidates.reload} />
            : candidates.loading && !candidates.data ? <div className="space-y-2 p-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
            : list.length === 0 ? <EmptyState icon={UserPlus} title="No unassigned students" description={query ? 'No match for this search.' : 'Every student already has a bus.'} />
            : (
              <ul className="divide-y">
                {list.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                      <input type="checkbox" className="size-4 accent-brand" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                      <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">{initials(s.fullName)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.fullName}</span>
                        <span className="block text-xs text-muted-foreground">{s.admissionNumber} · {s.className} {s.section}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
        </div>

        {selected.size > freeSeats && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {selected.size} selected but only {freeSeats} seat{freeSeats === 1 ? '' : 's'} free. Boarding is still capped at {bus.capacity}; extra students will be rejected with “Bus full”.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving || selected.size === 0} onClick={submit}>
            {saving && <Loader2 className="animate-spin" />}
            Assign {selected.size > 0 ? selected.size : ''} student{selected.size === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
