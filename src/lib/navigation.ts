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
