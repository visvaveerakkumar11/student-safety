import { AlertTriangle, Inbox, RotateCw, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'

export function EmptyState({ icon: Icon = Inbox, title, description, action }: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">Couldn&apos;t load this data</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
      )}
    </div>
  )
}

/** Skeleton rows for tables while the first page loads. */
export function TableSkeleton({ rows = 6, columns }: { rows?: number; columns: number }) {
  return Array.from({ length: rows }, (_, r) => (
    <TableRow key={r} className="hover:bg-transparent">
      {Array.from({ length: columns }, (_, c) => (
        <TableCell key={c}><Skeleton className="h-4 w-full max-w-36" /></TableCell>
      ))}
    </TableRow>
  ))
}

/** Full-width table row hosting an empty or error state. */
export function TableMessage({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="p-0">{children}</TableCell>
    </TableRow>
  )
}
