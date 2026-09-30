import { Outlet } from 'react-router'
import { useTrayVisible } from '../compare/compare'
import { CompareTray } from './CompareTray'
import { Header } from './Header'
import { RouteErrorBoundary } from './RouteErrorBoundary'

export function Layout() {
  // Room at the bottom so the fixed tray never covers the end of the page.
  const trayVisible = useTrayVisible()
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className={`flex-1 ${trayVisible ? 'pb-32 sm:pb-24' : ''}`}>
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
      <CompareTray />
    </div>
  )
}
