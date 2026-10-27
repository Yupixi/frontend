import { useEffect } from 'react'
import Icon from './Icon'
import type { PushSubscriptionResult } from '../lib/pushNotifications'
import { pwaEvent } from '../lib/pwaInstall'
import { useT } from '../i18n'
import appShell from '../i18n/ns/appShell'
import common from '../i18n/ns/common'

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
  const t = useT(appShell)
  if (!show) return null
  return (
    <div role="status" className="tour-hide fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[9999] mx-auto max-w-xl">
      {/* Buttons wrap under the text on a phone instead of squeezing it
          into a one-word-per-line column. */}
      <div className={`${card} flex-wrap sm:flex-nowrap`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="system_update" size={21} /></span>
        <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] sm:basis-auto"><div className="text-label-lg text-on-surface">{t('update.title')}</div><div className="text-body-sm text-on-surface-variant">{t('update.text')}</div></div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button onClick={onDismiss} className={laterBtn}>{t('later')}</button>
          <button onClick={onUpdate} className={primaryBtn}>{t('update.button')}</button>
        </div>
      </div>
    </div>
  )
}

export function InstallBanner({ show, guide, onInstall, onDismiss }: { show: boolean; guide: boolean; onInstall: () => void; onDismiss: () => void }) {
  const t = useT(appShell)
  // Counted once a day per device (lib/pwaInstall).
  useEffect(() => { if (show) pwaEvent('BANNER_SHOWN') }, [show])
  useEffect(() => { if (show && guide) pwaEvent('GUIDE_SHOWN') }, [show, guide])
  if (!show) return null
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isChrome = /chrome|crios/i.test(navigator.userAgent)
  return (
    <>
      {guide && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/45" onClick={onDismiss}>
          <div className="w-full max-w-md rounded-t-3xl bg-surface-lowest px-6 pb-8 pt-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto flex justify-center"><AppMark size={56} /></div>
            <h3 className="m-0 mt-3 text-headline-sm text-on-surface">{t('install.title')}</h3>
            <p className="m-0 mt-2 text-body-md text-on-surface-variant">
              {isIos
                ? t.rich('install.ios', { icon: () => <Icon name="ios_share" size={18} className="align-middle text-primary" /> })
                : isChrome
                  ? t.rich('install.chrome', { icon: () => <Icon name="more_vert" size={18} className="align-middle text-primary" /> })
                  : t('install.other')}
            </p>
            <button onClick={onDismiss} className={`${primaryBtn} mt-5 w-full py-3`}>{t('install.gotIt')}</button>
          </div>
        </div>
      )}
      <div className="tour-hide fixed inset-x-3 bottom-[84px] z-[9980] mx-auto max-w-xl md:bottom-4">
        {/* Phone: buttons under the text (no squeezed, cut text), as the other
            banners. Under the bottom sheets (z 9990): never over a payment. */}
        <div className={`${card} flex-wrap min-[480px]:flex-nowrap`}>
          <AppMark />
          <div className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] min-[480px]:basis-auto"><div className="text-label-lg text-on-surface">{t('install.title')}</div><div className="text-body-sm text-on-surface-variant">{t('install.text')}</div></div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button onClick={onDismiss} className={laterBtn}>{t('later')}</button>
            <button onClick={onInstall} className={primaryBtn}>{t('install.button')}</button>
          </div>
        </div>
      </div>
    </>
  )
}

const PUSH_COPY: Partial<Record<PushSubscriptionResult, 'push.iosInstall' | 'push.denied' | 'push.error'>> = {
  'ios-install-required': 'push.iosInstall',
  'permission-denied': 'push.denied',
  error: 'push.error',
}

export function PushBanner({ status, enabling, onEnable, onDismiss }: { status: PushSubscriptionResult; enabling: boolean; onEnable: () => void; onDismiss: () => void }) {
  const t = useT(appShell)
  const tc = useT(common)
  const actionable = status === 'permission-required' || status === 'error'
  const copy = PUSH_COPY[status]
  return (
    <div role="status" className="tour-hide fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+5rem)] z-[1000] mx-auto max-w-xl">
      <div className={`${card} flex-wrap sm:flex-nowrap`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="notifications_active" size={21} /></span>
        <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] sm:basis-auto">
          <div className="text-label-lg text-on-surface">{t('push.title')}</div>
          <div className="text-body-sm text-on-surface-variant">{copy ? t(copy) : t('push.text')}</div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button onClick={onDismiss} className={laterBtn}>{t('later')}</button>
          {actionable && <button onClick={onEnable} disabled={enabling} className={primaryBtn}>{enabling ? t('push.enabling') : status === 'error' ? tc('retry') : t('push.enable')}</button>}
        </div>
      </div>
    </div>
  )
}

// Signed up but the address isn't confirmed yet: publishing, paying and
// contacting a seller wait for the link e-mailed at sign-up. "Plus tard"
// hides it for this visit only.
export function VerifyEmailBanner({ email, onResend, sending, sent, error, onDismiss }: {
  email: string
  onResend: () => void
  sending: boolean
  sent: boolean
  error?: string | null
  onDismiss: () => void
}) {
  const t = useT(appShell)
  return (
    <div role="status" className="tour-hide fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[9998] mx-auto max-w-xl">
      <div className={`${card} flex-wrap sm:flex-nowrap`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="mail" size={21} /></span>
        <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] sm:basis-auto">
          <div className="text-label-lg text-on-surface">{t('verifyEmail.title')}</div>
          <div className="break-words text-body-sm text-on-surface-variant">
            {error ?? t.rich(sent ? 'verifyEmail.sent' : 'verifyEmail.text', { email, b: c => <b className="font-semibold">{c}</b> })}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button onClick={onDismiss} className={laterBtn}>{t('later')}</button>
          <button onClick={onResend} disabled={sending || sent} className={primaryBtn}>{sending ? t('sending') : sent ? t('verifyEmail.sentButton') : t('verifyEmail.resend')}</button>
        </div>
      </div>
    </div>
  )
}

// SMS first: an account confirmed by neither e-mail nor phone, with a
// number and SMS available — a code by SMS (AccountVerifySheet) rather
// than waiting for the confirmation e-mail.
export function VerifyAccountBanner({ phone, onSms, onDismiss }: {
  phone: string
  onSms: () => void
  onDismiss: () => void
}) {
  const t = useT(appShell)
  return (
    <div role="status" className="tour-hide fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[9998] mx-auto max-w-xl">
      <div className={`${card} flex-wrap sm:flex-nowrap`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="sms" size={21} /></span>
        <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] sm:basis-auto">
          <div className="text-label-lg text-on-surface">{t('verifyAccount.title')}</div>
          <div className="break-words text-body-sm text-on-surface-variant">{t.rich('verifyAccount.text', { phone, b: c => <b className="whitespace-nowrap font-semibold">{c}</b> })}</div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button onClick={onDismiss} className={laterBtn}>{t('later')}</button>
          <button onClick={onSms} className={primaryBtn}>{t('verifyAccount.button')}</button>
        </div>
      </div>
    </div>
  )
}
