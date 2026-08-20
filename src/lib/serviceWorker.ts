export const SW_UPDATE_EVENT = 'sw:update-available'

let waitingWorker: ServiceWorker | null = null
let reloadingAfterUpdate = false

// Called by the "Mettre à jour" action in the update-available banner —
// tells the waiting worker to activate, then reloads once it takes control.
export function applyServiceWorkerUpdate() {
  if (!waitingWorker) return
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingAfterUpdate) return
    reloadingAfterUpdate = true
    window.location.reload()
  })
  waitingWorker.postMessage({ type: 'SKIP_WAITING' })
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      const notifyIfWaiting = () => {
        if (!registration.waiting || !navigator.serviceWorker.controller) return
        waitingWorker = registration.waiting
        window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT))
      }
      notifyIfWaiting()

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') notifyIfWaiting()
        })
      })
    })
  })
}
