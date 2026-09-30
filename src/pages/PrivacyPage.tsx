import { Link } from 'react-router'
import { textLink } from '../components/styles'
import { useDocumentTitle } from '../lib/useDocumentTitle'

// Placeholder until a real address is set up. Shown as plain text, not a mailto
// link, so it can't look like a working inbox.
const PRIVACY_CONTACT = 'privacy@plainly.example'
const UPDATED = 'September 30, 2026'

const h2 = 'mt-8 text-lg font-bold tracking-tight'

export function PrivacyPage() {
  useDocumentTitle('Privacy')
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 leading-relaxed">
      <h1 className="text-2xl font-bold tracking-tight">Privacy</h1>
      <p className="mt-1 text-sm text-muted">Last updated {UPDATED}</p>

      <h2 className={h2}>This is a demo project</h2>
      <p className="mt-2">
        Plainly is a portfolio project, not a real shop. Products and reviews come from DummyJSON’s public mock API.
        Nothing you order is shipped, and nothing is charged.
      </p>

      <h2 className={h2}>If you don’t sign in</h2>
      <p className="mt-2">
        Your cart, saved addresses, orders and returns are stored only in this browser (its local storage). They never
        leave your device, and clearing your browser’s site data removes them.
      </p>

      <h2 className={h2}>If you sign in</h2>
      <p className="mt-2">
        Accounts are being added and aren’t live yet; until they are, everything stays in your browser as described
        above. Once they are, a signed-in account stores:
      </p>
      <ul className="mt-2 list-disc pl-6">
        <li>your name, email address and phone number, if you add one;</li>
        <li>your saved addresses;</li>
        <li>your orders and returns, so they follow you across devices.</li>
      </ul>
      <p className="mt-2">
        This is kept with Supabase, our database and sign-in provider, in its EU region. Your cart always stays in your
        browser, signed in or not.
      </p>

      <h2 className={h2}>Google sign-in</h2>
      <p className="mt-2">
        If you choose “Continue with Google”, Google shares only your name and email address with us. We don’t get your
        Google password or access to anything else in your Google account.
      </p>

      <h2 className={h2}>What we don’t do</h2>
      <p className="mt-2">
        We don’t sell or share your data with anyone, show ads, or use tracking or analytics cookies. The site is
        hosted on Vercel, which keeps standard request logs (such as IP address, time and page) to run the service.
      </p>

      <h2 className={h2}>Payments</h2>
      <p className="mt-2">Payments are simulated. There’s no card form, and we never ask for or store payment details.</p>

      <h2 className={h2}>Deleting your account and data</h2>
      <p className="mt-2">
        To have an account and everything stored with it deleted, write to{' '}
        <span className="font-medium">{PRIVACY_CONTACT}</span> from the email address on the account. Browser-only data
        you can delete yourself by clearing this site’s data in your browser.
      </p>

      <p className="mt-10 text-sm text-muted">
        <Link to="/" className={textLink}>
          Back to the shop
        </Link>
      </p>
    </article>
  )
}
