// Lets components without an onNavigate prop (listing cards, sheets) open an
// app page; App listens and runs its regular navigate().
export const NAVIGATE_EVENT = 'yupixi:navigate'

export const requestNavigate = (page: string) =>
  window.dispatchEvent(new CustomEvent<string>(NAVIGATE_EVENT, { detail: page }))
