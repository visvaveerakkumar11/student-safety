import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  Send,
  ShieldCheck,
  ShieldX,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BusStatus, NotificationStatus, ScanEventType, ScanResult, TransportStatus } from '@/types/api'
import { notificationStatusLabel, transportStatusLabel } from '@/utils/format'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand'

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  danger: 'bg-red-50 text-red-700 ring-red-600/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  brand: 'bg-brand-soft text-brand ring-brand/20',
}

/** Status pill: always icon + label, so state is never conveyed by color alone. */
export function Pill({ tone, icon: Icon, children, className }: {
  tone: Tone
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', toneClasses[tone], className)}>
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  )
}

const transport: Record<TransportStatus, [Tone, LucideIcon]> = {
  ONBOARD: ['brand', ArrowUpRight],
  EXITED: ['success', CheckCircle2],
  NOT_BOARDED: ['neutral', CircleDashed],
}

export function TransportStatusBadge({ status }: { status: TransportStatus }) {
  const [tone, icon] = transport[status]
  return <Pill tone={tone} icon={icon}>{transportStatusLabel[status]}</Pill>
}

const busStatus: Record<BusStatus, [Tone, LucideIcon, string]> = {
  ACTIVE: ['success', CheckCircle2, 'Active'],
  INACTIVE: ['neutral', Ban, 'Inactive'],
  MAINTENANCE: ['warning', Wrench, 'Maintenance'],
}

export function BusStatusBadge({ status }: { status: BusStatus }) {
  const [tone, icon, label] = busStatus[status]
  return <Pill tone={tone} icon={icon}>{label}</Pill>
}

const notification: Record<NotificationStatus, [Tone, LucideIcon]> = {
  PENDING: ['warning', Clock],
  SENT: ['info', Send],
  DELIVERED: ['success', CheckCircle2],
  FAILED: ['danger', XCircle],
}

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  const [tone, icon] = notification[status]
  return <Pill tone={tone} icon={icon}>{notificationStatusLabel[status]}</Pill>
}

export function ScanResultBadge({ result }: { result: ScanResult }) {
  return result === 'ACCEPTED'
    ? <Pill tone="success" icon={ShieldCheck}>Verified</Pill>
    : <Pill tone="danger" icon={ShieldX}>Rejected</Pill>
}

export function EventTypeBadge({ type }: { type: ScanEventType | null }) {
  if (!type) return <span className="text-muted-foreground">—</span>
  return type === 'BOARDING'
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700"><ArrowUpRight className="size-3.5 text-chart-boarding" />Boarding</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700"><ArrowDownLeft className="size-3.5 text-chart-exit" />Exit</span>
}

export function SimulatedTag() {
  return <span className="rounded border border-dashed border-slate-300 px-1.5 py-px text-[10px] font-medium tracking-wide text-slate-500 uppercase">Simulated</span>
}
