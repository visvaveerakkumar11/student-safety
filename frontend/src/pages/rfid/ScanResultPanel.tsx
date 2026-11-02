import { Link } from 'react-router'
import { CheckCircle2, CircleDashed, ShieldCheck, ShieldX, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/PageStates'
import { EventTypeBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
import type { RejectionReason, ScanResponse } from '@/types/api'
import { formatTime, formatUid, rejectionReasonLabel } from '@/utils/format'

// The checks run by the backend, in order. A rejection maps to the first check that failed.
const STEPS: { label: string; fails: RejectionReason[] }[] = [
  { label: 'Bus registered and in service', fails: ['BUS_NOT_FOUND', 'BUS_NOT_ACTIVE'] },
  { label: 'Card registered to a student', fails: ['UNKNOWN_CARD'] },
  { label: 'Card active', fails: ['CARD_INACTIVE'] },
  { label: 'Student authorised for this bus', fails: ['STUDENT_NOT_ASSIGNED', 'UNAUTHORIZED_BUS'] },
  { label: 'Not a duplicate tap', fails: ['DUPLICATE_SCAN'] },
  { label: 'Valid boarding / exit sequence', fails: ['ALREADY_ONBOARD', 'NOT_ONBOARD'] },
  { label: 'Seat available on bus', fails: ['BUS_FULL'] },
]

type StepState = 'pass' | 'fail' | 'skipped'

export function ScanResultPanel({ result }: { result: ScanResponse | null }) {
  if (!result) {
    return (
      <Card className="shadow-xs ring-border">
        <CardHeader>
          <CardTitle>Verification result</CardTitle>
          <CardDescription>The outcome of the last tap appears here.</CardDescription>
        </CardHeader>
        <CardContent><EmptyState icon={ShieldCheck} title="Waiting for a tap" description="Pick a student card or enter a UID and tap." /></CardContent>
      </Card>
    )
  }

  const failedAt = result.rejectionReason ? STEPS.findIndex((s) => s.fails.includes(result.rejectionReason!)) : -1
  const stepState = (i: number): StepState => (failedAt === -1 || i < failedAt ? 'pass' : i === failedAt ? 'fail' : 'skipped')
  const { event, student } = result

  return (
    <Card className={cn('shadow-xs ring-2', result.accepted ? 'ring-emerald-500/40' : 'ring-red-500/40')}>
      <CardHeader>
        <div className={cn('flex items-start gap-3 rounded-xl p-4', result.accepted ? 'bg-emerald-50' : 'bg-red-50')}>
          {result.accepted
            ? <ShieldCheck className="size-8 shrink-0 text-emerald-600" aria-hidden />
            : <ShieldX className="size-8 shrink-0 text-red-600" aria-hidden />}
          <div className="min-w-0">
            <CardTitle className={cn('text-base', result.accepted ? 'text-emerald-800' : 'text-red-800')}>
              {result.accepted ? 'Verified' : `Rejected: ${rejectionReasonLabel[result.rejectionReason!]}`}
            </CardTitle>
            <p className={cn('mt-0.5 text-sm', result.accepted ? 'text-emerald-800/90' : 'text-red-800/90')}>{result.message}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Student" value={student ? <>{student.fullName}<span className="block text-xs font-normal text-muted-foreground">{student.admissionNumber} · {student.className} {student.section}</span></> : 'Unidentified'} />
          <Field label="Card" value={<span className="font-mono">{formatUid(event.rfidUid)}</span>} />
          <Field label="Bus" value={event.busNumber ?? '—'} />
          <Field label="Event" value={event.eventType ? <EventTypeBadge type={event.eventType} /> : '—'} />
          <Field label="Time" value={formatTime(event.scannedAt)} />
          {result.busCapacity !== null && <Field label="Onboard now" value={`${result.busOnboardCount} / ${result.busCapacity}`} />}
        </dl>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Verification checks</p>
          <ol className="space-y-1.5">
            {STEPS.map((step, i) => <Step key={step.label} label={step.label} state={stepState(i)} />)}
            <Step label="Parent notification queued" state={result.notificationId ? 'pass' : 'skipped'} />
          </ol>
        </div>

        {result.notificationId && (
          <p className="text-xs text-muted-foreground">
            Parent SMS #{result.notificationId} queued via the simulated provider. Track it on{' '}
            <Link to="/notifications" className="font-medium text-brand hover:underline">Notifications</Link>.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Step({ label, state }: { label: string; state: StepState }) {
  const Icon = state === 'pass' ? CheckCircle2 : state === 'fail' ? XCircle : CircleDashed
  return (
    <li className={cn('flex items-center gap-2 text-[13px]', state === 'skipped' && 'text-muted-foreground')}>
      <Icon className={cn('size-4 shrink-0', state === 'pass' && 'text-emerald-600', state === 'fail' && 'text-red-600')} aria-hidden />
      <span className={cn(state === 'fail' && 'font-medium text-red-700')}>{label}</span>
      <span className="sr-only">{state === 'pass' ? 'passed' : state === 'fail' ? 'failed' : 'not checked'}</span>
    </li>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  )
}
