import { useState } from 'react'
import { Loader2, LogIn, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { rfidApi } from '@/services/api'
import { getErrorMessage } from '@/services/http'
import type { BusRef, ScanEventType, TransportStatus } from '@/types/api'

/**
 * Marks a student onboard or exited by recording a tap of their own card on their assigned bus.
 * It goes through the same verification as a real RFID reader, so the status update and the parent
 * SMS happen exactly as for a physical tap, and invalid changes are rejected with the reason.
 */
export function StudentStatusButton({ student, size = 'sm', onChanged }: {
  student: { fullName: string; rfidUid: string | null; bus: BusRef | null; transportStatus: TransportStatus }
  size?: 'xs' | 'sm'
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const eventType: ScanEventType = student.transportStatus === 'ONBOARD' ? 'EXIT' : 'BOARDING'
  const label = eventType === 'EXIT' ? 'Mark exited' : 'Mark onboard'
  const blocked = !student.bus ? 'Assign a bus first' : !student.rfidUid ? 'Issue an RFID card first' : null

  async function change() {
    if (!student.bus || !student.rfidUid) return
    setBusy(true)
    try {
      const r = await rfidApi.scan({ busId: student.bus.id, rfidUid: student.rfidUid, eventType })
      if (r.accepted) {
        toast.success(r.message, { description: 'Parent SMS alert queued — track it under Notifications.' })
      } else {
        toast.error(`${label} rejected`, { description: r.message })
      }
      onChanged()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" variant="outline" size={size} disabled={busy || !!blocked} title={blocked ?? undefined}
      aria-label={`${label}: ${student.fullName}`}
      onClick={(e) => { e.stopPropagation(); void change() }}>
      {busy ? <Loader2 className="animate-spin" /> : eventType === 'EXIT' ? <LogOut /> : <LogIn />}
      {blocked ?? label}
    </Button>
  )
}
