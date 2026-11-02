import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Eye, MoreHorizontal, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FilterSelect } from '@/components/FilterSelect'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, TableMessage, TableSkeleton } from '@/components/PageStates'
import { TransportStatusBadge } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { busesApi, studentsApi } from '@/services/api'
import { getErrorMessage } from '@/services/http'
import type { Student, TransportStatus } from '@/types/api'
import { formatDateTime, formatUid, initials, transportStatusLabel } from '@/utils/format'
import { StudentDetailSheet } from './students/StudentDetailSheet'
import { StudentFormDialog } from './students/StudentFormDialog'

const PAGE_SIZE = 10
const COLUMNS = 7

export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const [search, setSearch] = useState(urlQuery)
  const [className, setClassName] = useState<string>()
  const [busId, setBusId] = useState<string>()
  const [status, setStatus] = useState<TransportStatus>()
  const [page, setPage] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [viewingId, setViewingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<Student | null>(null)

  // Keep the box in sync with header searches; debounce typing into the URL.
  useEffect(() => setSearch(urlQuery), [urlQuery])
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (search !== urlQuery) {
        setSearchParams(search ? { q: search } : {}, { replace: true })
        setPage(0)
      }
    }, 300)
    return () => window.clearTimeout(t)
  }, [search, urlQuery, setSearchParams])

  const students = useApi(
    () => studentsApi.list({ q: urlQuery, className, busId: busId ? Number(busId) : undefined, status, page, size: PAGE_SIZE }),
    [urlQuery, className, busId, status, page],
  )
  const buses = useApi(busesApi.list, [])
  const classes = useApi(studentsApi.classes, [])

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0) }

  const openCreate = () => { setEditingId(null); setFormOpen(true) }
  const openEdit = useCallback((id: number) => { setViewingId(null); setEditingId(id); setFormOpen(true) }, [])
  const onSaved = () => { void students.reload(); void classes.reload() }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await studentsApi.remove(deleting.id)
      toast.success('Student deleted', { description: `${deleting.fullName}'s scan history is retained.` })
      if (students.data?.content.length === 1 && page > 0) setPage(page - 1)
      else void students.reload()
    } catch (e) {
      toast.error(getErrorMessage(e))
      throw e
    }
  }

  const hasFilters = !!(urlQuery || className || busId || status)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, admission no., parent, UID"
              className="h-9 bg-card pl-8" aria-label="Search students" />
          </div>
          <FilterSelect ariaLabel="Filter by class" allLabel="All classes" value={className} onChange={resetPage(setClassName)}
            options={(classes.data ?? []).map((c) => ({ value: c, label: c }))} />
          <FilterSelect ariaLabel="Filter by bus" allLabel="All buses" value={busId} onChange={resetPage(setBusId)}
            options={[{ value: '0', label: 'No bus assigned' }, ...(buses.data ?? []).map((b) => ({ value: String(b.id), label: b.busNumber }))]} />
          <FilterSelect ariaLabel="Filter by status" allLabel="All statuses" value={status}
            onChange={resetPage((v) => setStatus(v as TransportStatus | undefined))}
            options={Object.entries(transportStatusLabel).map(([value, label]) => ({ value, label }))} />
        </div>
        <Button onClick={openCreate} className="h-9"><Plus /> Add student</Button>
      </div>

      <Card className="gap-0 py-0 shadow-xs ring-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="hidden lg:table-cell">RFID card</TableHead>
              <TableHead className="hidden md:table-cell">Parent / guardian</TableHead>
              <TableHead>Bus</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 pr-4"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.error ? <TableMessage columns={COLUMNS}><ErrorState message={students.error} onRetry={students.reload} /></TableMessage>
              : students.loading && !students.data ? <TableSkeleton columns={COLUMNS} rows={PAGE_SIZE} />
              : students.data?.content.length === 0 ? (
                <TableMessage columns={COLUMNS}>
                  <EmptyState icon={Users} title={hasFilters ? 'No students match these filters' : 'No students yet'}
                    description={hasFilters ? 'Try a different search or clear the filters.' : 'Add your first student to issue an RFID card.'}
                    action={!hasFilters && <Button size="sm" onClick={openCreate}><Plus /> Add student</Button>} />
                </TableMessage>
              )
              : students.data?.content.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => setViewingId(s.id)}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">{initials(s.fullName)}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.fullName}</p>
                        <p className="text-xs text-muted-foreground">STU-{String(s.id).padStart(4, '0')} · {s.admissionNumber}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{s.className} <span className="text-muted-foreground">· {s.section}</span></TableCell>
                  <TableCell className="hidden font-mono text-xs lg:table-cell">{formatUid(s.rfidUid)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p>{s.parentName}</p>
                    <p className="text-xs text-muted-foreground">{s.parentPhone}</p>
                  </TableCell>
                  <TableCell>{s.bus ? s.bus.busNumber : <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                  <TableCell>
                    <TransportStatusBadge status={s.transportStatus} />
                    {s.lastScanAt && <p className="mt-1 hidden text-[11px] text-muted-foreground xl:block">{formatDateTime(s.lastScanAt)}</p>}
                  </TableCell>
                  <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.fullName}`}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setViewingId(s.id)}><Eye /> View details</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openEdit(s.id)}><Pencil /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(s)}><Trash2 /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        {students.data && <Pagination {...students.data} onPageChange={setPage} />}
      </Card>

      <StudentFormDialog open={formOpen} onOpenChange={setFormOpen} studentId={editingId} buses={buses.data ?? []} onSaved={onSaved} />
      <StudentDetailSheet studentId={viewingId} onClose={() => setViewingId(null)} onEdit={openEdit} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.fullName ?? 'student'}?`}
        description="The student record and bus assignment will be removed and their RFID card deactivated. Historical scans and notifications are kept for audit."
        onConfirm={confirmDelete}
      />
    </div>
  )
}
