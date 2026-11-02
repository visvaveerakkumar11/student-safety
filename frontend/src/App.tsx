import { Link, Route, Routes } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/PageStates'
import { AppLayout } from '@/layouts/AppLayout'
import AnalyticsPage from '@/pages/AnalyticsPage'
import BusDetailPage from '@/pages/BusDetailPage'
import BusesPage from '@/pages/BusesPage'
import LiveMonitoringPage from '@/pages/LiveMonitoringPage'
import LoginPage from '@/pages/LoginPage'
import NotificationsPage from '@/pages/NotificationsPage'
import OverviewPage from '@/pages/OverviewPage'
import RfidActivityPage from '@/pages/RfidActivityPage'
import SettingsPage from '@/pages/SettingsPage'
import StudentsPage from '@/pages/StudentsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="live" element={<LiveMonitoringPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="buses" element={<BusesPage />} />
        <Route path="buses/:id" element={<BusDetailPage />} />
        <Route path="rfid" element={<RfidActivityPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="*"
          element={
            <EmptyState
              title="Page not found"
              description="The page you are looking for does not exist."
              action={<Button asChild variant="outline"><Link to="/">Back to overview</Link></Button>}
            />
          }
        />
      </Route>
    </Routes>
  )
}
