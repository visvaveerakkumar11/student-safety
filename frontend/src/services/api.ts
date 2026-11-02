import { http } from './http'
import type {
  ActivityItem,
  Admin,
  AnalyticsSummary,
  Bus,
  BusDetail,
  BusInput,
  DashboardSummary,
  LoginResponse,
  Notification,
  NotificationStatus,
  Page,
  ScanEvent,
  ScanEventType,
  ScanRequest,
  ScanResponse,
  ScanResult,
  Student,
  StudentDetail,
  StudentInput,
  SystemSettings,
  TimeSeriesPoint,
  TransportStatus,
} from '@/types/api'

/** Drops empty filter values so they are not sent as query parameters. */
function params<T extends object>(p: T) {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

export const authApi = {
  login: (email: string, password: string) =>
    http.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),
  me: () => http.get<Admin>('/auth/me').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    http.post('/auth/change-password', { currentPassword, newPassword }),
}

export const dashboardApi = {
  summary: () => http.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
  activity: (limit = 12) => http.get<ActivityItem[]>('/dashboard/activity', { params: { limit } }).then((r) => r.data),
}

export interface StudentFilters {
  q?: string
  className?: string
  busId?: number
  status?: TransportStatus
  sort?: string
  direction?: 'asc' | 'desc'
  page?: number
  size?: number
}

export const studentsApi = {
  list: (filters: StudentFilters) =>
    http.get<Page<Student>>('/students', { params: params(filters) }).then((r) => r.data),
  classes: () => http.get<string[]>('/students/classes').then((r) => r.data),
  get: (id: number) => http.get<StudentDetail>(`/students/${id}`).then((r) => r.data),
  create: (input: StudentInput) => http.post<Student>('/students', input).then((r) => r.data),
  update: (id: number, input: StudentInput) => http.put<Student>(`/students/${id}`, input).then((r) => r.data),
  remove: (id: number) => http.delete(`/students/${id}`),
}

export const busesApi = {
  list: () => http.get<Bus[]>('/buses').then((r) => r.data),
  get: (id: number) => http.get<BusDetail>(`/buses/${id}`).then((r) => r.data),
  create: (input: BusInput) => http.post<Bus>('/buses', input).then((r) => r.data),
  update: (id: number, input: BusInput) => http.put<Bus>(`/buses/${id}`, input).then((r) => r.data),
  remove: (id: number) => http.delete(`/buses/${id}`),
  assignStudents: (id: number, studentIds: number[]) => http.post(`/buses/${id}/students`, { studentIds }),
  unassignStudent: (id: number, studentId: number) => http.delete(`/buses/${id}/students/${studentId}`),
}

export interface ScanFilters {
  result?: ScanResult
  eventType?: ScanEventType
  busId?: number
  q?: string
  from?: string
  to?: string
  page?: number
  size?: number
}

export const rfidApi = {
  scan: (request: ScanRequest) => http.post<ScanResponse>('/rfid/scan', request).then((r) => r.data),
  activity: (filters: ScanFilters) =>
    http.get<Page<ScanEvent>>('/rfid/activity', { params: params(filters) }).then((r) => r.data),
}

export interface NotificationFilters {
  status?: NotificationStatus
  eventType?: ScanEventType
  q?: string
  page?: number
  size?: number
}

export const notificationsApi = {
  list: (filters: NotificationFilters) =>
    http.get<Page<Notification>>('/notifications', { params: params(filters) }).then((r) => r.data),
  get: (id: number) => http.get<Notification>(`/notifications/${id}`).then((r) => r.data),
  retry: (id: number) => http.post<Notification>(`/notifications/${id}/retry`).then((r) => r.data),
}

export type Granularity = 'daily' | 'weekly' | 'monthly'

export const analyticsApi = {
  series: (granularity: Granularity, from?: string, to?: string) =>
    http.get<TimeSeriesPoint[]>(`/analytics/${granularity}`, { params: params({ from, to }) }).then((r) => r.data),
  summary: (from?: string, to?: string) =>
    http.get<AnalyticsSummary>('/analytics/summary', { params: params({ from, to }) }).then((r) => r.data),
}

export const systemApi = {
  settings: () => http.get<SystemSettings>('/settings').then((r) => r.data),
}
