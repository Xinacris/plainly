import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeChoice = 'light' | 'dark' | 'system'

// Must match the key read by the inline no-flash script in index.html.
export const THEME_STORAGE_KEY = 'plainly-theme'

const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

function apply(choice: ThemeChoice) {
  const dark = choice === 'dark' || (choice === 'system' && systemDark.matches)
  document.documentElement.classList.toggle('dark', dark)
}

interface ThemeState {
  choice: ThemeChoice
  setChoice: (choice: ThemeChoice) => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      choice: 'system',
      setChoice: (choice) => {
        apply(choice)
        set({ choice })
      },
    }),
    { name: THEME_STORAGE_KEY, onRehydrateStorage: () => (state) => apply(state?.choice ?? 'system') },
  ),
)

// Follow OS changes while the user is on "system".
systemDark.addEventListener('change', () => {
  if (useTheme.getState().choice === 'system') apply('system')
})
