import { Outlet } from 'react-router'
import { Header } from './Header'
import { RouteErrorBoundary } from './RouteErrorBoundary'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
    </div>
  )
}
