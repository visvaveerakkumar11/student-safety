import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const ALL = '__all__'

/** Select with an "All" option; emits undefined when "All" is chosen. */
export function FilterSelect({ value, onChange, options, allLabel, className, ariaLabel }: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: { value: string; label: string }[]
  allLabel: string
  className?: string
  ariaLabel: string
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger className={cn('h-9 min-w-36 bg-card', className)} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
