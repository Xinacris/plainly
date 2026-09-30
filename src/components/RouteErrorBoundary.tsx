import { QueryErrorResetBoundary } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { ErrorBoundary } from './ErrorBoundary'
import { StatusMessage } from './StatusMessage'
import { primaryButton } from './styles'

// Wraps each route. "Try again" resets failed queries and re-renders the route,
// which makes suspense queries fetch again. Navigating away also clears the error.
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          key={pathname}
          onReset={reset}
          fallback={(retry) => (
            <StatusMessage
              role="alert"
              title="Something went wrong"
              action={
                <button type="button" onClick={retry} className={primaryButton}>
                  Try again
                </button>
              }
            >
              We couldn’t load this page. Check your connection and try again.
            </StatusMessage>
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
