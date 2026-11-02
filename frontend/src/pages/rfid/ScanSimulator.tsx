import { useState } from 'react'
import { CreditCard, Loader2, Radio, Shuffle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import { busesApi, rfidApi } from '@/services/api'
import { getErrorMessage, getFieldErrors } from '@/services/http'
import type { Bus, ScanEventType, ScanResponse } from '@/types/api'
import { formatUid } from '@/utils/format'

type Mode = 'AUTO' | ScanEventType

function randomUid() {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':')
}

/** Simulates an RFID reader mounted on a bus: pick a bus, tap a card, see the verdict. */
export function ScanSimulator({ buses, busId, onBusChange, onResult }: {
  buses: Bus[]
  busId: number | null
  onBusChange: (busId: number) => void
  onResult: (result: ScanResponse) => void
}) {
  const [uid, setUid] = useState('')
  const [mode, setMode] = useState<Mode>('AUTO')
  const [scanning, setScanning] = useState(false)
  const [uidError, setUidError] = useState<string>()

  // Cards authorised on the selected bus, for one-click taps. Refreshed after each scan.
  const roster = useApi(() => (busId ? busesApi.get(busId) : Promise.resolve(null)), [busId])

  async function scan(rfidUid = uid) {
    if (!busId) return toast.error('Select a bus first')
    if (!rfidUid.trim()) return setUidError('Enter or pick an RFID card UID')
    setScanning(true)
    try {
      const result = await rfidApi.scan({ busId, rfidUid, eventType: mode === 'AUTO' ? null : mode })
      onResult(result)
      void roster.reload()
    } catch (e) {
      const fields = getFieldErrors(e)
      if (fields.rfidUid) setUidError(fields.rfidUid)
      toast.error(getErrorMessage(e))
    } finally {
      setScanning(false)
    }
  }

  function tap(cardUid: string) {
    const formatted = formatUid(cardUid)
    setUid(formatted)
    void scan(formatted)
  }

  const activeBuses = buses.filter((b) => b.status === 'ACTIVE')
  const otherBuses = buses.filter((b) => b.status !== 'ACTIVE')
  const students = (roster.data?.students ?? []).filter((s) => s.rfidUid)

  return (
    <Card className="shadow-xs ring-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Radio className="size-4 text-brand" /> Scan simulator</CardTitle>
        <CardDescription>Simulates the RFID reader on a bus. Every tap runs the same verification as a hardware reader.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void scan() }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sim-bus">Reader on bus</Label>
              <Select value={busId ? String(busId) : undefined} onValueChange={(v) => onBusChange(Number(v))}>
                <SelectTrigger id="sim-bus" className="w-full"><SelectValue placeholder="Select a bus" /></SelectTrigger>
                <SelectContent position="popper">
                  {activeBuses.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.busNumber} · {b.routeName}</SelectItem>)}
                  {otherBuses.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.busNumber} · {b.status === 'MAINTENANCE' ? 'Maintenance' : 'Inactive'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Event</Label>
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="w-full">
                  <TabsTrigger value="AUTO">Auto</TabsTrigger>
                  <TabsTrigger value="BOARDING">Boarding</TabsTrigger>
                  <TabsTrigger value="EXIT">Exit</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sim-uid">RFID card UID</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <CreditCard className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="sim-uid" value={uid} onChange={(e) => { setUid(e.target.value); setUidError(undefined) }} placeholder="04:A3:1F:6B"
                  className="pl-8 font-mono" aria-invalid={!!uidError} autoComplete="off" />
              </div>
              <Button type="button" variant="outline" onClick={() => { setUid(randomUid()); setUidError(undefined) }} title="Fill a random unregistered card">
                <Shuffle /> <span className="hidden sm:inline">Unknown card</span>
              </Button>
            </div>
            {uidError && <p className="text-xs text-destructive">{uidError}</p>}
            {mode === 'AUTO' && <p className="text-xs text-muted-foreground">Auto picks boarding or exit from the student’s current status, like a single-tap reader.</p>}
          </div>

          <Button type="submit" className="w-full" disabled={scanning || !busId}>
            {scanning ? <Loader2 className="animate-spin" /> : <Radio />}
            Tap card
          </Button>
        </form>

        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Quick tap: students assigned to this bus</p>
          {!busId ? <p className="text-xs text-muted-foreground">Select a bus to list its students.</p>
            : roster.loading && !roster.data ? <div className="grid grid-cols-2 gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
            : students.length === 0 ? <p className="text-xs text-muted-foreground">No students with cards are assigned to this bus.</p>
            : (
              <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {students.map((s) => (
                  <button key={s.id} type="button" disabled={scanning} onClick={() => tap(s.rfidUid!)}
                    className={cn('flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors hover:border-brand/40 hover:bg-brand-soft/50 disabled:opacity-50',
                      s.transportStatus === 'ONBOARD' && 'border-brand/30 bg-brand-soft/40')}>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{s.fullName}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">{formatUid(s.rfidUid)}</span>
                    </span>
                    <span className={cn('shrink-0 text-[11px] font-medium', s.transportStatus === 'ONBOARD' ? 'text-brand' : 'text-muted-foreground')}>
                      {s.transportStatus === 'ONBOARD' ? 'Onboard' : s.transportStatus === 'EXITED' ? 'Exited' : 'Not boarded'}
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
