import LanguagePicker from '../../components/LanguagePicker'
import { useSiteLocales } from '../../i18n/LocaleSync'
import { fmtDate, getLocale, useT } from '../../i18n'
import common from '../../i18n/ns/common'
import settings from '../../i18n/ns/settings'
import AdultConfirmationSetting from '../../components/AdultConfirmationSetting'
import PersonalizeHomeSetting from '../../components/PersonalizeHomeSetting'
import { requestOpenHelp } from '../../lib/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import { AccountLayout } from '../account/AccountLayout'
import { CHANGE_PASSWORD_MUTATION } from '../../graphql/account'
import { MY_LOGIN_METHODS_QUERY, type LoginMethods } from '../../graphql/auth'
import LoginMethodsCard from '../../components/LoginMethodsCard'
import {
  DELETE_MY_ACCOUNT_MUTATION, MY_SESSIONS_QUERY, REVOKE_OTHER_SESSIONS_MUTATION, REVOKE_SESSION_MUTATION, SELLER_SETTINGS_QUERY,
  UPDATE_PREFERENCES_JSON_MUTATION, UPDATE_SELLER_PROFILE_MUTATION, type UserSession,
} from '../../graphql/sellerTools'
import { refreshAccessToken } from '../../lib/apollo'
import { uploadImages } from '../../lib/upload'
import { getPushAvailability, subscribeToPush, type PushSubscriptionResult } from '../../lib/pushNotifications'
import type { AuthUser } from '../../graphql/auth'
import Select from '../../components/Select'
import PaymentLogo from '../../components/PaymentLogo'
import SellerBadge from '../../components/SellerBadge'
import PhoneVerifyCard from '../../components/PhoneVerifyCard'
import HelpLink from '../../components/HelpLink'
import { Claim } from '../../lib/site'
import { placeOptions, useLists } from '../../lib/lists'
import { METHOD_LABELS, useCountries, useCountry, type PaymentMethodCode } from '../../lib/countries'
import { replayTours } from '../../lib/tourControl'

type Props = {
  onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void
  onProfileUpdated: (u: AuthUser) => void; dark: boolean; onToggleDark: () => void
  onViewShop?: (sellerId: string) => void
}

type Channel = 'push' | 'whatsapp' | 'email'
type Alerts = Record<string, Record<Channel, boolean>>
type Quiet = { enabled: boolean; start: string; end: string }
type SettingsData = {
  me: AuthUser & { verifiedAt: string | null; meetupSpots: string[]; paymentMethods: string[]; vacationMode: boolean; notificationPreferences: Record<string, any>; createdAt: string
    coverUrl?: string | null; website?: string | null; facebook?: string | null; instagram?: string | null; tiktok?: string | null }
  myReputation: {
    averageRating: number; reviewsCount: number; satisfactionRate: number | null; salesCount: number; responseTimeMinutes: number | null
    trustScore: number; reactivity: number | null; reactivityPrev: number | null; activeListings: number; isVerified: boolean; hasPhone: boolean; verifiedAt: string | null
  }
}

// `short` labels keep the sticky tab strip readable on a phone.
// Labels read at each render (getters): in the page's language.
const tabDef = (id: 'profil' | 'alertes' | 'remise' | 'securite' | 'compte', icon: string) => ({
  id, icon,
  get label() { return settings.t(`tab.${id}`) },
  get short() { return settings.t(`tab.${id}.short`) },
})
const TABS = [
  tabDef('profil', 'storefront'),
  tabDef('alertes', 'notifications_active'),
  tabDef('remise', 'handshake'),
  tabDef('securite', 'verified_user'),
  tabDef('compte', 'tune'),
]
// `sms`: the categories the server may send by WhatsApp / SMS (Backend
// channel-events: messages & offers, meet-ups & disputes). The others never do.
const alertDef = (key: 'messages' | 'meetups' | 'boosts' | 'advice' | 'campaigns', sms: boolean, icon: string) => ({
  key, sms, icon,
  get title() { return settings.t(`alert.${key}.title`) },
  get sub() { return settings.t(`alert.${key}.sub`) },
})
const ALERTS = [
  alertDef('messages', true, 'forum'),
  alertDef('meetups', true, 'calendar_clock'),
  alertDef('boosts', false, 'rocket_launch'),
  alertDef('advice', false, 'insights'),
  alertDef('campaigns', false, 'campaign'),
]
const noSmsHint = () => settings.t('noSmsHint')
// « 21:00 » → « 21h00 » in French only.
const hm = (s: string) => (getLocale() === 'fr' ? s.replace(':', 'h') : s)
// Paid alerts (WhatsApp / SMS) wait for the morning when the member's own
// quiet hours are off (Backend channels.service DEFAULT_QUIET_HOURS).
const SMS_NIGHT = { start: '21:00', end: '07:00' }
const DEFAULT_ALERTS: Alerts = Object.fromEntries(ALERTS.map(a => [a.key, { push: true, whatsapp: false, email: a.key !== 'advice' }]))
// Payment methods of the member's country (« Pays »), cash last.
const paymentSub = (code: PaymentMethodCode) =>
  code === 'WAVE' ? settings.t('payment.waveSub') : code === 'CASH' ? settings.t('payment.cashSub') : settings.t('payment.defaultSub')
const paymentsFor = (methods: PaymentMethodCode[]) => [...methods.filter(m => m !== 'CASH'), 'CASH' as const].map(code => ({
  code, title: code === 'CASH' ? settings.t('payment.cashTitle') : METHOD_LABELS[code], sub: paymentSub(code),
}))

