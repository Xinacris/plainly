import { useEffect } from 'react'

// Each page names itself in the browser tab and for screen readers' page announcements.
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Plainly` : 'Plainly: shop without the noise'
  }, [title])
}
