import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/useAuth'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/** Protected shell: fixed sidebar on desktop, slide-over navigation on mobile. */
export function AppLayout() {
  const { admin, initializing } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-label="Loading" />
      </div>
    )
  }
  if (!admin) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar />
      </aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64 border-none p-0 sm:max-w-64" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <Header onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
