import { useState } from 'react'
import { KeyRound, Loader2, Server, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/PageStates'
import { Pill } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { authApi, systemApi } from '@/services/api'
import { getErrorMessage, getFieldErrors } from '@/services/http'
import { formatDateTime, initials } from '@/utils/format'

export default function SettingsPage() {
  const { admin } = useAuth()
  const settings = useApi(systemApi.settings, [])
  const s = settings.data

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <Card className="shadow-xs ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserRound className="size-4 text-brand" /> Administrator profile</CardTitle>
          </CardHeader>
          <CardContent>
            {admin && (
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{initials(admin.fullName)}</span>
                <div>
                  <p className="font-semibold">{admin.fullName}</p>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                  <p className="text-xs text-muted-foreground">Last sign-in {formatDateTime(admin.lastLoginAt)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <ChangePasswordCard />
      </div>

      <Card className="h-fit shadow-xs ring-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Server className="size-4 text-brand" /> System configuration</CardTitle>
          <CardDescription>Read-only. These values come from the backend environment and are changed in <code className="text-xs">backend/.env</code>.</CardDescription>
        </CardHeader>
        <CardContent>
          {settings.error && !s ? <ErrorState message={settings.error} onRetry={settings.reload} />
            : !s ? <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
            : (
              <dl className="divide-y text-sm">
                <Row label="School timezone" value={s.timezone} />
                <Row label="Duplicate scan window" value={`${s.duplicateScanWindowSeconds} seconds`}
                  hint="Repeated taps of the same card on the same bus within this window are rejected." />
                <Row label="Notification provider" value={
                  <span className="flex items-center gap-2">{s.notificationProvider}{s.notificationsSimulated && <Pill tone="warning">Simulated</Pill>}</span>
                } hint={s.notificationsSimulated ? 'No real SMS is sent. Replace the provider to integrate an SMS gateway.' : undefined} />
                {s.notificationsSimulated && (
                  <Row label="Simulated failure rate" value={`${Math.round(s.simulatedFailureRate * 100)}%`}
                    hint="Share of messages the simulator fails, to demonstrate retries." />
                )}
                <Row label="Hardware reader API key" value={
                  s.readerApiKeyConfigured
                    ? <Pill tone="success" icon={ShieldCheck}>Configured</Pill>
                    : <Pill tone="neutral">Not configured</Pill>
                } hint="Physical RFID readers authenticate to POST /api/rfid/scan with the X-Reader-Key header." />
              </dl>
            )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div>
        <dt className="font-medium">{label}</dt>
        {hint && <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">{hint}</p>}
      </div>
      <dd className="shrink-0 text-muted-foreground">{value}</dd>
    </div>
  )
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) return setErrors({ confirm: 'Passwords do not match' })
    setSaving(true)
    setErrors({})
    try {
      await authApi.changePassword(current, next)
      toast.success('Password changed')
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setErrors(getFieldErrors(err))
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="shadow-xs ring-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="size-4 text-brand" /> Change password</CardTitle>
        <CardDescription>Use at least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <PasswordField id="currentPassword" label="Current password" value={current} onChange={setCurrent} error={errors.currentPassword} autoComplete="current-password" />
          <PasswordField id="newPassword" label="New password" value={next} onChange={setNext} error={errors.newPassword} autoComplete="new-password" minLength={8} />
          <PasswordField id="confirm" label="Confirm new password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" minLength={8} />
          <Button type="submit" disabled={saving || !current || !next || !confirm}>
            {saving && <Loader2 className="animate-spin" />} Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function PasswordField({ id, label, value, onChange, error, ...props }: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
} & Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="password" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} required maxLength={72} {...props} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
