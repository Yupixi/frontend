// Tells the service worker which conversation (if any) is currently open,
// so its `push` handler can skip the OS notification when the recipient is
// already looking at that exact thread in a focused tab — the new message
// already appears live via the messageAdded subscription, so a duplicate
// push is just noise. Best-effort: if no worker is controlling the page yet,
// this silently no-ops and the push handler falls back to always notifying.
export function setActiveConversation(conversationId: string | null) {
  navigator.serviceWorker?.controller?.postMessage({ type: 'ACTIVE_CONVERSATION', conversationId })
}
