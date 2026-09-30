// Switching language remounts the app (see App.tsx), which drops focus and closes the
// phone menu. These flags, outside React, carry both across the remount: the picker
// that was used takes focus back, and the menu it was in opens again.
let refocus: 'compact' | 'labelled' | null = null
let reopenMenu = false

export function markSwitch(from: 'compact' | 'labelled'): void {
  refocus = from
  if (from === 'labelled') reopenMenu = true
}

export function takeRefocus(variant: 'compact' | 'labelled'): boolean {
  if (refocus !== variant) return false
  refocus = null
  return true
}

export function takeReopenMenu(): boolean {
  const value = reopenMenu
  reopenMenu = false
  return value
}
