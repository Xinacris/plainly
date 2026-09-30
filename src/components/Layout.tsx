import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useTrayVisible } from '../compare/compare'
import { CartToast } from './CartToast'
import { CompareTray } from './CompareTray'
import { ErrorBoundary } from './ErrorBoundary'
import { Footer } from './Footer'
import { Header } from './Header'
import { OfflineBanner } from './OfflineBanner'
import { AccountNotice, MoveDataPrompt } from './MoveDataPrompt'
import { RouteErrorBoundary } from './RouteErrorBoundary'

export function Layout() {
  const { pathname } = useLocation()
  // Room at the bottom so the fixed tray never covers the end of the page or the footer.
  const trayVisible = useTrayVisible()
  return (
    <div className={`flex min-h-dvh flex-col ${trayVisible ? 'pb-32 sm:pb-24' : ''}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:shadow"
      >
        Skip to main content
      </a>
      <Header />
      <OfflineBanner />
      <AccountNotice />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
      <Footer />
      {/* The tray reads the catalog outside the route's boundary. If that fails, the
          route shows the error and the tray just stays hidden. */}
      <ErrorBoundary key={pathname} onReset={() => {}} fallback={() => null}>
        <CompareTray />
      </ErrorBoundary>
      <ErrorBoundary key={`toast-${pathname}`} onReset={() => {}} fallback={() => null}>
        <CartToast />
      </ErrorBoundary>
      <MoveDataPrompt />
      {/* New pages start at the top; Back and Forward restore where you were. */}
      <ScrollRestoration />
    </div>
  )
}
