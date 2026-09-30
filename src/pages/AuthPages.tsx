import { useEffect, useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useNext } from '../auth/useNext'
import { authMessage, providerSettings, signIn, signInWithGoogle, signUp, useAuth } from '../auth/auth'
import { primaryButton, secondaryButton, textLink } from '../components/styles'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../lib/demo.js'
import { SUPABASE_CONFIGURED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, UNREACHABLE } from '../lib/supabase'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const input = 'h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-text'

function Field({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={input} {...props} />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

function AuthShell({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  useDocumentTitle(title)
  return (
    <section className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{intro}</p>
      {children}
      <p className="mt-8 text-sm text-muted">
        <Link to="/privacy" className={textLink}>
          How we handle your data
        </Link>
      </p>
    </section>
  )
}

function ErrorText({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-warning-surface px-3 py-2 text-sm text-warning">
      {message}
    </p>
  )
}

// Password reset needs an email this demo can't send, so there's no form that
// would silently send nothing: the link explains instead.
function ForgotPassword() {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="text-sm">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className={textLink}>
        Forgot your password?
      </button>
      {open && (
        <p id={id} className="mt-2 text-muted">
          Resetting a password needs an email, and this demo can’t send email, so reset isn’t available here. Use the demo
          account below, or create a new account.
        </p>
      )}
    </div>
  )
}

function useGoogleAvailable(): boolean {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return
    let cancelled = false
    providerSettings(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY).then((s) => !cancelled && setAvailable(Boolean(s?.google)))
    return () => {
      cancelled = true
    }
  }, [])
  return available
}

export function SignInPage() {
  const status = useAuth((s) => s.status)
  const next = useNext()
  const navigate = useNavigate()
  const google = useGoogleAvailable()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(SUPABASE_CONFIGURED ? '' : UNREACHABLE)
  const [busy, setBusy] = useState(false)

  if (status === 'signed-in') return <Navigate to={next} replace />

  const submit = async (e?: string, p?: string) => {
    setBusy(true)
    setError('')
    const message = await signIn(e ?? email, p ?? password)
    setBusy(false)
    if (message) setError(message)
    else await navigate(next, { replace: true })
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Enter your email and password.')
    void submit()
  }
  // Fills the visible form with the demo credentials, then signs in with them.
  const signInAsDemo = () => {
    setEmail(DEMO_EMAIL)
    setPassword(DEMO_PASSWORD)
    void submit(DEMO_EMAIL, DEMO_PASSWORD)
  }

  return (
    <AuthShell
      title="Sign in"
      intro="An account keeps your addresses and orders across devices. You don’t need one to shop: guest checkout works without it."
    >
      <aside aria-labelledby="demo-heading" className="mt-6 rounded-xl border border-border bg-surface p-4">
        <h2 id="demo-heading" className="font-bold">
          Don’t want to register? Use the demo account
        </h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="font-mono select-all">{DEMO_EMAIL}</dd>
          <dt className="text-muted">Password</dt>
          <dd className="font-mono select-all">{DEMO_PASSWORD}</dd>
        </dl>
        <p className="mt-2 text-sm text-muted">
          The demo data is shared, so others may change it; it’s reset every few days. Its email and password can’t be
          changed.
        </p>
        <button type="button" onClick={signInAsDemo} disabled={busy || !SUPABASE_CONFIGURED} className={`${secondaryButton} mt-3 w-full`}>
          Sign in as demo
        </button>
      </aside>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText message={error} />
        <button type="submit" disabled={busy || !SUPABASE_CONFIGURED} className={primaryButton}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <ForgotPassword />
      </form>

      {google && (
        <>
          <p className="my-4 text-center text-sm text-muted">or</p>
          <button
            type="button"
            onClick={async () => {
              const message = await signInWithGoogle(next)
              if (message) setError(message)
            }}
            className={`${secondaryButton} w-full`}
          >
            Continue with Google
          </button>
        </>
      )}

      <p className="mt-6 text-sm">
        New here?{' '}
        <Link to={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className={textLink}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}

export function SignUpPage() {
  const status = useAuth((s) => s.status)
  const next = useNext()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(SUPABASE_CONFIGURED ? '' : UNREACHABLE)
  const [busy, setBusy] = useState(false)

  if (status === 'signed-in') return <Navigate to={next} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return setError('Enter your email address.')
    if (password.length < 8) return setError('Choose a password of at least 8 characters.')
    setBusy(true)
    setError('')
    const message = await signUp(name, email, password)
    setBusy(false)
    if (message) setError(message)
    else await navigate(next, { replace: true })
  }

  return (
    <AuthShell
      title="Create an account"
      intro="Your addresses and orders will follow you across devices. This demo can’t send email, so there’s no confirmation email: your account is ready straight away."
    >
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="Name (optional)" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorText message={error} />
        <button type="submit" disabled={busy || !SUPABASE_CONFIGURED} className={primaryButton}>
          {busy ? 'Creating your account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-sm">
        Already have an account?{' '}
        <Link to={`/signin${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className={textLink}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

// Google sends people back here; supabase-js exchanges the code for a session.
export function AuthCallbackPage() {
  useDocumentTitle('Signing in')
  const status = useAuth((s) => s.status)
  const next = useNext()
  const [params] = useSearchParams()
  const oauthError = params.get('error_description') ?? params.get('error')
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 10_000)
    return () => clearTimeout(timer)
  }, [])

  if (status === 'signed-in') return <Navigate to={next} replace />
  if (oauthError || timedOut) {
    return (
      <section className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight">Sign-in didn’t finish</h1>
        <p role="alert" className="mt-2 text-muted">
          {oauthError ? authMessage({ message: oauthError }) : UNREACHABLE}
        </p>
        <Link to="/signin" className={`${primaryButton} mt-6`}>
          Back to sign in
        </Link>
      </section>
    )
  }
  return (
    <p role="status" className="mx-auto max-w-md px-4 py-12 text-muted">
      Signing you in…
    </p>
  )
}
