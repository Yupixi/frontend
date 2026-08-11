export type ViewMode = 'grid' | 'list'

const VIEW_MODE_KEY = 'yupixi_view_mode'

export function getStoredViewMode(): ViewMode | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(VIEW_MODE_KEY)
  return value === 'grid' || value === 'list' ? value : null
}

export function setStoredViewMode(mode: ViewMode) {
  if (typeof window === 'undefined') return
  localStorage.setItem(VIEW_MODE_KEY, mode)
}
