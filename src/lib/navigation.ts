// Lets components without an onNavigate prop (listing cards, sheets) open an
// app page; App listens and runs its regular navigate().
export const NAVIGATE_EVENT = 'yupixi:navigate'

export const requestNavigate = (page: string) =>
  window.dispatchEvent(new CustomEvent<string>(NAVIGATE_EVENT, { detail: page }))

// Opens a conversation thread directly (notification click, push link).
export const OPEN_CONVERSATION_EVENT = 'yupixi:open-conversation'

export const requestOpenConversation = (conversationId: string) =>
  window.dispatchEvent(new CustomEvent<string>(OPEN_CONVERSATION_EVENT, { detail: conversationId }))

// Push link of a message notification: `/?conversation=<id>`.
export const conversationFromUrl = (url: string = window.location.href) => {
  try { return new URL(url, window.location.origin).searchParams.get('conversation') } catch { return null }
}

// Opens a given campaign page (home promotions, category tiles, the
// announcement bar): '' = the newest live one.
export const OPEN_CAMPAIGN_EVENT = 'yupixi:open-campaign'

export const requestOpenCampaign = (slug: string) =>
  window.dispatchEvent(new CustomEvent<string>(OPEN_CAMPAIGN_EVENT, { detail: slug }))

// Opens the Centre d’aide: an article by its key, '' = the help centre's home.
export const OPEN_HELP_EVENT = 'yupixi:open-help'

export const requestOpenHelp = (slug = '') =>
  window.dispatchEvent(new CustomEvent<string>(OPEN_HELP_EVENT, { detail: slug }))

// « Contacter le support à propos de… »: opens the « Support » tab on a new
// conversation with that object of the member already attached.
export const OPEN_SUPPORT_EVENT = 'yupixi:open-support'
export type SupportAbout = { kind: 'LISTING' | 'DEAL' | 'PAYMENT' | 'DISPUTE' | 'CONVERSATION'; id: string }

export const requestSupport = (about: SupportAbout) =>
  window.dispatchEvent(new CustomEvent<SupportAbout>(OPEN_SUPPORT_EVENT, { detail: about }))

// Opens an official shop (notification of a followed shop: `/?shop=<slug>`).
export const OPEN_SHOP_EVENT = 'yupixi:open-shop'

export const requestOpenShop = (slug: string) =>
  window.dispatchEvent(new CustomEvent<string>(OPEN_SHOP_EVENT, { detail: slug }))

export const shopFromUrl = (url: string | null | undefined) => {
  if (!url) return null
  try { return new URL(url, window.location.origin).searchParams.get('shop') } catch { return null }
}

// Opens the page a notification points to (push click or in-app list):
// `/?conversation=`, `/?shop=`, `/?listing=`, `/?seller=`, `/?legal=`,
// `/?shortcut=<page>` (+ `dispute` / `ticket` to focus), `/`, or an
// external URL. App resolves it (see openLink there).
export const OPEN_LINK_EVENT = 'yupixi:open-link'

export const requestOpenLink = (url: string) =>
  window.dispatchEvent(new CustomEvent<string>(OPEN_LINK_EVENT, { detail: url }))
