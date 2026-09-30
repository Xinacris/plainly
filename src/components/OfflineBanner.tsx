import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { exitSimulation, startSimulation, useNetwork } from '../lib/network'

// Shown while the connection is down, gone as soon as it's back. The live region is
// always in the page, so screen readers announce the message when it appears.
export function OfflineBanner() {
  const online = useNetwork((s) => s.online)
  const simulated = useNetwork((s) => s.simulated)
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()

  // A link to ?simulate=offline starts the simulation after the page has loaded, too.
  const params = new URLSearchParams(search)
  const asked = params.get('simulate') === 'offline'
  useEffect(() => {
    if (asked) startSimulation()
  }, [asked])

  const exit = () => {
    exitSimulation()
    if (!asked) return
    params.delete('simulate')
    const rest = params.toString()
    navigate({ pathname, search: rest ? `?${rest}` : '', hash }, { replace: true, preventScrollReset: true })
  }

  const offline = simulated || !online
  return (
    <div role="status">
      {offline && (
        <div className="border-b border-warning/40 bg-warning-surface">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm text-text">
            <p className="min-w-0 flex-1">
              <span className="font-semibold">You’re offline{simulated ? ' (simulated)' : ''}.</span> Your cart is saved in this
              browser, and pages you’ve already opened still work.
            </p>
            {simulated && (
              <button
                type="button"
                onClick={exit}
                className="inline-flex h-9 items-center rounded-lg border border-border-strong bg-surface px-3 font-medium text-text hover:border-action hover:text-action"
              >
                Exit simulation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
