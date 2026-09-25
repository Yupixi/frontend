import Icon from './Icon'
import type { PushSubscriptionResult } from '../lib/pushNotifications'

// Transversal banners (service-worker update, PWA install, push opt-in).
// "Plus tard" is remembered for a week on this device so they don't come
// back on every page load.
const SNOOZE_MS = 7 * 86_400_000
export function isSnoozed(key: string) {
  try { return Number(localStorage.getItem(`dilchap_snooze_${key}`) ?? 0) > Date.now() } catch { return false }
}
export function snooze(key: string) {
  try { localStorage.setItem(`dilchap_snooze_${key}`, String(Date.now() + SNOOZE_MS)) } catch { /* private mode */ }
}

const card = 'flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-lowest p-3 shadow-float'
const primaryBtn = 'shrink-0 cursor-pointer whitespace-nowrap rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark disabled:opacity-60'
const laterBtn = 'shrink-0 cursor-pointer border-none bg-transparent px-2 py-2 text-label-md text-on-surface-variant'

function AppMark({ size = 44 }: { size?: number }) {
  return <img src="/icon-192.png" alt="" className="shrink-0 rounded-xl" style={{ width: size, height: size }} />
}

export function UpdateBanner({ show, onUpdate, onDismiss }: { show: boolean; onUpdate: () => void; onDismiss: () => void }) {
  if (!show) return null
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-[9999] mx-auto max-w-xl">
      <div className={card}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="system_update" size={21} /></span>
        <div className="min-w-0 flex-1"><div className="text-label-lg text-on-surface">Nouvelle version disponible</div><div className="text-body-sm text-on-surface-variant">Mettez à jour pour profiter des dernières améliorations.</div></div>
        <button onClick={onDismiss} className={laterBtn}>Plus tard</button>
        <button onClick={onUpdate} className={primaryBtn}>Mettre à jour</button>
      </div>
    </div>
  )
}

export function InstallBanner({ show, guide, onInstall, onDismiss }: { show: boolean; guide: boolean; onInstall: () => void; onDismiss: () => void }) {
  if (!show) return null
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isChrome = /chrome|crios/i.test(navigator.userAgent)
  return (
    <>
      {guide && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/45" onClick={onDismiss}>
          <div className="w-full max-w-md rounded-t-3xl bg-surface-lowest px-6 pb-8 pt-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto flex justify-center"><AppMark size={56} /></div>
            <h3 className="m-0 mt-3 text-headline-sm text-on-surface">Installer Dilchap</h3>
            <p className="m-0 mt-2 text-body-md text-on-surface-variant">
              {isIos
                ? <>Touchez le bouton <Icon name="ios_share" size={18} className="align-middle text-primary" /> Partager, puis « Sur l'écran d'accueil ».</>
                : isChrome
                  ? <>Ouvrez le menu <Icon name="more_vert" size={18} className="align-middle text-primary" /> puis « Ajouter à l'écran d'accueil ».</>
                  : "Utilisez le menu du navigateur pour ajouter Dilchap à l'écran d'accueil."}
            </p>
            <button onClick={onDismiss} className={`${primaryBtn} mt-5 w-full py-3`}>J'ai compris</button>
          </div>
        </div>
      )}
      <div className="fixed inset-x-3 bottom-[84px] z-[9999] mx-auto max-w-xl md:bottom-4">
        <div className={card}>
          <AppMark />
          <div className="min-w-0 flex-1"><div className="text-label-lg text-on-surface">Installer Dilchap</div><div className="truncate text-body-sm text-on-surface-variant">Accès direct depuis votre écran d'accueil</div></div>
          <button onClick={onDismiss} className={laterBtn}>Plus tard</button>
          <button onClick={onInstall} className={primaryBtn}>Installer</button>
        </div>
      </div>
    </>
  )
}

const PUSH_COPY: Partial<Record<PushSubscriptionResult, string>> = {
  'ios-install-required': "Sur iPhone ou iPad, ajoutez Dilchap à l'écran d'accueil puis ouvrez-le depuis son icône pour activer les notifications.",
  'permission-denied': 'Les notifications sont bloquées. Autorisez-les dans les réglages du navigateur puis réessayez.',
  error: "Cet appareil n'a pas pu être inscrit aux notifications. Vérifiez la connexion puis réessayez.",
}

export function PushBanner({ status, enabling, onEnable, onDismiss }: { status: PushSubscriptionResult; enabling: boolean; onEnable: () => void; onDismiss: () => void }) {
  const actionable = status === 'permission-required' || status === 'error'
  return (
    <div role="status" className="fixed inset-x-3 top-20 z-[1000] mx-auto max-w-xl">
      <div className={card}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="notifications_active" size={21} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-label-lg text-on-surface">Activer les notifications</div>
          <div className="text-body-sm text-on-surface-variant">{PUSH_COPY[status] ?? 'Soyez prévenu de vos messages, offres et rendez-vous même lorsque Dilchap est fermé.'}</div>
        </div>
        <button onClick={onDismiss} className={laterBtn}>Plus tard</button>
        {actionable && <button onClick={onEnable} disabled={enabling} className={primaryBtn}>{enabling ? 'Activation…' : status === 'error' ? 'Réessayer' : 'Activer'}</button>}
      </div>
    </div>
  )
}
