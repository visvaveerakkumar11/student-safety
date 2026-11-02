import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { busesApi } from '@/services/api'
import { getErrorMessage, getFieldErrors } from '@/services/http'
import type { Bus, BusInput, BusStatus } from '@/types/api'

const empty: BusInput = {
  busNumber: '', registrationNumber: '', driverName: '', driverPhone: '', routeName: '', capacity: 40, status: 'ACTIVE',
}

const statuses: { value: BusStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
]

/** Create (bus = null) or edit a bus. */
export function BusFormDialog({ open, onOpenChange, bus, onSaved }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bus: Bus | null
  onSaved: (bus: Bus) => void
}) {
  const [form, setForm] = useState<BusInput>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(bus ? {
      busNumber: bus.busNumber, registrationNumber: bus.registrationNumber, driverName: bus.driverName,
      driverPhone: bus.driverPhone, routeName: bus.routeName, capacity: bus.capacity, status: bus.status,
    } : empty)
  }, [open, bus])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const saved = bus ? await busesApi.update(bus.id, form) : await busesApi.create(form)
      toast.success(bus ? 'Bus updated' : 'Bus added', { description: saved.busNumber })
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      setErrors(getFieldErrors(err))
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const field = (key: Exclude<keyof BusInput, 'status'>, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} value={String(form[key])} aria-invalid={!!errors[key]} {...props}
        onChange={(e) => setForm((f) => ({ ...f, [key]: key === 'capacity' ? Number(e.target.value) : e.target.value }))} />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{bus ? `Edit ${bus.busNumber}` : 'Add bus'}</DialogTitle>
            <DialogDescription>Vehicle, driver and route details. Capacity cannot drop below students currently onboard.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('busNumber', 'Bus number', { placeholder: 'BUS-07', required: true })}
            {field('registrationNumber', 'Registration number', { placeholder: 'TN 09 AB 1234', required: true })}
            {field('driverName', 'Driver name', { required: true })}
            {field('driverPhone', 'Driver contact', { placeholder: '+91 98400 12345', required: true, inputMode: 'tel' })}
            {field('routeName', 'Route', { placeholder: 'Route 7 · Velachery', required: true })}
            {field('capacity', 'Seating capacity', { type: 'number', min: 1, max: 100, required: true })}
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as BusStatus }))}>
                <SelectTrigger id="status" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  {statuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.status && <p className="text-xs text-destructive">{errors.status}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {bus ? 'Save changes' : 'Add bus'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
