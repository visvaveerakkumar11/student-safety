import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/utils/format'

export function Pagination({ page, size, totalElements, totalPages, onPageChange }: {
  page: number
  size: number
  totalElements: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalElements === 0) return null
  const from = page * size + 1
  const to = Math.min(totalElements, (page + 1) * size)
  return (
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm text-muted-foreground">
      <p>
        Showing <span className="font-medium text-foreground">{formatNumber(from)}–{formatNumber(to)}</span> of{' '}
        <span className="font-medium text-foreground">{formatNumber(totalElements)}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">Page {page + 1} of {Math.max(totalPages, 1)}</span>
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page + 1 >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
