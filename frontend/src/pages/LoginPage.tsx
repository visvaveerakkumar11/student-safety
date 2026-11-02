import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { BellRing, Loader2, Lock, Mail, Radio, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/services/http'

const highlights = [
  { icon: Radio, title: 'RFID verified boarding', text: 'Every tap is checked against the student, card and assigned bus.' },
  { icon: BellRing, title: 'Instant parent alerts', text: 'Guardians are notified the moment their child boards or exits.' },
  { icon: ShieldCheck, title: 'Complete audit trail', text: 'Accepted and rejected scans are recorded with timestamps.' },
]

export default function LoginPage() {
  const { admin, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (admin) return <Navigate to={from} replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand"><ShieldCheck className="size-5" /></span>
          <div className="leading-tight">
            <p className="font-semibold">SafeRide</p>
            <p className="text-xs text-white/60">Child Safety Verification System</p>
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">Know every child is safely on board.</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Real-time RFID verification for school transport, with parent notifications and a live view of every bus.
          </p>
          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10"><Icon className="size-4" /></span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-white/60">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/40">School Transport Administration Portal</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-white"><ShieldCheck className="size-5" /></span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Administrator access to the transport safety dashboard.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="username" required className="h-10 bg-card pl-9"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@school.edu" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" autoComplete="current-password" required className="h-10 bg-card pl-9"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-600/15">{error}</p>}
            <Button type="submit" className="h-10 w-full" disabled={submitting || !email || !password}>
              {submitting && <Loader2 className="animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
