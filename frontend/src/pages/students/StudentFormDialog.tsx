import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { studentsApi } from '@/services/api'
import { getErrorMessage, getFieldErrors } from '@/services/http'
import type { Bus, Student, StudentInput } from '@/types/api'
import { formatUid } from '@/utils/format'

const NO_BUS = 'none'

const empty: StudentInput = {
  admissionNumber: '', fullName: '', className: '', section: '', parentName: '', parentPhone: '', rfidUid: '', busId: null,
}

/** Create (student = null) or edit a student. Parent phone must be unmasked, so edits load the detail record. */
export function StudentFormDialog({ open, onOpenChange, studentId, buses, onSaved }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number | null
  buses: Bus[]
  onSaved: (student: Student) => void
}) {
  const [form, setForm] = useState<StudentInput>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const isEdit = studentId !== null

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (studentId === null) {
      setForm(empty)
      return
    }
    setLoading(true)
    studentsApi.get(studentId)
      .then(({ student: s }) => setForm({
        admissionNumber: s.admissionNumber, fullName: s.fullName, className: s.className, section: s.section,
        parentName: s.parentName, parentPhone: s.parentPhone, rfidUid: formatUid(s.rfidUid), busId: s.bus?.id ?? null,
      }))
      .catch((e) => { toast.error(getErrorMessage(e)); onOpenChange(false) })
      .finally(() => setLoading(false))
  }, [open, studentId, onOpenChange])

  const set = (key: keyof StudentInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const saved = isEdit ? await studentsApi.update(studentId, form) : await studentsApi.create(form)
      toast.success(isEdit ? 'Student updated' : 'Student added', { description: saved.fullName })
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      setErrors(getFieldErrors(err))
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const field = (key: keyof StudentInput, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} value={String(form[key] ?? '')} onChange={set(key)} aria-invalid={!!errors[key]} disabled={loading} {...props} />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit student' : 'Add student'}</DialogTitle>
            <DialogDescription>Student profile, guardian contact, RFID card and bus assignment.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {field('fullName', 'Full name', { placeholder: 'e.g. Aarav Sharma', required: true })}
            {field('admissionNumber', 'Admission number', { placeholder: 'ADM-2024-041', required: true })}
            {field('className', 'Class', { placeholder: 'Grade 5', required: true })}
            {field('section', 'Section', { placeholder: 'A', required: true, maxLength: 10 })}
            {field('parentName', 'Parent / guardian name', { required: true })}
            {field('parentPhone', 'Parent contact number', { placeholder: '+91 98400 12345', required: true, inputMode: 'tel' })}
            {field('rfidUid', 'RFID card UID', { placeholder: '04:A3:1F:6B', required: true, className: 'font-mono' })}
            <div className="space-y-1.5">
              <Label htmlFor="busId">Assigned bus</Label>
              <Select value={form.busId === null ? NO_BUS : String(form.busId)} disabled={loading}
                onValueChange={(v) => setForm((f) => ({ ...f, busId: v === NO_BUS ? null : Number(v) }))}>
                <SelectTrigger id="busId" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={NO_BUS}>No bus assigned</SelectItem>
                  {buses.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.busNumber} · {b.routeName}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.busId && <p className="text-xs text-destructive">{errors.busId}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || loading}>
              {saving && <Loader2 className="animate-spin" />}
              {isEdit ? 'Save changes' : 'Add student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
