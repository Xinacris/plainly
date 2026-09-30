import { useSearchParams } from 'react-router'

/** Where to go after signing in: a same-site path from ?next=, or the home page. */
export function useNext(): string {
  const next = useSearchParams()[0].get('next') ?? '/'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}
