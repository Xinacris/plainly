import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { changePassword, loadProfile, phoneError, saveProfile, type Profile } from '../account/profile'
import { isDemo, useAuth } from '../auth/auth'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'
import { primaryButton, secondaryButton } from '../components/styles'
import { t } from '../i18n'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const card = 'mt-6 rounded-xl border border-border bg-surface p-4 sm:p-6'

function Notice({ tone, children }: { tone: 'ok' | 'error'; children: string }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`text-sm ${tone === 'error' ? 'text-warning' : 'font-medium text-action'}`}>
      {children}
    </p>
  )
}

function DetailsForm({ userId, profile }: { userId: string; profile: Profile }) {
  const [name, setName] = useState(profile.fullName)
  const [phone, setPhone] = useState(profile.phone)
  const [result, setResult] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const invalid = phoneError(phone)
    if (invalid) return setResult({ tone: 'error', text: invalid })
    setBusy(true)
    const error = await saveProfile(userId, name, phone)
    setBusy(false)
    setResult(error ? { tone: 'error', text: error } : { tone: 'ok', text: t.profile.saved })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label={t.profile.name} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
      <Field label={t.profile.phone} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
      {result && <Notice tone={result.tone}>{result.text}</Notice>}
      <button type="submit" disabled={busy} className={`${primaryButton} self-start`}>
        {busy ? t.profile.saving : t.profile.saveDetails}
      </button>
    </form>
  )
}

function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [result, setResult] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setResult({ tone: 'error', text: t.profile.tooShort })
    if (password !== confirm) return setResult({ tone: 'error', text: t.profile.mismatch })
    setBusy(true)
    const error = await changePassword(password)
    setBusy(false)
    if (error) return setResult({ tone: 'error', text: error })
    setPassword('')
    setConfirm('')
    setResult({ tone: 'ok', text: t.profile.changed })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label={t.profile.newPassword} type="password" autoComplete="new-password" hint={t.profile.atLeast8} value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field label={t.profile.repeatPassword} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {result && <Notice tone={result.tone}>{result.text}</Notice>}
      <button type="submit" disabled={busy} className={`${secondaryButton} self-start`}>
        {busy ? t.profile.changing : t.profile.change}
      </button>
    </form>
  )
}

export function ProfilePage() {
  useDocumentTitle(t.profile.title)
  const status = useAuth((s) => s.status)
  const user = useAuth((s) => s.user)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    loadProfile(user.id, (user.user_metadata?.full_name as string | undefined) ?? '').then((result) => {
      if (cancelled) return
      if (result.ok) {
        setProfile(result.value)
        setError('')
      } else setError(result.message)
    })
    return () => {
      cancelled = true
    }
  }, [user, attempt])

  if (status === 'signed-out') return <Navigate to="/signin?next=%2Fprofile" replace />
  if (status === 'loading' || !user) return <StatusMessage role="status" title={t.profile.loading} />
  if (error) {
    return (
      <StatusMessage
        role="alert"
        title={t.profile.loadError}
        action={
          <button type="button" onClick={() => setAttempt((a) => a + 1)} className={primaryButton}>
            {t.common.tryAgain}
          </button>
        }
      >
        {error}
      </StatusMessage>
    )
  }
  if (!profile) return <StatusMessage role="status" title={t.profile.loading} />

  const demo = isDemo(user)
  return (
    <section className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">{t.profile.title}</h1>
      {demo && (
        <p className="mt-2 rounded-lg bg-warning-surface px-3 py-2 text-sm">
          {t.profile.demoNote}
        </p>
      )}

      <div className={card}>
        <h2 className="mb-4 text-lg font-bold">{t.profile.details}</h2>
        <DetailsForm key={user.id} userId={user.id} profile={profile} />
      </div>

      <div className={card}>
        <h2 className="text-lg font-bold">{t.profile.email}</h2>
        <p className="mt-2 font-medium break-all">{user.email}</p>
        <p className="mt-1 text-sm text-muted">
          {demo ? t.profile.demoEmail : t.profile.noEmailChange}
        </p>
      </div>

      <div className={card}>
        <h2 className="mb-4 text-lg font-bold">{t.profile.password}</h2>
        {demo ? (
          <p className="text-sm text-muted">{t.profile.demoPassword}</p>
        ) : (
          <PasswordForm />
        )}
      </div>

      <p className="mt-6 text-sm">
        <Link to="/privacy" className="font-medium text-action underline underline-offset-2">
          {t.common.privacyLink}
        </Link>
      </p>
    </section>
  )
}
