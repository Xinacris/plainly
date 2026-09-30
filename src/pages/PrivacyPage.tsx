import { Link } from 'react-router'
import { textLink } from '../components/styles'
import { formatDate, t } from '../i18n'
import { CONTACT_EMAIL } from '../lib/contact'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const UPDATED = new Date(2026, 9, 1)
const h2 = 'mt-8 text-lg font-bold tracking-tight'

export function PrivacyPage() {
  const p = t.privacy
  useDocumentTitle(p.title)
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 leading-relaxed">
      <h1 className="text-2xl font-bold tracking-tight">{p.title}</h1>
      <p className="mt-1 text-sm text-muted">{p.updated(formatDate(UPDATED, { dateStyle: 'long' }))}</p>

      <h2 className={h2}>{p.demoHeading}</h2>
      <p className="mt-2">{p.demo}</p>

      <h2 className={h2}>{p.guestHeading}</h2>
      <p className="mt-2">{p.guest}</p>

      <h2 className={h2}>{p.signedInHeading}</h2>
      <p className="mt-2">{p.signedInLead}</p>
      <ul className="mt-2 list-disc pl-6">
        {p.stores.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-2">{p.move}</p>
      <p className="mt-2">{p.where}</p>

      <h2 className={h2}>{p.googleHeading}</h2>
      <p className="mt-2">{p.google}</p>

      <h2 className={h2}>{p.dontHeading}</h2>
      <p className="mt-2">{p.dont}</p>

      <h2 className={h2}>{p.paymentsHeading}</h2>
      <p className="mt-2">{p.payments}</p>

      <h2 className={h2}>{p.deleteHeading}</h2>
      <p className="mt-2">
        {p.deleteBefore}
        <a href={`mailto:${CONTACT_EMAIL}`} className={textLink}>
          {CONTACT_EMAIL}
        </a>
        {p.deleteAfter}
      </p>

      <p className="mt-10 text-sm text-muted">
        <Link to="/" className={textLink}>
          {p.back}
        </Link>
      </p>
    </article>
  )
}
