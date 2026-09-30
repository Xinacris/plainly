import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Display settings from /accessibility, remembered in this browser. Each one is an
// attribute on <html> that index.css reads: data-text (the root font size, so every
// rem-based size scales), data-contrast (darker text and borders), data-motion (no
// transitions or animations, whatever the device says) and data-underline (every link
// underlined). The inline script in index.html applies them before first paint.

export type TextSize = 'default' | 'large' | 'larger'

export interface DisplaySettings {
  textSize: TextSize
  contrast: boolean
  reduceMotion: boolean
  underlineLinks: boolean
}

// Must match the key read by the inline script in index.html.
export const DISPLAY_STORAGE_KEY = 'plainly-display'

export const DEFAULT_DISPLAY: DisplaySettings = { textSize: 'default', contrast: false, reduceMotion: false, underlineLinks: false }

function apply(settings: DisplaySettings) {
  const root = document.documentElement
  const set = (name: string, value: string | null) => (value ? root.setAttribute(name, value) : root.removeAttribute(name))
  set('data-text', settings.textSize === 'default' ? null : settings.textSize)
  set('data-contrast', settings.contrast ? 'more' : null)
  set('data-motion', settings.reduceMotion ? 'reduce' : null)
  set('data-underline', settings.underlineLinks ? 'links' : null)
}

interface DisplayState extends DisplaySettings {
  update: (change: Partial<DisplaySettings>) => void
  reset: () => void
}

export const useDisplay = create<DisplayState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_DISPLAY,
      update: (change) => {
        set(change)
        apply(get())
      },
      reset: () => {
        set(DEFAULT_DISPLAY)
        apply(DEFAULT_DISPLAY)
      },
    }),
    {
      name: DISPLAY_STORAGE_KEY,
      partialize: ({ textSize, contrast, reduceMotion, underlineLinks }) => ({ textSize, contrast, reduceMotion, underlineLinks }),
      onRehydrateStorage: () => (state) => apply(state ?? DEFAULT_DISPLAY),
    },
  ),
)

/** For motion started from script (the gallery's smooth scroll): the setting, or the device's. */
export function prefersReducedMotion(): boolean {
  return useDisplay.getState().reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
