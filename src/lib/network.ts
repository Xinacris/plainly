import { create } from 'zustand'

// Whether the browser is online, from the browser's own online/offline events.
// `?simulate=offline` forces the offline state for this tab, so it can be seen and
// tested without pulling the cable. The simulation shows the banner and makes account
// actions answer as they would offline; it doesn't block requests, so product data
// and photos that aren't loaded yet still arrive.
const SIMULATE_KEY = 'plainly-simulate-offline'

interface NetworkState {
  online: boolean
  simulated: boolean
}

function readSimulated(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('simulate') === 'offline') sessionStorage.setItem(SIMULATE_KEY, '1')
    return sessionStorage.getItem(SIMULATE_KEY) === '1'
  } catch {
    return new URLSearchParams(window.location.search).get('simulate') === 'offline'
  }
}

export const useNetwork = create<NetworkState>()(() => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  simulated: typeof window === 'undefined' ? false : readSimulated(),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useNetwork.setState({ online: true }))
  window.addEventListener('offline', () => useNetwork.setState({ online: false }))
}

export function startSimulation(): void {
  try {
    sessionStorage.setItem(SIMULATE_KEY, '1')
  } catch {
    // The flag then lasts until the page reloads.
  }
  useNetwork.setState({ simulated: true })
}

export function exitSimulation(): void {
  try {
    sessionStorage.removeItem(SIMULATE_KEY)
  } catch {
    // Nothing stored.
  }
  useNetwork.setState({ simulated: false })
}

export const isOffline = (): boolean => {
  const { online, simulated } = useNetwork.getState()
  return simulated || !online
}

export const useOffline = (): boolean => useNetwork((s) => s.simulated || !s.online)

/** What account actions say when there's no connection. Nothing is sent, so nothing changes. */
export const OFFLINE = 'You’re offline, and this needs a connection. Nothing was changed; try again when you’re back online.'
