import { Link } from 'react-router'
import { t } from '../i18n'

const REPO_URL = 'https://github.com/Xinacris/plainly'
const link = 'font-medium text-action underline underline-offset-2 hover:text-action-hover'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted">
        <p>
          <span className="font-semibold text-text">Plainly</span> · {t.footer.about}
        </p>
        <p className="flex gap-4">
          <Link to="/privacy" className={link}>
            {t.footer.privacy}
          </Link>
          <Link to="/accessibility" className={link}>
            {t.footer.accessibility}
          </Link>
          <a href={REPO_URL} className={link}>
            {t.footer.source}
          </a>
        </p>
      </div>
    </footer>
  )
}
