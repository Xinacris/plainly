import { useEffect } from 'react'
import { t } from '../i18n'

// Each page names itself in the browser tab and for screen readers' page announcements.
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? t.meta.pageTitle(title) : t.meta.siteTitle
  }, [title])
}
