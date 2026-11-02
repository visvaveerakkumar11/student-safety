import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Radio, Search } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FilterSelect } from '@/components/FilterSelect'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, TableMessage, TableSkeleton } from '@/components/PageStates'
import { EventTypeBadge, Pill, ScanResultBadge } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { busesApi, rfidApi } from '@/services/api'
import type { ScanEventType, ScanResponse, ScanResult } from '@/types/api'
import { formatDateTime, formatUid, rejectionReasonLabel } from '@/utils/format'
import { ScanResultPanel } from './rfid/ScanResultPanel'
import { ScanSimulator } from './rfid/ScanSimulator'

const PAGE_SIZE = 15
const COLUMNS = 7

export default function RfidActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const buses = useApi(busesApi.list, [])
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null)

  // Simulator bus comes from ?busId (deep links from Live Monitoring), else the first active bus.
  const paramBus = Number(searchParams.get('busId')) || null
  const simBusId = paramBus ?? buses.data?.find((b) => b.status === 'ACTIVE')?.id ?? null
  const setSimBus = (id: number) => { setSearchParams({ busId: String(id) }, { replace: true }); setLastResult(null) }

  const [result, setResult] = useState<ScanResult>()
  const [eventType, setEventType] = useState<ScanEventType>()
  const [logBus, setLogBus] = useState<string>()
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)

  const log = useApi(
    () => rfidApi.activity({ result, eventType, busId: logBus ? Number(logBus) : undefined, q: q.trim(), from, to, page, size: PAGE_SIZE }),
    [result, eventType, logBus, q, from, to, page],
    { pollMs: 10000 },
  )

  function onResult(r: ScanResponse) {
    setLastResult(r)
    if (page === 0) void log.reload()
    else setPage(0)
    void buses.reload()
  }

  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0) }
  const hasFilters = !!(result || eventType || logBus || q || from || to)

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <ScanSimulator buses={buses.data ?? []} busId={simBusId} onBusChange={setSimBus} onResult={onResult} />
        <ScanResultPanel result={lastResult} />
      </div>

      <Card className="gap-0 py-0 shadow-xs ring-border">
        <CardHeader className="flex flex-col gap-3 border-b py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Scan activity log</CardTitle>
            <CardDescription>Every tap is recorded, including rejected ones.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Student or card UID" className="h-9 pl-8" aria-label="Search scans" />
            </div>
            <FilterSelect ariaLabel="Filter by result" allLabel="All results" value={result}
              onChange={reset((v) => setResult(v as ScanResult | undefined))}
              options={[{ value: 'ACCEPTED', label: 'Verified' }, { value: 'REJECTED', label: 'Rejected' }]} />
            <FilterSelect ariaLabel="Filter by event" allLabel="All events" value={eventType}
              onChange={reset((v) => setEventType(v as ScanEventType | undefined))}
              options={[{ value: 'BOARDING', label: 'Boarding' }, { value: 'EXIT', label: 'Exit' }]} />
            <FilterSelect ariaLabel="Filter by bus" allLabel="All buses" value={logBus} onChange={reset(setLogBus)}
              options={(buses.data ?? []).map((b) => ({ value: String(b.id), label: b.busNumber }))} />
            <Input type="date" value={from} max={to || undefined} onChange={(e) => reset(setFrom)(e.target.value)} className="h-9 w-36" aria-label="From date" />
            <Input type="date" value={to} min={from || undefined} onChange={(e) => reset(setTo)(e.target.value)} className="h-9 w-36" aria-label="To date" />
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Time</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="hidden md:table-cell">Card UID</TableHead>
              <TableHead>Bus</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="hidden pr-4 lg:table-cell">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.error && !log.data ? <TableMessage columns={COLUMNS}><ErrorState message={log.error} onRetry={log.reload} /></TableMessage>
              : log.loading && !log.data ? <TableSkeleton columns={COLUMNS} rows={8} />
              : log.data?.content.length === 0 ? (
                <TableMessage columns={COLUMNS}>
                  <EmptyState icon={Radio} title={hasFilters ? 'No scans match these filters' : 'No scans recorded yet'}
                    description={hasFilters ? 'Adjust the filters or date range.' : 'Use the simulator above to tap a card.'} />
                </TableMessage>
              )
              : log.data?.content.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="tabular pl-4 text-xs whitespace-nowrap">{formatDateTime(e.scannedAt)}</TableCell>
                  <TableCell className="font-medium">{e.studentName ?? <span className="font-normal text-muted-foreground">Unidentified</span>}</TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">{formatUid(e.rfidUid)}</TableCell>
                  <TableCell>{e.busNumber ?? '—'}</TableCell>
                  <TableCell><EventTypeBadge type={e.eventType} /></TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <ScanResultBadge result={e.result} />
                      {e.rejectionReason && <span className="text-[11px] text-red-700 lg:hidden">{rejectionReasonLabel[e.rejectionReason]}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-sm pr-4 lg:table-cell">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs text-muted-foreground" title={e.message}>{e.message}</p>
                      {e.source === 'READER' && <Pill tone="info">Reader</Pill>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        {log.data && <Pagination {...log.data} onPageChange={setPage} />}
      </Card>
    </div>
  )
}
