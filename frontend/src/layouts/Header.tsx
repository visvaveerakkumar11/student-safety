import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Bell, CalendarDays, ChevronDown, ChevronRight, LogOut, Menu, Search, Settings, XCircle } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { notificationsApi } from '@/services/api'
import { formatDate, initials, timeAgo } from '@/utils/format'
import { findNavItem } from './navigation'

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { admin, logout } = useAuth()
  const [query, setQuery] = useState('')
  const page = findNavItem(pathname)
  const isDetail = page && pathname !== page.to && page.to !== '/'

  const failed = useApi(() => notificationsApi.list({ status: 'FAILED', size: 5 }), [], { pollMs: 15000 })
  const failedCount = failed.data?.totalElements ?? 0

  function search(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/students?q=${encodeURIComponent(q)}` : '/students')
    setQuery('')
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu} aria-label="Open navigation">
          <Menu />
        </Button>

        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Dashboard</Link>
            {page && page.to !== '/' && (
              <>
                <ChevronRight className="size-3" aria-hidden />
                {isDetail ? <Link to={page.to} className="hover:text-foreground">{page.label}</Link> : <span className="text-foreground">{page.label}</span>}
              </>
            )}
            {isDetail && (
              <>
                <ChevronRight className="size-3" aria-hidden />
                <span className="text-foreground">Details</span>
              </>
            )}
          </nav>
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-foreground">{page?.label ?? 'Page not found'}</h1>
        </div>

        <form onSubmit={search} className="relative hidden w-64 md:block" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, RFID UID…"
            aria-label="Search students"
            className="h-9 bg-muted/60 pl-8"
          />
        </form>

        <div className="hidden items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs text-muted-foreground xl:flex">
          <CalendarDays className="size-3.5" aria-hidden />
          {formatDate(new Date().toISOString())}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications: ${failedCount} failed`}>
              <Bell />
              {failedCount > 0 && (
                <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white">
                  {failedCount > 99 ? '99+' : failedCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Failed notifications needing attention</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {failed.data?.content.length ? (
              failed.data.content.map((n) => (
                <DropdownMenuItem key={n.id} onSelect={() => navigate('/notifications?status=FAILED')} className="items-start gap-2">
                  <XCircle className="mt-0.5 size-4 text-destructive" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.studentName} · {n.busNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.failureReason ?? 'Delivery failed'} · {timeAgo(n.createdAt)}</p>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">All parent notifications are healthy.</p>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/notifications')} className="justify-center text-brand">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {admin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Account menu">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">{initials(admin.fullName)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{admin.fullName.split(' ')[0]}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{admin.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/settings')}><Settings /> Settings</DropdownMenuItem>
              <DropdownMenuItem onSelect={logout} variant="destructive"><LogOut /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
