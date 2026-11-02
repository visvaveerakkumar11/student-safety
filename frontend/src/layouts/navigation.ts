import { Activity, BarChart3, Bell, Bus, LayoutDashboard, Radar, Settings, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Subtitle shown under the page title in the header. */
  description: string
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, description: 'Real-time summary of school transport safety' },
  { to: '/live', label: 'Live Bus Monitoring', icon: Radar, description: 'Who is on which bus right now' },
  { to: '/students', label: 'Students', icon: Users, description: 'Student records, RFID cards and bus assignments' },
  { to: '/buses', label: 'Buses', icon: Bus, description: 'Fleet, drivers, routes and occupancy' },
  { to: '/rfid', label: 'RFID Activity', icon: Activity, description: 'Scan simulator and verification log' },
  { to: '/notifications', label: 'Notifications', icon: Bell, description: 'Parent alerts and delivery status' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, description: 'Transport and verification trends' },
  { to: '/settings', label: 'Settings', icon: Settings, description: 'Account and system configuration' },
]

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === '/') return navItems[0]
  return navItems.find((item) => item.to !== '/' && pathname.startsWith(item.to))
}
