// Mirrors the backend DTOs (com.childsafety.dto). Timestamps are ISO-8601 strings, dates are YYYY-MM-DD.

export type TransportStatus = 'NOT_BOARDED' | 'ONBOARD' | 'EXITED'
export type BusStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
export type ScanEventType = 'BOARDING' | 'EXIT'
export type ScanResult = 'ACCEPTED' | 'REJECTED'
export type ScanSource = 'SIMULATOR' | 'READER'
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'
export type RejectionReason =
  | 'BUS_NOT_FOUND'
  | 'BUS_NOT_ACTIVE'
  | 'UNKNOWN_CARD'
  | 'CARD_INACTIVE'
  | 'STUDENT_NOT_ASSIGNED'
  | 'UNAUTHORIZED_BUS'
  | 'DUPLICATE_SCAN'
  | 'ALREADY_ONBOARD'
  | 'NOT_ONBOARD'
  | 'BUS_FULL'

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface Admin {
  id: number
  email: string
  fullName: string
  lastLoginAt: string | null
}

export interface LoginResponse {
  token: string
  expiresAt: string
  admin: Admin
}

export interface BusRef {
  id: number
  busNumber: string
  routeName: string
}

export interface Bus {
  id: number
  busNumber: string
  registrationNumber: string
  driverName: string
  driverPhone: string
  routeName: string
  capacity: number
  status: BusStatus
  assignedCount: number
  onboardCount: number
  createdAt: string
  updatedAt: string
}

export interface BusInput {
  busNumber: string
  registrationNumber: string
  driverName: string
  driverPhone: string
  routeName: string
  capacity: number
  status: BusStatus
}

export interface Student {
  id: number
  admissionNumber: string
  fullName: string
  className: string
  section: string
  parentName: string
  parentPhone: string
  rfidUid: string | null
  bus: BusRef | null
  transportStatus: TransportStatus
  lastScanAt: string | null
  createdAt: string
}

export interface StudentInput {
  admissionNumber: string
  fullName: string
  className: string
  section: string
  parentName: string
  parentPhone: string
  rfidUid: string
  busId: number | null
}

export interface ScanEvent {
  id: number
  rfidUid: string
  studentId: number | null
  studentName: string | null
  busId: number | null
  busNumber: string | null
  eventType: ScanEventType | null
  result: ScanResult
  rejectionReason: RejectionReason | null
  message: string
  source: ScanSource
  scannedAt: string
}

export interface Notification {
  id: number
  scanEventId: number | null
  studentId: number | null
  studentName: string
  busNumber: string
  recipientName: string
  recipientPhone: string
  eventType: ScanEventType
  message: string
  status: NotificationStatus
  provider: string
  simulated: boolean
  providerMessageId: string | null
  failureReason: string | null
  attempts: number
  createdAt: string
  sentAt: string | null
  deliveredAt: string | null
}

export interface StudentDetail {
  student: Student
  recentScans: ScanEvent[]
  recentNotifications: Notification[]
}

export interface BusDetail {
  bus: Bus
  students: Student[]
  recentScans: ScanEvent[]
}

export interface ScanRequest {
  busId: number
  rfidUid: string
  eventType: ScanEventType | null
}

export interface ScanResponse {
  accepted: boolean
  rejectionReason: RejectionReason | null
  message: string
  event: ScanEvent
  student: {
    id: number
    fullName: string
    admissionNumber: string
    className: string
    section: string
    transportStatus: TransportStatus
  } | null
  busOnboardCount: number | null
  busCapacity: number | null
  notificationId: number | null
}

export interface DashboardSummary {
  totalStudents: number
  studentsOnboard: number
  unassignedStudents: number
  totalBuses: number
  activeBuses: number
  busesOnRoute: number
  notificationsSent: number
  notificationsDelivered: number
  notificationsFailed: number
  notificationsPending: number
  deliveryRate: number
  scansToday: number
  boardingsToday: number
  exitsToday: number
  rejectedToday: number
  boardingsYesterday: number
  notificationsToday: number
  notificationsYesterday: number
}

export type ActivityKind = 'SCAN_ACCEPTED' | 'SCAN_REJECTED' | 'NOTIFICATION_DELIVERED' | 'NOTIFICATION_FAILED'

export interface ActivityItem {
  kind: ActivityKind
  title: string
  description: string
  timestamp: string
}

export interface TimeSeriesPoint {
  periodStart: string
  boardings: number
  exits: number
  rejected: number
}

export interface AnalyticsSummary {
  from: string
  to: string
  totalScans: number
  acceptedScans: number
  rejectedScans: number
  verificationSuccessRate: number
  rejectionsByReason: { reason: RejectionReason; count: number }[]
  notificationsByStatus: { status: NotificationStatus; count: number }[]
  notificationDeliveryRate: number
  busUsage: {
    busId: number
    busNumber: string
    capacity: number
    assigned: number
    onboard: number
    boardings: number
    averageDailyBoardings: number
  }[]
}

export interface SystemSettings {
  timezone: string
  duplicateScanWindowSeconds: number
  notificationProvider: string
  notificationsSimulated: boolean
  simulatedFailureRate: number
  readerApiKeyConfigured: boolean
}
