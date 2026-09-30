import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { Field } from '../components/Field'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useNext } from '../auth/useNext'
import { authMessage, providerSettings, signIn, signInWithGoogle, signUp, useAuth } from '../auth/auth'
import { primaryButton, secondaryButton, textLink } from '../components/styles'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../lib/demo.js'
import { t } from '../i18n'
import { SUPABASE_CONFIGURED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, unreachable } from '../lib/supabase'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function AuthShell({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  useDocumentTitle(title)
  return (
    <section className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{intro}</p>
      {children}
      <p className="mt-8 text-sm text-muted">
        <Link to="/privacy" className={textLink}>
          {t.common.privacyLink}
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
        {t.auth.forgot}
      </button>
      {open && (
        <p id={id} className="mt-2 text-muted">
          {t.auth.forgotBody}
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
  const [error, setError] = useState(SUPABASE_CONFIGURED ? '' : unreachable())
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
    if (!email.trim() || !password) return setError(t.auth.enterBoth)
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
      title={t.auth.signIn}
      intro={t.auth.signInIntro}
    >
      <aside aria-labelledby="demo-heading" className="mt-6 rounded-xl border border-border bg-surface p-4">
        <h2 id="demo-heading" className="font-bold">
          {t.auth.demoHeading}
        </h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">{t.auth.email}</dt>
          <dd className="font-mono select-all">{DEMO_EMAIL}</dd>
          <dt className="text-muted">{t.auth.password}</dt>
          <dd className="font-mono select-all">{DEMO_PASSWORD}</dd>
        </dl>
        <p className="mt-2 text-sm text-muted">
          {t.auth.demoNote}
        </p>
        <button type="button" onClick={signInAsDemo} disabled={busy || !SUPABASE_CONFIGURED} className={`${secondaryButton} mt-3 w-full`}>
          {t.auth.signInAsDemo}
        </button>
      </aside>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label={t.auth.email} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label={t.auth.password} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText message={error} />
        <button type="submit" disabled={busy || !SUPABASE_CONFIGURED} className={primaryButton}>
          {busy ? t.auth.signingIn : t.auth.signIn}
        </button>
        <ForgotPassword />
      </form>

      {google && (
        <>
          <p className="my-4 text-center text-sm text-muted">{t.auth.or}</p>
          <button
            type="button"
            onClick={async () => {
              const message = await signInWithGoogle(next)
              if (message) setError(message)
            }}
            className={`${secondaryButton} w-full`}
          >
            {t.auth.google}
          </button>
        </>
      )}

      <p className="mt-6 text-sm">
        {t.auth.newHere}{' '}
        <Link to={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className={textLink}>
          {t.auth.create}
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
  const [error, setError] = useState(SUPABASE_CONFIGURED ? '' : unreachable())
  const [busy, setBusy] = useState(false)

  if (status === 'signed-in') return <Navigate to={next} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return setError(t.auth.enterEmail)
    if (password.length < 8) return setError(t.auth.errors.weak)
    setBusy(true)
    setError('')
    const message = await signUp(name, email, password)
    setBusy(false)
    if (message) setError(message)
    else await navigate(next, { replace: true })
  }

  return (
    <AuthShell
      title={t.auth.create}
      intro={t.auth.signUpIntro}
    >
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label={t.auth.nameOptional} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label={t.auth.email} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label={t.auth.password}
          type="password"
          autoComplete="new-password"
          hint={t.profile.atLeast8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorText message={error} />
        <button type="submit" disabled={busy || !SUPABASE_CONFIGURED} className={primaryButton}>
          {busy ? t.auth.creating : t.auth.createButton}
        </button>
      </form>
      <p className="mt-6 text-sm">
        {t.auth.haveAccount}{' '}
        <Link to={`/signin${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className={textLink}>
          {t.auth.signIn}
        </Link>
      </p>
    </AuthShell>
  )
}

// Google sends people back here; supabase-js exchanges the code for a session.
export function AuthCallbackPage() {
  useDocumentTitle(t.auth.callbackTitle)
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
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.didntFinish}</h1>
        <p role="alert" className="mt-2 text-muted">
          {oauthError ? authMessage({ message: oauthError }) : unreachable()}
        </p>
        <Link to="/signin" className={`${primaryButton} mt-6`}>
          {t.auth.backToSignIn}
        </Link>
      </section>
    )
  }
  return (
    <p role="status" className="mx-auto max-w-md px-4 py-12 text-muted">
      {t.auth.signingYouIn}
    </p>
  )
}