function Toggle({ on, onChange, label, tone = 'primary', disabled, title }: { on: boolean; onChange: (v: boolean) => void; label: string; tone?: 'primary' | 'tertiary'; disabled?: boolean; title?: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} title={title} disabled={disabled} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full border-none p-0 transition-colors ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${on ? (tone === 'tertiary' ? 'bg-tertiary' : 'bg-primary') : 'bg-surface-container-high'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

// « Langue »: only when the member's country offers several languages.
function LanguageCard() {
  const t = useT(common)
  const { enabled } = useSiteLocales()
  if (enabled.length < 2) return null
  return (
    <Card id="langue" icon="language" title={t('language')} sub={t('languageHint')}>
      <LanguagePicker variant="settings" />
    </Card>
  )
}

function Card({ id, icon, iconCls = 'bg-primary-fixed text-primary', title, sub, aside, children }: { id: string; icon: string; iconCls?: string; title: string; sub: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={`settings-${id}`} className="scroll-mt-28 rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconCls}`}><Icon name={icon} size={21} /></span>
        {/* min width: on a phone the aside wraps to its own line instead of
            squeezing the title into a one-word column */}
        <div className="min-w-[12rem] flex-1">
          <h2 className="m-0 text-headline-sm text-on-surface">{title}</h2>
          <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">{sub}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

const field = 'w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5 text-body-md text-on-surface outline-none focus:border-primary'
const sinceLabel = (iso?: string) => (iso ? fmtDate(iso, { month: 'long', year: 'numeric' }) : '')
const deviceLabel = (ua: string | null) => {
  if (!ua) return { icon: 'devices', name: settings.t('device.unknown') }
  const mobile = /iPhone|Android|Mobile/i.test(ua)
  const os = /iPhone|iPad/.test(ua) ? 'iPhone / iPad' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : settings.t('device.generic')
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : settings.t('device.browser')
  return { icon: mobile ? 'smartphone' : 'laptop_mac', name: `${os} • ${browser}` }
}

// Short public address dilchap.com/@handle, saved on its own (changeable
// once per 30 days; brand names are protected).
function HandleCard({ handle, changedAt, onSaved }: { handle: string | null | undefined; changedAt: string | null | undefined; onSaved: () => void }) {
  const t = useT(settings)
  const tc = useT(common)
  const [v, setV] = useState(handle ?? '')
  // Saved (or refetched): the field shows the address now in use.
  useEffect(() => { setV(handle ?? '') }, [handle])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [update, { loading }] = useMutation(UPDATE_SELLER_PROFILE_MUTATION)
  const host = window.location.host
  const clean = v.trim().replace(/^@+/, '').toLowerCase()
  const next = changedAt ? new Date(new Date(changedAt).getTime() + 30 * 86_400_000) : null
  const locked = !!next && next > new Date()
  const format = !clean || /^[a-z0-9](?:[a-z0-9_-]{1,28})[a-z0-9]$/.test(clean) ? null : t('handle.formatError')
  const link = handle ? `${window.location.origin}/@${handle}` : ''
  const save = () => {
    setMsg(null)
    void update({ variables: { input: { handle: clean } } })
      .then(() => { setMsg({ ok: true, text: t('handle.saved') }); onSaved() })
      .catch((e: Error) => setMsg({ ok: false, text: e.message }))
  }
  const copy = async () => {
    if (!link) return
    if (navigator.share) { try { await navigator.share({ url: link }) } catch { /* cancelled */ } return }
    await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Card id="adresse" icon="link" title={t('handle.title')} sub={t('handle.sub')}>
      {handle && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low p-3">
          <span className="min-w-0 flex-1 break-all text-label-lg text-on-surface">{host}/@{handle}</span>
          <button type="button" onClick={() => void copy()} className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-3 text-label-md text-white"><Icon name={copied ? 'check' : 'content_copy'} size={16} /> {copied ? tc('copied') : t('handle.copyLink')}</button>
        </div>
      )}
      <label className="block"><span className="mb-1.5 block text-label-md text-on-surface">{t('handle.customise')}</span>
        <span className="flex h-11 items-center overflow-hidden rounded-xl bg-surface-container-low focus-within:outline focus-within:outline-2 focus-within:outline-primary">
          <span className="shrink-0 pl-3 text-body-md text-on-surface-variant">{host}/@</span>
          <input value={v} disabled={locked} onChange={e => setV(e.target.value.replace(/\s/g, '').slice(0, 30))} placeholder={t('handle.placeholder')} aria-label={t('handle.title')} className="h-full min-w-0 flex-1 border-none bg-transparent pr-3 text-body-md text-on-surface outline-none disabled:opacity-60" />
        </span>
      </label>
      <p className="m-0 mt-1.5 text-body-sm text-on-surface-variant">{locked ? t('handle.lockedUntil', { date: fmtDate(next!, { day: 'numeric', month: 'long' }) }) : t('handle.rule')} <HelpLink article="mon-adresse-pseudo" className="ml-1 align-middle" /></p>
      {format && <p className="m-0 mt-1 text-body-sm text-primary">{format}</p>}
      {msg && <p className={`m-0 mt-2 text-body-sm ${msg.ok ? 'text-tertiary' : 'text-primary'}`}>{msg.text}</p>}
      <div className="mt-3 flex justify-end">
        <button type="button" disabled={loading || locked || !!format || !clean || clean === handle} onClick={save} className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white disabled:opacity-50"><Icon name="save" size={17} /> {t('handle.save')}</button>
      </div>
    </Card>
  )
}

// "Page vendeur personnalisée" ("Vendeur certifié"): cover photo and links
// shown on the public seller page. Saved on its own.
function SellerPageCard({ me, certified, onSaved, onUpgrade }: {
  me: { coverUrl?: string | null; website?: string | null; facebook?: string | null; instagram?: string | null; tiktok?: string | null }
  certified: boolean
  onSaved: () => void
  onUpgrade: () => void
}) {
  const t = useT(settings)
  const [v, setV] = useState({ coverUrl: me.coverUrl ?? '', website: me.website ?? '', facebook: me.facebook ?? '', instagram: me.instagram ?? '', tiktok: me.tiktok ?? '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const [update, { loading }] = useMutation(UPDATE_SELLER_PROFILE_MUTATION)
  const field = 'h-11 w-full min-w-0 rounded-xl border-none bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary disabled:opacity-60'
  const pick = async (files: FileList | null) => {
    if (!files?.[0]) return
    setBusy(true)
    try { const [url] = await uploadImages([files[0]]); setV(x => ({ ...x, coverUrl: url })) } finally { setBusy(false) }
  }
  const save = () => {
    setMsg(null)
    void update({ variables: { input: v } }).then(() => { setMsg({ ok: true, text: t('page.saved') }); onSaved() }).catch((e: Error) => setMsg({ ok: false, text: e.message }))
  }
  return (
    <Card id="page" icon="palette" iconCls="bg-tertiary-soft text-tertiary" title={t('page.title')} sub={t('page.sub')}
      aside={certified ? undefined : <span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary"><Icon name="lock" size={14} /> {t('page.certified')}</span>}>
      <input ref={input} type="file" accept="image/*" hidden onChange={e => { void pick(e.target.files); e.target.value = '' }} />
      <div className="relative h-28 overflow-hidden rounded-xl bg-surface-container">
        {v.coverUrl && <img src={v.coverUrl} alt="" className="h-full w-full object-cover" />}
        <button type="button" disabled={!certified || busy} onClick={() => input.current?.click()} className="absolute bottom-2 right-2 flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-lowest px-3 text-label-md text-on-surface shadow-sm disabled:opacity-60"><Icon name={busy ? 'progress_activity' : 'photo_camera'} size={17} className={busy ? 'animate-spin' : ''} /> {v.coverUrl ? t('page.changeCover') : t('page.addCover')}</button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {([['website', 'language', t('page.website'), t('page.websitePh')], ['facebook', 'thumb_up', 'Facebook', t('page.facebookPh')], ['instagram', 'photo_camera', 'Instagram', t('page.instagramPh')], ['tiktok', 'music_note', 'TikTok', t('page.tiktokPh')]] as const).map(([k, icon, label, ph]) => (
          <label key={k} className="block"><span className="mb-1.5 flex items-center gap-1.5 text-label-md text-on-surface"><Icon name={icon} size={16} className="text-on-surface-variant" /> {label}</span>
            <input value={v[k]} disabled={!certified} onChange={e => setV(x => ({ ...x, [k]: e.target.value.slice(0, 200) }))} placeholder={ph} className={field} />
          </label>
        ))}
      </div>
      {msg && <p className={`m-0 mt-3 text-body-sm ${msg.ok ? 'text-tertiary' : 'text-primary'}`}>{msg.text}</p>}
      <div className="mt-3 flex justify-end">
        {certified
          ? <button type="button" disabled={loading || busy} onClick={save} className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white disabled:opacity-50"><Icon name="save" size={17} /> {t('page.save')}</button>
          : <button type="button" onClick={onUpgrade} className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-tertiary px-4 text-label-md text-white"><Icon name="verified" size={17} fill /> {t('page.upgrade')}</button>}
      </div>
    </Card>
  )
}

// "Paramètres & Notifications" mockup — one form saved at once ("Enregistrer
// les modifications" / unsaved-changes bar), plus the security & account
// actions that apply immediately.
export default function Settings({ onNavigate, currentUser, onLogout, onProfileUpdated, dark, onToggleDark, onViewShop }: Props) {
  const t = useT(settings)
  const tc = useT(common)
  const { data, refetch } = useQuery<SettingsData>(SELLER_SETTINGS_QUERY)
  const me = data?.me
  const rep = data?.myReputation

  const initial = useMemo(() => me && ({
    fullName: me.fullName, countryCode: me.countryCode ?? 'CI', city: me.city ?? '', bio: me.bio ?? '', phone: me.phone ?? '', email: me.email ?? '', avatarUrl: me.avatarUrl ?? '',
    meetupSpots: me.meetupSpots, paymentMethods: me.paymentMethods,
    alerts: { ...DEFAULT_ALERTS, ...(me.notificationPreferences?.alerts ?? {}) } as Alerts,
    quiet: { enabled: false, ...SMS_NIGHT, ...(me.notificationPreferences?.quietHours ?? {}) } as Quiet,
  }), [me])
  const [form, setForm] = useState(initial)
  useEffect(() => { setForm(initial) }, [initial])
  const dirty = !!form && !!initial && JSON.stringify(form) !== JSON.stringify(initial)
  const set = <K extends keyof NonNullable<typeof form>>(k: K, v: NonNullable<typeof form>[K]) => setForm(f => (f ? { ...f, [k]: v } : f))
  // Account country: its towns, meetup spots and payment methods.
  const countries = useCountries()
  const country = useCountry(form?.countryCode ?? me?.countryCode ?? 'CI', true)
  const lists = useLists(country?.code ?? null)
  const payments = paymentsFor(country?.methods ?? ['WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY', 'CASH'])
  // Another country: other towns, spots and methods to pick again.
  const changeCountry = (code: string) => {
    const next = countries.find(c => c.code === code)
    setForm(f => f && next ? { ...f, countryCode: code, city: '', meetupSpots: [], paymentMethods: f.paymentMethods.filter(m => (next.methods as string[]).includes(m)) } : f)
  }

  const [tab, setTab] = useState('profil')
  const [newSpot, setNewSpot] = useState('')
  const [uploading, setUploading] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [updateProfile, { loading: savingProfile }] = useMutation<{ updateProfile: AuthUser }>(UPDATE_SELLER_PROFILE_MUTATION)
  const [updatePrefs, { loading: savingPrefs }] = useMutation(UPDATE_PREFERENCES_JSON_MUTATION)

  const [pushStatus, setPushStatus] = useState<PushSubscriptionResult | 'available'>(() => getPushAvailability())
  useEffect(() => { if (getPushAvailability() === 'available') void subscribeToPush(false).then(setPushStatus) }, [])

  const { data: sessionsData, refetch: refetchSessions } = useQuery<{ mySessions: UserSession[] }>(MY_SESSIONS_QUERY)
  const [revokeSession] = useMutation(REVOKE_SESSION_MUTATION)
  const [revokeOthers, { loading: revokingOthers }] = useMutation(REVOKE_OTHER_SESSIONS_MUTATION)

  // Changing the login e-mail asks for the current password; so does
  // changing the number of an account without e-mail (it is the login).
  const [emailPw, setEmailPw] = useState('')
  const emailChanged = !!form && !!me && form.email.trim() !== (me.email ?? '')
  const noEmail = !!me && !me.email
  const loginPhoneChanged = noEmail && !!form && form.phone.trim() !== (me?.phone ?? '')
  // An account without a password confirms with a recent sign-in instead
  // (the server says so when it is too old).
  const { data: loginMethods } = useQuery<{ myLoginMethods: LoginMethods }>(MY_LOGIN_METHODS_QUERY)
  const hasPassword = loginMethods?.myLoginMethods.hasPassword !== false
  const needsPw = (emailChanged || loginPhoneChanged) && hasPassword
  // « Ajouter un e-mail » (account opened with a phone only).
  const [addingEmail, setAddingEmail] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '' })
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [changePassword, { loading: changingPw }] = useMutation(CHANGE_PASSWORD_MUTATION)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleteAccount, { loading: deleting, error: deleteError }] = useMutation(DELETE_MY_ACCOUNT_MUTATION)
  const [vacationSaving, setVacationSaving] = useState(false)

  useEffect(() => {
    if (!saveMsg?.ok) return
    const timer = setTimeout(() => setSaveMsg(null), 3000)
    return () => clearTimeout(timer)
  }, [saveMsg])

  const save = async () => {
    if (!form || !me) return
    setSaveMsg(null)
    try {
      const { data: res } = await updateProfile({
        variables: {
          input: {
            fullName: form.fullName.trim(), countryCode: form.countryCode !== me.countryCode ? form.countryCode : undefined, city: form.city || null, bio: form.bio.trim() || null, phone: form.phone.trim() || null,
            email: emailChanged ? form.email.trim() : undefined, currentPassword: needsPw ? emailPw : undefined, avatarUrl: form.avatarUrl || null,
            meetupSpots: form.meetupSpots, paymentMethods: form.paymentMethods,
          },
        },
      })
      await updatePrefs({ variables: { preferences: { alerts: form.alerts, quietHours: form.quiet } } })
      if (res?.updateProfile && currentUser) onProfileUpdated({ ...currentUser, ...res.updateProfile })
      await refetch()
      setEmailPw('')
      setAddingEmail(false)
      setSaveMsg({ ok: true, text: settings.t('saved') })
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : settings.t('saveFailed') })
    }
  }

  const setVacation = async (on: boolean) => {
    setVacationSaving(true)
    try { await updateProfile({ variables: { input: { vacationMode: on } } }); await refetch() } finally { setVacationSaving(false) }
  }

  const goTab = (id: string) => {
    setTab(id)
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pickAvatar = async (files: FileList | null) => {
    if (!files?.[0]) return
    setUploading(true)
    try { const [url] = await uploadImages([files[0]]); set('avatarUrl', url) } finally { setUploading(false) }
  }

  const allOn = !!form && ALERTS.every(a => form.alerts[a.key]?.push && form.alerts[a.key]?.email)
  const reactivityDelta = rep?.reactivity != null && rep.reactivityPrev != null ? rep.reactivity - rep.reactivityPrev : null
  const sessions = sessionsData?.mySessions ?? []
  // Sessions are listed per device: repeated logins from the same browser
  // (or with no recorded user-agent) collapse into one row. The current
  // session falls back to this browser's own user-agent.
  const sessionGroups = (() => {
    const groups: { key: string; d: { icon: string; name: string }; ids: string[]; current: boolean; last: string }[] = []
    for (const s of sessions) {
      const d = deviceLabel(s.userAgent ?? (s.current && typeof navigator !== 'undefined' ? navigator.userAgent : null))
      const key = s.current ? '__current' : d.name
      const g = groups.find(x => x.key === key)
      if (g) { g.ids.push(s.id); if (s.createdAt > g.last) g.last = s.createdAt } else groups.push({ key, d, ids: [s.id], current: s.current, last: s.createdAt })
    }
    return groups.sort((a, b) => Number(b.current) - Number(a.current))
  })()
  const saving = savingProfile || savingPrefs

  return (
    <AccountLayout active="buyer-settings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-28">
        <nav className="mb-2 hidden items-center gap-1 text-label-sm text-on-surface-variant md:flex">
          <span>Dilchap Seller</span><Icon name="chevron_right" size={14} />{/* i18n-ignore */}
          <button onClick={() => onNavigate('buyer-dashboard')} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-primary">{t('crumb.dashboard')}</button>
          <Icon name="chevron_right" size={14} /><span className="text-on-surface">{t('crumb.current')}</span>
        </nav>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 md:mb-4">
          <div className="max-w-2xl">
            {/* Mobile: the account header already shows the title */}
            <h1 className="m-0 hidden text-headline-lg text-on-surface md:block">{t('title')}</h1>
            <p className="m-0 text-body-sm text-on-surface-variant md:mt-1 md:text-body-md"><span className="md:hidden">{t('intro.short')}</span><span className="max-md:hidden">{t('intro.long')}</span></p>
          </div>
          <div className="hidden gap-2 md:flex">
            <button onClick={() => onNavigate('seller-wallet')} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-surface-container-high px-4 py-2.5 text-label-md text-on-surface"><Icon name="history" size={18} /> {t('activityHistory')}</button>
            <button onClick={() => void save()} disabled={!dirty || saving} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark disabled:opacity-50"><Icon name="check" size={18} /> {t('saveChanges')}</button>
          </div>
        </div>

        {/* Mobile: the strip scrolls; a right-edge fade hints at the hidden tabs */}
        {/* Opaque full-width band pinned to the very top of the scroll area:
            the tab strip's fade mask also fades its own background, and a
            sticky element inside main's top padding let text show above it. */}
        <div className="sticky -top-4 z-20 -mx-4 -mt-3 mb-3 bg-surface px-3 pb-2 pt-4 lg:-top-6 lg:-mx-8 lg:-mt-4 lg:mb-4 lg:px-7 lg:pt-6">
          <div className="flex gap-1 overflow-x-auto rounded-2xl bg-surface-lowest p-1.5 shadow-sm [scrollbar-width:none] max-md:[mask-image:linear-gradient(to_right,#000_85%,transparent)]">
            {TABS.map(x => (
              <button key={x.id} onClick={() => goTab(x.id)} className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none px-3 py-2 text-label-md ${tab === x.id ? 'bg-surface-container-low text-primary shadow-sm' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}>
                <Icon name={x.icon} size={17} /> <span className="md:hidden">{x.short}</span><span className="max-md:hidden">{x.label}</span>
              </button>
            ))}
          </div>
        </div>

        {!form || !me ? <p className="text-body-md text-on-surface-variant">{tc('loading')}</p> : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-5">
              {/* Profil */}
              <Card id="profil" icon="store" title={t('profile.title')} sub={t('profile.sub', { count: rep?.activeListings ?? 0 })}
                aside={me.badge ? <SellerBadge tier={me.badge} variant="pill" size={16} /> : undefined}>
                <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-container-low p-4">
                  <div className="relative">
                    <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-solid border-surface-lowest bg-primary text-headline-md text-white">
                      {form.avatarUrl ? <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" /> : form.fullName.charAt(0).toUpperCase()}
                    </span>
                    <button onClick={() => avatarInput.current?.click()} disabled={uploading} className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-solid border-surface-lowest bg-primary text-white" aria-label={t('profile.changePhoto')}><Icon name={uploading ? 'progress_activity' : 'photo_camera'} size={16} /></button>
                    <input ref={avatarInput} type="file" accept="image/*" hidden onChange={e => { void pickAvatar(e.target.files); e.target.value = '' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-headline-sm text-on-surface">{form.fullName}<SellerBadge tier={me.badge} size={18} /></div>
                    <div className="text-body-sm text-on-surface-variant">{t('profile.memberSince', { date: sinceLabel(me.createdAt) })}{rep?.reviewsCount ? ` • ${t('profile.positiveReviews', { pct: String(Math.round(rep.satisfactionRate ?? 0)) })}` : ''}{rep?.salesCount ? ` (${t('profile.sales', { count: rep.salesCount })})` : ''}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {me.isVerified && <span className="flex items-center gap-1 rounded bg-surface-lowest px-1.5 py-0.5 text-label-sm text-on-surface"><Icon name="check_circle" size={13} className="text-tertiary" /> {t('profile.idValidated')}</span>}
                      {me.phone && <span className="flex items-center gap-1 rounded bg-surface-lowest px-1.5 py-0.5 text-label-sm text-on-surface"><Icon name="phone_android" size={13} /> {t('profile.phoneSet')}</span>}
                      {rep?.responseTimeMinutes != null && <span className="flex items-center gap-1 rounded bg-surface-lowest px-1.5 py-0.5 text-label-sm text-on-surface"><Icon name="bolt" size={13} className="text-primary" /> {rep.responseTimeMinutes < 60 ? t('profile.respondsMin', { n: String(rep.responseTimeMinutes) }) : t('profile.respondsHours', { n: String(Math.round(rep.responseTimeMinutes / 60)) })}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
                  <button onClick={() => document.getElementById('settings-profil-form')?.scrollIntoView({ behavior: 'smooth' })} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container-high py-2.5 text-label-md text-on-surface"><Icon name="edit" size={17} /> {t('profile.edit')}</button>
                  <button onClick={() => currentUser && onViewShop?.(currentUser.id)} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary-fixed py-2.5 text-label-md text-primary"><Icon name="storefront" size={17} /> {t('profile.viewShop')}</button>
                </div>
                <div id="settings-profil-form" className="mt-4 grid scroll-mt-24 gap-4 sm:grid-cols-2">
                  <label className="text-label-md text-on-surface">{t('profile.shopName')}<input value={form.fullName} onChange={e => set('fullName', e.target.value)} className={`${field} mt-1`} /></label>
                  <label className="text-label-md text-on-surface">{t('profile.country')}
                    <Select value={form.countryCode} onChange={e => changeCountry(e.target.value)} className={`${field} mt-1`}>
                      {!countries.some(c => c.code === form.countryCode) && <option value={form.countryCode}>{country?.name ?? form.countryCode}</option>}
                      {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </Select>
                  </label>
                  <label className="text-label-md text-on-surface">{t('profile.city')}
                    <Select value={form.city} onChange={e => set('city', e.target.value)} className={`${field} mt-1`}>
                      <option value="">—</option>
                      {[...new Set([form.city, ...placeOptions(lists)].filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </label>
                  <label className="text-label-md text-on-surface sm:col-span-2">{t('profile.bio')}
                    <textarea value={form.bio} maxLength={250} rows={3} onChange={e => set('bio', e.target.value)} className={`${field} mt-1 resize-none`} />
                    <span className="block text-right text-label-sm text-on-surface-variant">{t('profile.bioCount', { n: form.bio.length })}</span>
                  </label>
                  <label className="text-label-md text-on-surface">{t('profile.phone')}
                    <span className="mt-1 flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3"><Icon name="chat" size={18} className="text-tertiary" /><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={country ? `+${country.dialCode} ${country.phoneExample}` : ''} className="w-full border-none bg-transparent py-2.5 text-body-md text-on-surface outline-none" /></span>
                    {noEmail && <span className="mt-1 block text-body-sm text-on-surface-variant">{t('profile.phoneLoginHint')}</span>}
                  </label>
                  {noEmail && !addingEmail && !emailChanged ? (
                    <div className="text-label-md text-on-surface">{t('profile.email')}
                      <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-3 py-2">
                        <Icon name="mail" size={18} className="text-on-surface-variant" />
                        <span className="min-w-0 flex-1 text-body-md text-on-surface-variant">{t('profile.noEmail')}</span>
                        <button type="button" onClick={() => setAddingEmail(true)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary-fixed px-2.5 py-1.5 text-label-md text-primary"><Icon name="add" size={16} /> {t('profile.addEmail')}</button>
                      </div>
                    </div>
                  ) : (
                    <label className="text-label-md text-on-surface">{noEmail ? t('profile.newEmail') : t('profile.transactionalEmail')}
                      <span className="mt-1 flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3"><Icon name="mail" size={18} className="text-on-surface-variant" /><input type="email" value={form.email} autoFocus={addingEmail} autoComplete="email" placeholder={t('profile.emailPh')} onChange={e => set('email', e.target.value)} className="w-full border-none bg-transparent py-2.5 text-body-md text-on-surface outline-none" /></span>
                      {noEmail && <span className="mt-1 block text-body-sm text-on-surface-variant">{t('profile.emailConfirmHint')}</span>}
                    </label>
                  )}
                  {needsPw && (
                    <label className="text-label-md text-on-surface">{t('profile.currentPassword')}
                      <input type="password" autoComplete="current-password" value={emailPw} onChange={e => setEmailPw(e.target.value)} placeholder={emailChanged ? t('profile.pwForEmail') : t('profile.pwForPhone')} className={`${field} mt-1`} />
                    </label>
                  )}
                </div>
              </Card>

              {me && <HandleCard key={`h-${me.id}`} handle={me.handle} changedAt={me.handleChangedAt} onSaved={() => void refetch()} />}

              {me && <SellerPageCard key={me.id} me={me} certified={currentUser?.badge === 'CERTIFIED'} onSaved={() => void refetch()} onUpgrade={() => onNavigate('seller-badge')} />}

              <LanguageCard />

              {/* Alertes */}
              <Card id="alertes" icon="notifications_active" title={t('alerts.title')} sub={t('alerts.sub')}
                aside={<button onClick={() => set('alerts', Object.fromEntries(ALERTS.map(a => [a.key, { push: !allOn, whatsapp: form.alerts[a.key]?.whatsapp ?? false, email: !allOn }])))} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">{allOn ? t('alerts.allOff') : t('alerts.allOn')}</button>}>
                <div className={`mb-3 flex items-center gap-3 rounded-xl p-3 ${pushStatus === 'subscribed' ? 'bg-tertiary-soft' : 'bg-surface-container-low'}`}>
                  <Icon name="phonelink_ring" size={20} className={pushStatus === 'subscribed' ? 'text-tertiary' : 'text-on-surface-variant'} />
                  <span className="flex-1 text-body-sm text-on-surface">{pushStatus === 'subscribed' ? t('push.subscribed') : pushStatus === 'permission-denied' ? t('push.denied') : pushStatus === 'ios-install-required' ? t('push.ios') : t('push.off')}</span>
                  {['available', 'permission-required', 'error'].includes(pushStatus) && <button onClick={() => void subscribeToPush(true).then(setPushStatus)} className="cursor-pointer rounded-lg border-none bg-primary px-3 py-1.5 text-label-md text-white">{t('push.enable')}</button>}
                </div>
                <PhoneVerifyCard wantsSms={ALERTS.some(a => a.sms && form.alerts[a.key]?.whatsapp)} unsavedPhone={form.phone.trim() !== (me.phone ?? '')} />
                {/* The card adapts to its own width (container query): full channel
                    matrix when it fits, otherwise one row per alert with 3 switches. */}
                <div className="@container">
                <div className="flex flex-col divide-y divide-outline-variant/50 @2xl:hidden">
                  {ALERTS.map(a => (
                    <div key={a.key} className="py-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary"><Icon name={a.icon} size={18} /></span>
                        <div className="min-w-0 flex-1"><div className="text-label-md text-on-surface">{a.title}</div><div className="text-body-sm text-on-surface-variant max-md:hidden">{a.sub}</div></div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 sm:pl-12">
                        {([['push', t('channel.push')], ['whatsapp', 'WhatsApp'], ['email', t('channel.email')]] as [Channel, string][]).map(([ch, label]) => (
                          <label key={ch} className="flex min-w-0 flex-col items-center gap-1.5 whitespace-nowrap rounded-lg bg-surface-container-low px-1 py-2 text-label-sm text-on-surface-variant sm:flex-row sm:justify-between sm:gap-2 sm:px-2.5 sm:py-1.5">
                            {label}
                            {ch === 'whatsapp' && !a.sms
                              ? <Toggle label={t('channel.unavailable', { alert: a.title, channel: label })} title={noSmsHint()} disabled on={false} onChange={() => {}} />
                              : <Toggle label={t('channel.toggle', { alert: a.title, channel: label })} tone={ch === 'whatsapp' ? 'tertiary' : 'primary'} on={!!form.alerts[a.key]?.[ch]} onChange={v => set('alerts', { ...form.alerts, [a.key]: { ...form.alerts[a.key], [ch]: v } })} />}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden @2xl:block">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
                        <th className="rounded-l-xl px-3 py-2.5 text-left font-semibold">{t('alerts.colType')}</th>
                        <th className="px-3 py-2.5 font-semibold">{t('alerts.colPush')}</th><th className="px-3 py-2.5 font-semibold">WhatsApp / SMS</th><th className="rounded-r-xl px-3 py-2.5 font-semibold">{t('alerts.colEmail')}</th>{/* i18n-ignore */}
                      </tr>
                    </thead>
                    <tbody>
                      {ALERTS.map(a => (
                        <tr key={a.key} className="border-0 border-b border-solid border-outline-variant/50">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2 text-label-md text-on-surface"><Icon name={a.icon} size={17} className="text-primary" /> {a.title}</div>
                            <div className="text-body-sm text-on-surface-variant">{a.sub}</div>
                          </td>
                          {(['push', 'whatsapp', 'email'] as Channel[]).map(ch => (
                            <td key={ch} className="px-3 py-3 text-center">
                              <span className="inline-flex">{ch === 'whatsapp' && !a.sms
                                ? <Toggle label={t('channel.unavailable', { alert: a.title, channel: 'WhatsApp / SMS' })} title={noSmsHint()} disabled on={false} onChange={() => {}} />
                                : <Toggle label={t('channel.toggle', { alert: a.title, channel: ch })} tone={ch === 'whatsapp' ? 'tertiary' : 'primary'} on={!!form.alerts[a.key]?.[ch]} onChange={v => set('alerts', { ...form.alerts, [a.key]: { ...form.alerts[a.key], [ch]: v } })} />}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
                <p className="m-0 mt-2 text-label-sm text-on-surface-variant">{t('alerts.footnote')}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <Icon name="bedtime" size={22} className="text-on-surface-variant" />
                  <div className="min-w-[12rem] flex-1">
                    <div className="text-label-md text-on-surface">{t('quiet.title')}</div>
                    <div className="text-body-sm text-on-surface-variant">
                      {form.quiet.enabled
                        ? t('quiet.on', { start: hm(form.quiet.start), end: hm(form.quiet.end) })
                        : t('quiet.off', { start: hm(SMS_NIGHT.start), end: hm(SMS_NIGHT.end) })}
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-lg bg-surface-lowest px-2 py-1 text-label-sm">
                    <input type="time" aria-label={t('quiet.startAria')} value={form.quiet.start} onChange={e => set('quiet', { ...form.quiet, start: e.target.value })} className="border-none bg-transparent text-label-sm text-on-surface" /> –
                    <input type="time" aria-label={t('quiet.endAria')} value={form.quiet.end} onChange={e => set('quiet', { ...form.quiet, end: e.target.value })} className="border-none bg-transparent text-label-sm text-on-surface" />
                  </span>
                  <Toggle label={t('quiet.toggle')} on={form.quiet.enabled} onChange={v => set('quiet', { ...form.quiet, enabled: v })} />
                </div>
              </Card>

              {/* Remise & paiements */}
              <Card id="remise" icon="handshake" iconCls="bg-tertiary-soft text-tertiary" title={t('handover.title')} sub={t('handover.sub')}
                aside={<Claim><span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary"><Icon name="savings" size={15} /> {t('handover.noCommission')}</span></Claim>}>
                <div className="text-label-md text-on-surface">{t('handover.spots')}</div>
                <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">{t('handover.spotsHint')}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[...lists.meetupSpots, ...form.meetupSpots.filter(s => !lists.meetupSpots.some(x => x.name === s)).map(name => ({ name, sub: t('handover.customSpot') }))].map(s => {
                    const on = form.meetupSpots.includes(s.name)
                    return (
                      <label key={s.name} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${on ? 'border-primary/40 bg-primary-fixed/20' : 'border-outline-variant bg-surface-container-low'}`}>
                        <input type="checkbox" checked={on} onChange={e => set('meetupSpots', e.target.checked ? [...form.meetupSpots, s.name] : form.meetupSpots.filter(x => x !== s.name))} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                        <span><span className="block text-label-md text-on-surface">{s.name}</span><span className="block text-body-sm text-on-surface-variant max-md:hidden">{s.sub}</span></span>
                      </label>
                    )
                  })}
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-outline-variant p-2">
                    <input value={newSpot} onChange={e => setNewSpot(e.target.value)} placeholder={t('handover.addSpotPh')} aria-label={t('handover.addSpotPh')} className="min-w-0 flex-1 border-none bg-transparent px-1 text-body-sm text-on-surface outline-none" />
                    <button disabled={!newSpot.trim()} onClick={() => { set('meetupSpots', [...new Set([...form.meetupSpots, newSpot.trim()])]); setNewSpot('') }} className="cursor-pointer rounded-lg border-none bg-surface-container-high px-2.5 py-1.5 text-label-sm text-on-surface disabled:opacity-50">{t('handover.add')}</button>
                  </div>
                </div>
                <div className="mt-5 text-label-md text-on-surface">{t('handover.methods')}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                  {payments.map(p => {
                    const on = form.paymentMethods.includes(p.code)
                    return (
                      <label key={p.code} className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 ${on ? 'border-primary/40 bg-surface-lowest' : 'border-outline-variant bg-surface-container-low'}`}>
                        <span className="flex items-start justify-between"><PaymentLogo method={p.code} size={30} /><input type="checkbox" checked={on} onChange={e => set('paymentMethods', e.target.checked ? [...form.paymentMethods, p.code] : form.paymentMethods.filter(x => x !== p.code))} className="h-4 w-4 accent-[var(--primary)]" /></span>
                        <span className="text-label-md text-on-surface">{p.title}</span>
                        <span className="text-body-sm text-on-surface-variant max-md:hidden">{p.sub}</span>
                      </label>
                    )
                  })}
                </div>
                <Claim><div className="mt-4 flex gap-3 rounded-xl bg-tertiary-soft p-3">
                  <Icon name="shield" size={22} className="shrink-0 text-tertiary" />
                  <p className="m-0 text-body-sm text-on-surface">{t.rich('handover.commissionNote', { b: c => <b>{c}</b> })}</p>
                </div></Claim>
              </Card>

              {/* Sécurité */}
              <Card id="securite" icon="security" title={t('security.title')} sub={t('security.sub')}
                aside={<span className="flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface"><Icon name="lock" size={14} /> {me.isVerified ? t('security.verified') : t('security.notVerified')}</span>}>
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <Icon name="badge" size={22} className={me.isVerified ? 'text-tertiary' : 'text-on-surface-variant'} />
                  <div className="min-w-[12rem] flex-1">
                    <div className="text-label-md text-on-surface">{t('security.kycTitle')}</div>
                    <div className="text-body-sm text-on-surface-variant">{me.isVerified ? t('security.kycValidated', { date: fmtDate(me.verifiedAt ?? rep?.verifiedAt ?? me.createdAt, { day: 'numeric', month: 'long', year: 'numeric' }) }) : t('security.kycPrompt')}</div>
                  </div>
                  <button onClick={() => onNavigate('seller-kyc')} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border-none px-3 py-1.5 text-label-md ${me.isVerified ? 'bg-surface-lowest text-on-surface' : 'bg-primary text-white'}`}>
                    <Icon name={me.isVerified ? 'visibility' : 'verified_user'} size={16} /> {me.isVerified ? t('security.view') : t('security.verify')}
                  </button>
                </div>
                <LoginMethodsCard />
                {hasPassword && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <Icon name="password" size={22} className="text-on-surface-variant" />
                  <div className="min-w-[12rem] flex-1">
                    <div className="text-label-md text-on-surface">{t('security.password')}</div>
                    <div className="text-body-sm text-on-surface-variant">{t('security.passwordHint')}</div>
                  </div>
                  {!pwOpen && <button onClick={() => { setPwOpen(true); setPwMsg(null) }} className="cursor-pointer rounded-lg border border-outline-variant bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface">{tc('edit')}</button>}
                  {pwOpen && (
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                      <input type="password" placeholder={t('profile.currentPassword')} value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} className={field} />
                      <input type="password" placeholder={t('security.newPasswordPh')} value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} className={field} />
                      <button disabled={changingPw || !pw.current || pw.next.length < 8} onClick={() => void changePassword({ variables: { input: { currentPassword: pw.current, newPassword: pw.next } } }).then(() => refreshAccessToken()).then(() => { void refetchSessions(); setPwMsg({ ok: true, text: settings.t('security.passwordUpdated') }); setPwOpen(false); setPw({ current: '', next: '' }) }).catch(e => setPwMsg({ ok: false, text: e.message }))} className="shrink-0 cursor-pointer rounded-xl border-none bg-primary px-4 py-2 text-label-md text-white disabled:opacity-50">{tc('confirm')}</button>
                    </div>
                  )}
                  {pwMsg && <p className={`m-0 w-full text-body-sm ${pwMsg.ok ? 'text-tertiary' : 'text-primary'}`}>{pwMsg.text}</p>}
                </div>}
                <AdultConfirmationSetting />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-label-md text-on-surface">{t('security.sessions')}</div>
                  {sessions.some(x => x.current) && sessions.length > 1 && <button disabled={revokingOthers} onClick={() => void revokeOthers().then(() => refetchSessions())} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary"><span className="md:hidden">{t('security.signOutOthersShort')}</span><span className="max-md:hidden">{t('security.signOutOthers')}</span></button>}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {sessionGroups.map(g => (
                    <div key={g.key} className="flex items-center gap-3 rounded-xl border border-outline-variant p-3">
                      <Icon name={g.d.icon} size={22} className="shrink-0 text-on-surface-variant" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-label-md text-on-surface">{g.d.name}{g.current && <span className="rounded bg-tertiary-soft px-1.5 text-label-sm text-tertiary">{t('security.thisDevice')}</span>}{g.ids.length > 1 && <span className="rounded bg-surface-container px-1.5 text-label-sm text-on-surface-variant">{t('security.sessionCount', { n: g.ids.length })}</span>}</div>
                        <div className="text-body-sm text-on-surface-variant">{t(g.ids.length > 1 ? 'security.lastLogin' : 'security.connectedOn', { date: fmtDate(g.last, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}</div>
                      </div>
                      {g.current ? <Icon name="check_circle" size={20} className="shrink-0 text-tertiary" /> : <button onClick={() => void Promise.all(g.ids.map(id => revokeSession({ variables: { sessionId: id } }))).then(() => refetchSessions())} className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-none bg-surface-container-high px-3 py-1.5 text-label-md text-on-surface">{t('security.signOut')}</button>}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Compte */}
              <Card id="compte" icon="warning" title={t('account.title')} sub={t('account.sub')}>
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <div className="min-w-[12rem] flex-1">
                    <div className="text-label-md text-on-surface">{t('account.vacation')}</div>
                    <div className="text-body-sm text-on-surface-variant">{t('account.vacationHint', { count: rep?.activeListings ?? 0 })}</div>
                  </div>
                  <Toggle label={t('account.vacationToggle')} on={me.vacationMode} onChange={v => void setVacation(v)} />
                  {vacationSaving && <Icon name="progress_activity" size={18} className="animate-spin text-on-surface-variant" />}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <Icon name={dark ? 'dark_mode' : 'light_mode'} size={22} className="text-on-surface-variant" />
                  <div className="min-w-[12rem] flex-1"><div className="text-label-md text-on-surface">{t('account.appearance')}</div><div className="text-body-sm text-on-surface-variant">{dark ? t('account.darkOn') : t('account.lightOn')}</div></div>
                  <Toggle label={t('account.darkToggle')} on={dark} onChange={onToggleDark} />
                </div>
                <PersonalizeHomeSetting className="mt-3" prefs={me.notificationPreferences}
                  onHelp={() => requestOpenHelp('accueil-personnalise')}
                  onSaved={(p) => { void refetch(); if (currentUser) onProfileUpdated({ ...currentUser, notificationPreferences: p as AuthUser['notificationPreferences'] }) }} />
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <Icon name="menu_book" size={22} className="text-on-surface-variant" />
                  <div className="min-w-[12rem] flex-1"><div className="text-label-md text-on-surface">{t('account.tour')}</div><div className="text-body-sm text-on-surface-variant">{t('account.tourHint')}</div></div>
                  <button onClick={() => void replayTours()} className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-surface-lowest px-3 py-2 text-label-md text-on-surface shadow-sm hover:bg-surface-container"><Icon name="replay" size={17} /> {t('account.tourReplay')}</button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary-fixed/30 p-3">
                  <div className="min-w-[12rem] flex-1">
                    <div className="text-label-md text-primary">{t('account.deleteTitle')}</div>
                    <div className="text-body-sm text-on-surface-variant">{t('account.deleteHint')}</div>
                  </div>
                  <button onClick={() => setDeleteOpen(true)} className="cursor-pointer rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white">{t('account.deleteMine')}</button>
                </div>
              </Card>
              <button onClick={onLogout} className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-none bg-surface-container-high py-3.5 text-label-lg text-on-surface md:hidden"><Icon name="logout" size={19} /> {t('account.signOut')}</button>
            </div>

            {/* Aside */}
            <aside className="order-first hidden grid-cols-[minmax(0,1fr)] content-start gap-4 md:grid md:grid-cols-3 2xl:sticky 2xl:top-24 2xl:order-none 2xl:flex 2xl:flex-col 2xl:self-start">
              <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <div className="flex items-center justify-between text-label-sm uppercase text-on-surface-variant">{t('aside.badgePreview')} <span className="h-2 w-2 rounded-full bg-tertiary" /></div>
                <div className="mt-3 rounded-xl bg-surface-container-low p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">{form.avatarUrl ? <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" /> : form.fullName.charAt(0)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 truncate text-label-md text-on-surface">{form.fullName}<SellerBadge tier={me.badge} size={14} /></div>
                      <div className="text-body-sm text-on-surface-variant">{form.city || '—'}</div>
                    </div>
                  </div>
                  {me.badge && <div className="mt-2"><SellerBadge tier={me.badge} variant="pill" size={15} /></div>}
                  {form.bio && <p className="m-0 mt-2 line-clamp-3 text-body-sm italic text-on-surface-variant">« {form.bio} »</p>}
                </div>
                <dl className="m-0 mt-3 flex flex-col gap-2 text-body-sm">
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('aside.trustScore')}</dt><dd className="m-0 font-bold text-tertiary">{rep?.trustScore ?? '—'} / 100</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('aside.responseTime')}</dt><dd className="m-0 font-semibold text-on-surface">{rep?.responseTimeMinutes != null ? t('aside.minutes', { n: String(rep.responseTimeMinutes) }) : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('aside.idValidation')}</dt><dd className="m-0 font-semibold text-on-surface">{me.verifiedAt ? fmtDate(me.verifiedAt, { day: 'numeric', month: 'long', year: 'numeric' }) : t('aside.notVerified')}</dd></div>
                </dl>
              </div>
              <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <div className="flex items-center gap-2 text-label-lg text-primary"><Icon name="lightbulb" size={20} /> {t('aside.goldenRules')}</div>
                <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface-variant">
                  {[t('aside.rule1'), t('aside.rule2'), t('aside.rule3')].map(r => (
                    <li key={r} className="flex gap-1.5"><Icon name="check" size={16} className="shrink-0 text-tertiary" /> {r}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <div className="text-label-md text-on-surface">{t('aside.reactivity')}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-headline-lg font-extrabold text-on-surface">{rep?.reactivity != null ? `${Math.round(rep.reactivity)}%` : '—'}</span>
                  {reactivityDelta != null && <span className={`text-label-sm ${reactivityDelta >= 0 ? 'text-tertiary' : 'text-primary'}`}>{t('aside.reactivityDelta', { delta: `${reactivityDelta >= 0 ? '+' : ''}${Math.round(reactivityDelta)}` })}</span>}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-tertiary" style={{ width: `${rep?.reactivity ?? 0}%` }} /></div>
                <p className="m-0 mt-2 text-body-sm text-on-surface-variant">{t('aside.reactivityHint')}</p>
              </div>
            </aside>
          </div>
        )}
      </div>

      {saveMsg && !dirty && (
        <div role="status" className="fixed inset-x-0 bottom-16 z-[60] flex justify-center px-4 lg:bottom-6">
          <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-label-md text-white shadow-float ${saveMsg.ok ? 'bg-tertiary' : 'bg-primary'}`}>
            <Icon name={saveMsg.ok ? 'check_circle' : 'error'} size={18} /> {saveMsg.text}
          </div>
        </div>
      )}
      {saveMsg && !saveMsg.ok && dirty && <p className="fixed inset-x-0 bottom-32 z-[60] m-0 text-center text-body-sm text-primary lg:bottom-24">{saveMsg.text}</p>}
      {dirty && (
        <div className="fixed inset-x-0 bottom-16 z-[60] flex justify-center px-4 lg:bottom-6">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl bg-inverse-surface px-4 py-3 text-white shadow-float">
            <Icon name="edit_note" size={20} />
            <span className="flex-1 text-label-md">{t('unsaved')}</span>
            <button onClick={() => setForm(initial)} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-white/80">{tc('cancel')}</button>
            <button onClick={() => void save()} disabled={saving} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary px-3 py-1.5 text-label-md text-white"><Icon name="check" size={16} /> {t('saveShort')}</button>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setDeleteOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-surface-lowest p-5 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="m-0 flex items-center gap-2 text-headline-sm text-primary"><Icon name="warning" size={22} /> {t('delete.title')}</h3>
            <p className="m-0 mt-2 text-body-md text-on-surface-variant">{hasPassword ? t('delete.withPassword') : t('delete.noPassword')}</p>
            {hasPassword && <input type="password" value={deletePw} onChange={e => setDeletePw(e.target.value)} placeholder={t('delete.passwordPh')} className={`${field} mt-3`} />}
            {deleteError && <p className="m-0 mt-1 text-body-sm text-primary">{deleteError.message}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high py-2.5 text-label-md text-on-surface">{tc('cancel')}</button>
              <button disabled={(hasPassword && !deletePw) || deleting} onClick={() => void deleteAccount({ variables: { password: hasPassword ? deletePw : null } }).then(() => onLogout())} className="flex-1 cursor-pointer rounded-xl border-none bg-primary py-2.5 text-label-md text-white disabled:opacity-50">{t('delete.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
