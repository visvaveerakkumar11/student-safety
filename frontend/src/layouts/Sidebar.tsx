import { NavLink } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { initials } from '@/utils/format'
import { navItems } from './navigation'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { admin } = useAuth()
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-white shadow-sm">
          <ShieldCheck className="size-[18px]" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-white">SafeRide</p>
          <p className="text-[11px] text-sidebar-foreground/70">Child Safety Verification</p>
        </div>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-white'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[#5b8cff]" aria-hidden />}
                <Icon className={cn('size-4 shrink-0', isActive ? 'text-[#8fb0ff]' : 'text-sidebar-foreground/70')} aria-hidden />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {admin && (
        <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-4">
          <Avatar className="size-8">
            <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">{initials(admin.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium text-white">{admin.fullName}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/70">{admin.email}</p>
          </div>
        </div>
      )}
    </div>
  )
}
