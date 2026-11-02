import type { NotificationStatus, RejectionReason, TransportStatus } from '@/types/api'

// One date/time style across the app: "02 Nov 2026, 07:42 AM".
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
})
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
const shortDayFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' })
const monthFmt = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' })
const numberFmt = new Intl.NumberFormat('en-IN')

export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : '—')
export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : '—')
export const formatTime = (iso: string | null | undefined) => (iso ? timeFmt.format(new Date(iso)).toUpperCase() : '—')
export const formatNumber = (n: number) => numberFmt.format(n)

/** Parses a backend LocalDate (YYYY-MM-DD) as a local calendar day. */
export function parseLocalDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const formatShortDay = (date: string) => shortDayFmt.format(parseLocalDate(date))
export const formatMonth = (date: string) => monthFmt.format(parseLocalDate(date))

/** YYYY-MM-DD for a Date in local time (for API date filters). */
export function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

/** "04A31F6B" -> "04:A3:1F:6B" */
export function formatUid(uid: string | null | undefined) {
  if (!uid) return '—'
  return /^[0-9A-F]+$/.test(uid) && uid.length % 2 === 0 ? (uid.match(/.{2}/g) ?? []).join(':') : uid
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

export const transportStatusLabel: Record<TransportStatus, string> = {
  NOT_BOARDED: 'Not boarded',
  ONBOARD: 'Onboard',
  EXITED: 'Exited',
}

export const notificationStatusLabel: Record<NotificationStatus, string> = {
  PENDING: 'Pending',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
}

export const rejectionReasonLabel: Record<RejectionReason, string> = {
  BUS_NOT_FOUND: 'Unknown bus',
  BUS_NOT_ACTIVE: 'Bus not in service',
  UNKNOWN_CARD: 'Unknown card',
  CARD_INACTIVE: 'Card deactivated',
  STUDENT_NOT_ASSIGNED: 'No bus assigned',
  UNAUTHORIZED_BUS: 'Wrong bus',
  DUPLICATE_SCAN: 'Duplicate scan',
  ALREADY_ONBOARD: 'Already onboard',
  NOT_ONBOARD: 'Not onboard',
  BUS_FULL: 'Bus full',
}
