import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import { AccountLayout } from '../account/AccountLayout'
import { CHANGE_PASSWORD_MUTATION } from '../../graphql/account'
import {
  DELETE_MY_ACCOUNT_MUTATION, MY_SESSIONS_QUERY, REVOKE_OTHER_SESSIONS_MUTATION, REVOKE_SESSION_MUTATION, SELLER_SETTINGS_QUERY,
  UPDATE_PREFERENCES_JSON_MUTATION, UPDATE_SELLER_PROFILE_MUTATION, type UserSession,
} from '../../graphql/sellerTools'
import { getRefreshToken } from '../../lib/auth'
import { uploadImages } from '../../lib/upload'
import { getPushAvailability, subscribeToPush, type PushSubscriptionResult } from '../../lib/pushNotifications'
import type { AuthUser } from '../../graphql/auth'

type Props = {
  onNavigate: (p: any) => void; currentUser?: AuthUser | null; onLogout: () => void
  onProfileUpdated: (u: AuthUser) => void; dark: boolean; onToggleDark: () => void
}

type Channel = 'push' | 'whatsapp' | 'email'
type Alerts = Record<string, Record<Channel, boolean>>
type Quiet = { enabled: boolean; start: string; end: string }
type SettingsData = {
  me: AuthUser & { email: string; verifiedAt: string | null; meetupSpots: string[]; paymentMethods: string[]; vacationMode: boolean; notificationPreferences: Record<string, any>; createdAt: string }
  myReputation: {
    averageRating: number; reviewsCount: number; satisfactionRate: number | null; salesCount: number; responseTimeMinutes: number | null
    trustScore: number; reactivity: number | null; reactivityPrev: number | null; activeListings: number; isVerified: boolean; hasPhone: boolean; verifiedAt: string | null
  }
}

const TABS = [
  { id: 'profil', icon: 'storefront', label: 'Profil Vendeur & Boutique' },
  { id: 'alertes', icon: 'notifications_active', label: 'Notifications & Alertes' },
  { id: 'remise', icon: 'handshake', label: 'Remise & Paiements P2P' },
  { id: 'securite', icon: 'verified_user', label: 'Sécurité & Identité' },
  { id: 'compte', icon: 'tune', label: 'Gestion du compte' },
]
const ALERTS = [
  { key: 'messages', icon: 'forum', title: 'Nouveaux messages & Offres directes', sub: "Alerte instantanée dès qu'un acheteur négocie ou pose une question sur un article." },
  { key: 'meetups', icon: 'calendar_clock', title: 'Confirmations & Rappels Remises', sub: 'Rendez-vous proposés, confirmés et litiges sur vos remises.' },
  { key: 'boosts', icon: 'rocket_launch', title: 'Performance & Fin des Boosts', sub: "Expiration d'un boost ou remontée en tête avec bilan des vues." },
  { key: 'advice', icon: 'insights', title: "Conseils & Pics d'affluence", sub: 'Nouvelles annonces correspondant à vos recherches et pics de recherche.' },
  { key: 'campaigns', icon: 'campaign', title: 'Campagnes promos Dilchap', sub: 'Opportunités de visibilité collective (Black Friday, braderies P2P).' },
]
const DEFAULT_ALERTS: Alerts = Object.fromEntries(ALERTS.map(a => [a.key, { push: true, whatsapp: false, email: a.key !== 'advice' }]))
const COMMUNES = ['Cocody', 'Marcory', 'Plateau', 'Yopougon', 'Koumassi', 'Treichville', 'Adjamé', 'Abobo', 'Port-Bouët', 'Bingerville', 'Anyama', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo']
const SUGGESTED_SPOTS = [
  { name: 'Playce Marcory • Carrefour Duncan', sub: 'Zone commerciale ultra-fréquentée, parking gardé' },
  { name: 'Cap Sud Marcory • Entrée Principale', sub: 'Boulevard VGE, caméras & cafés à disposition' },
  { name: 'Playce Cocody Riviera • Espace Food', sub: 'Idéal pour les rendez-vous en journée' },
  { name: 'Sococé Deux-Plateaux • Galerie', sub: 'Galerie marchande, sécurité renforcée' },
  { name: 'Cosmos Yopougon • Hall principal', sub: 'Centre commercial éclairé et surveillé' },
]
const PAYMENTS = [
  { code: 'WAVE', icon: 'qr_code_2', title: "Wave Côte d'Ivoire", sub: 'QR code ou transfert direct' },
  { code: 'ORANGE_MONEY', icon: 'smartphone', title: 'Orange Money CI', sub: 'Transfert direct au numéro du vendeur' },
  { code: 'MTN_MOMO', icon: 'account_balance_wallet', title: 'MTN / Moov Money', sub: 'Réception instantanée sur compte mobile' },
  { code: 'CASH', icon: 'payments', title: 'Espèces en main', sub: 'Appoint exact recommandé lors de la remise' },
]

function Toggle({ on, onChange, label, tone = 'primary' }: { on: boolean; onChange: (v: boolean) => void; label: string; tone?: 'primary' | 'tertiary' }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-none p-0 transition-colors ${on ? (tone === 'tertiary' ? 'bg-tertiary' : 'bg-primary') : 'bg-surface-container-high'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function Card({ id, icon, iconCls = 'bg-primary-fixed text-primary', title, sub, aside, children }: { id: string; icon: string; iconCls?: string; title: string; sub: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={`settings-${id}`} className="scroll-mt-28 rounded-2xl bg-surface-lowest p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconCls}`}><Icon name={icon} size={21} /></span>
        <div className="min-w-0 flex-1">
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
const sinceLabel = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '')
const deviceLabel = (ua: string | null) => {
  if (!ua) return { icon: 'devices', name: 'Appareil inconnu' }
  const mobile = /iPhone|Android|Mobile/i.test(ua)
  const os = /iPhone|iPad/.test(ua) ? 'iPhone / iPad' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Appareil'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur'
  return { icon: mobile ? 'smartphone' : 'laptop_mac', name: `${os} • ${browser}` }
}

// "Paramètres & Notifications" mockup — one form saved at once ("Enregistrer
// les modifications" / unsaved-changes bar), plus the security & account
// actions that apply immediately.
export default function Settings({ onNavigate, currentUser, onLogout, onProfileUpdated, dark, onToggleDark }: Props) {
  const { data, refetch } = useQuery<SettingsData>(SELLER_SETTINGS_QUERY)
  const me = data?.me
  const rep = data?.myReputation

  const initial = useMemo(() => me && ({
    fullName: me.fullName, city: me.city ?? '', bio: me.bio ?? '', phone: me.phone ?? '', email: me.email, avatarUrl: me.avatarUrl ?? '',
    meetupSpots: me.meetupSpots, paymentMethods: me.paymentMethods,
    alerts: { ...DEFAULT_ALERTS, ...(me.notificationPreferences?.alerts ?? {}) } as Alerts,
    quiet: { enabled: false, start: '22:00', end: '07:00', ...(me.notificationPreferences?.quietHours ?? {}) } as Quiet,
  }), [me])
  const [form, setForm] = useState(initial)
  useEffect(() => { setForm(initial) }, [initial])
  const dirty = !!form && !!initial && JSON.stringify(form) !== JSON.stringify(initial)
  const set = <K extends keyof NonNullable<typeof form>>(k: K, v: NonNullable<typeof form>[K]) => setForm(f => (f ? { ...f, [k]: v } : f))

  const [tab, setTab] = useState('profil')
  const [newSpot, setNewSpot] = useState('')
  const [uploading, setUploading] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [updateProfile, { loading: savingProfile }] = useMutation<{ updateProfile: AuthUser }>(UPDATE_SELLER_PROFILE_MUTATION)
  const [updatePrefs, { loading: savingPrefs }] = useMutation(UPDATE_PREFERENCES_JSON_MUTATION)

  const [pushStatus, setPushStatus] = useState<PushSubscriptionResult | 'available'>(() => getPushAvailability())
  useEffect(() => { if (getPushAvailability() === 'available') void subscribeToPush(false).then(setPushStatus) }, [])

  const refreshToken = getRefreshToken()
  const { data: sessionsData, refetch: refetchSessions } = useQuery<{ mySessions: UserSession[] }>(MY_SESSIONS_QUERY, { variables: { currentRefreshToken: refreshToken } })
  const [revokeSession] = useMutation(REVOKE_SESSION_MUTATION)
  const [revokeOthers, { loading: revokingOthers }] = useMutation(REVOKE_OTHER_SESSIONS_MUTATION)

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
    const t = setTimeout(() => setSaveMsg(null), 3000)
    return () => clearTimeout(t)
  }, [saveMsg])

  const save = async () => {
    if (!form || !me) return
    setSaveMsg(null)
    try {
      const { data: res } = await updateProfile({
        variables: {
          input: {
            fullName: form.fullName.trim(), city: form.city || null, bio: form.bio.trim() || null, phone: form.phone.trim() || null,
            email: form.email.trim() !== me.email ? form.email.trim() : undefined, avatarUrl: form.avatarUrl || null,
            meetupSpots: form.meetupSpots, paymentMethods: form.paymentMethods,
          },
        },
      })
      await updatePrefs({ variables: { preferences: { alerts: form.alerts, quietHours: form.quiet } } })
      if (res?.updateProfile && currentUser) onProfileUpdated({ ...currentUser, ...res.updateProfile })
      await refetch()
      setSaveMsg({ ok: true, text: 'Paramètres enregistrés.' })
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : "L'enregistrement a échoué." })
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
  const saving = savingProfile || savingPrefs

  return (
    <AccountLayout active="buyer-settings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-28">
        <nav className="mb-2 hidden items-center gap-1 text-label-sm text-on-surface-variant md:flex">
          <span>Dilchap Seller</span><Icon name="chevron_right" size={14} />
          <button onClick={() => onNavigate('buyer-dashboard')} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-primary">Tableau de bord</button>
          <Icon name="chevron_right" size={14} /><span className="text-on-surface">Paramètres &amp; Préférences</span>
        </nav>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">Paramètres &amp; Notifications</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Gérez vos informations de vendeur, vos préférences de contact, la sécurité de votre compte et vos alertes de transactions.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onNavigate('seller-wallet')} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-surface-container-high px-4 py-2.5 text-label-md text-on-surface"><Icon name="history" size={18} /> Historique d'activité</button>
            <button onClick={() => void save()} disabled={!dirty || saving} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark disabled:opacity-50"><Icon name="check" size={18} /> Enregistrer les modifications</button>
          </div>
        </div>

        <div className="sticky top-0 z-20 -mx-1 mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-surface-lowest p-1.5 shadow-sm">
          {TABS.map(t => (
            <button key={t.id} onClick={() => goTab(t.id)} className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border-none px-3 py-2 text-label-md ${tab === t.id ? 'bg-surface-container-low text-primary shadow-sm' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}>
              <Icon name={t.icon} size={17} /> {t.label}
            </button>
          ))}
        </div>

        {!form || !me ? <p className="text-body-md text-on-surface-variant">Chargement…</p> : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-5">
              {/* Profil */}
              <Card id="profil" icon="store" title="Profil Public du Vendeur" sub={`Visible par les acheteurs sur vos ${rep?.activeListings ?? 0} annonce${(rep?.activeListings ?? 0) > 1 ? 's' : ''} en ligne.`}
                aside={me.isVerified ? <span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary"><Icon name="verified" size={15} /> Vendeur Certifié</span> : undefined}>
                <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-container-low p-4">
                  <div className="relative">
                    <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-solid border-surface-lowest bg-primary text-headline-md text-white">
                      {form.avatarUrl ? <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" /> : form.fullName.charAt(0).toUpperCase()}
                    </span>
                    <button onClick={() => avatarInput.current?.click()} disabled={uploading} className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-solid border-surface-lowest bg-primary text-white" aria-label="Changer la photo"><Icon name={uploading ? 'progress_activity' : 'photo_camera'} size={16} /></button>
                    <input ref={avatarInput} type="file" accept="image/*" hidden onChange={e => { void pickAvatar(e.target.files); e.target.value = '' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-headline-sm text-on-surface">{form.fullName}{me.isVerified && <Icon name="verified" size={18} className="text-tertiary" />}</div>
                    <div className="text-body-sm text-on-surface-variant">Membre depuis {sinceLabel(me.createdAt)}{rep?.reviewsCount ? ` • ${Math.round(rep.satisfactionRate ?? 0)}% d'avis positifs` : ''} ({rep?.salesCount ?? 0} vente{(rep?.salesCount ?? 0) > 1 ? 's' : ''})</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {me.isVerified && <span className="flex items-center gap-1 rounded bg-surface-lowest px-1.5 py-0.5 text-label-sm text-on-surface"><Icon name="check_circle" size={13} className="text-tertiary" /> Identité validée</span>}
                      {me.phone && <span className="flex items-center gap-1 rounded bg-surface-lowest px-1.5 py-0.5 text-label-sm text-on-surface"><Icon name="phone_android" size={13} /> Numéro renseigné</span>}
                      {rep?.responseTimeMinutes != null && <span className="flex items-center gap-1 rounded bg-surface-lowest px-1.5 py-0.5 text-label-sm text-on-surface"><Icon name="bolt" size={13} className="text-primary" /> Répond en {rep.responseTimeMinutes < 60 ? `${rep.responseTimeMinutes} min` : `${Math.round(rep.responseTimeMinutes / 60)} h`}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-label-md text-on-surface">Nom officiel de la boutique<input value={form.fullName} onChange={e => set('fullName', e.target.value)} className={`${field} mt-1`} /></label>
                  <label className="text-label-md text-on-surface">Commune principale de référence
                    <select value={form.city} onChange={e => set('city', e.target.value)} className={`${field} mt-1`}>
                      <option value="">—</option>
                      {[...new Set([form.city, ...COMMUNES].filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="text-label-md text-on-surface sm:col-span-2">Description / Bio publique de la boutique
                    <textarea value={form.bio} maxLength={250} rows={3} onChange={e => set('bio', e.target.value)} className={`${field} mt-1 resize-none`} />
                    <span className="block text-right text-label-sm text-on-surface-variant">{form.bio.length}/250 caractères</span>
                  </label>
                  <label className="text-label-md text-on-surface">Numéro WhatsApp &amp; Appels
                    <span className="mt-1 flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3"><Icon name="chat" size={18} className="text-tertiary" /><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+225 07 00 00 00 00" className="w-full border-none bg-transparent py-2.5 text-body-md text-on-surface outline-none" /></span>
                  </label>
                  <label className="text-label-md text-on-surface">Adresse e-mail transactionnelle
                    <span className="mt-1 flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3"><Icon name="mail" size={18} className="text-on-surface-variant" /><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="w-full border-none bg-transparent py-2.5 text-body-md text-on-surface outline-none" /></span>
                  </label>
                </div>
              </Card>

              {/* Alertes */}
              <Card id="alertes" icon="notifications_active" title="Gestion des Notifications & Alertes" sub="Choisissez comment et quand vous souhaitez être prévenu des opportunités de vente."
                aside={<button onClick={() => set('alerts', Object.fromEntries(ALERTS.map(a => [a.key, { push: !allOn, whatsapp: form.alerts[a.key]?.whatsapp ?? false, email: !allOn }])))} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">{allOn ? 'Tout désactiver' : 'Activer tout par défaut'}</button>}>
                <div className={`mb-3 flex items-center gap-3 rounded-xl p-3 ${pushStatus === 'subscribed' ? 'bg-tertiary-soft' : 'bg-surface-container-low'}`}>
                  <Icon name="phonelink_ring" size={20} className={pushStatus === 'subscribed' ? 'text-tertiary' : 'text-on-surface-variant'} />
                  <span className="flex-1 text-body-sm text-on-surface">{pushStatus === 'subscribed' ? 'Notifications push actives sur cet appareil.' : pushStatus === 'permission-denied' ? 'Notifications bloquées dans le navigateur — autorisez-les dans ses réglages.' : pushStatus === 'ios-install-required' ? "Sur iPhone, ajoutez Dilchap à l'écran d'accueil pour recevoir les notifications." : 'Notifications push non activées sur cet appareil.'}</span>
                  {['available', 'permission-required', 'error'].includes(pushStatus) && <button onClick={() => void subscribeToPush(true).then(setPushStatus)} className="cursor-pointer rounded-lg border-none bg-primary px-3 py-1.5 text-label-md text-white">Activer</button>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
                        <th className="rounded-l-xl px-3 py-2.5 text-left font-semibold">Type d'alerte transactionnelle</th>
                        <th className="px-3 py-2.5 font-semibold">App Push</th><th className="px-3 py-2.5 font-semibold">WhatsApp / SMS</th><th className="rounded-r-xl px-3 py-2.5 font-semibold">E-mail</th>
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
                              <span className="inline-flex"><Toggle label={`${a.title} — ${ch}`} tone={ch === 'whatsapp' ? 'tertiary' : 'primary'} on={!!form.alerts[a.key]?.[ch]} onChange={v => set('alerts', { ...form.alerts, [a.key]: { ...form.alerts[a.key], [ch]: v } })} /></span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="m-0 mt-2 text-label-sm text-on-surface-variant">Les alertes push sont actives aujourd'hui ; les envois WhatsApp/SMS et e-mail suivront vos préférences dès l'ouverture de ces canaux.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <Icon name="bedtime" size={22} className="text-on-surface-variant" />
                  <div className="min-w-0 flex-1">
                    <div className="text-label-md text-on-surface">Plage horaire silencieuse (Ne pas déranger)</div>
                    <div className="text-body-sm text-on-surface-variant">Suspendre les notifications push entre {form.quiet.start.replace(':', 'h')} et {form.quiet.end.replace(':', 'h')} (heure d'Abidjan).</div>
                  </div>
                  <span className="flex items-center gap-1 rounded-lg bg-surface-lowest px-2 py-1 text-label-sm">
                    <input type="time" value={form.quiet.start} onChange={e => set('quiet', { ...form.quiet, start: e.target.value })} className="border-none bg-transparent text-label-sm text-on-surface" /> –
                    <input type="time" value={form.quiet.end} onChange={e => set('quiet', { ...form.quiet, end: e.target.value })} className="border-none bg-transparent text-label-sm text-on-surface" />
                  </span>
                  <Toggle label="Plage silencieuse" on={form.quiet.enabled} onChange={v => set('quiet', { ...form.quiet, enabled: v })} />
                </div>
              </Card>

              {/* Remise & paiements */}
              <Card id="remise" icon="handshake" iconCls="bg-tertiary-soft text-tertiary" title="Lieux de Remise & Moyens de Paiement" sub="Paramétrez vos points de rendez-vous sécurisés et vos canaux de paiement directs."
                aside={<span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary"><Icon name="savings" size={15} /> 0% Commission Dilchap</span>}>
                <div className="text-label-md text-on-surface">Points de remise en main propre favoris</div>
                <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">Proposés aux acheteurs lors de la prise de rendez-vous :</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[...SUGGESTED_SPOTS, ...form.meetupSpots.filter(s => !SUGGESTED_SPOTS.some(x => x.name === s)).map(name => ({ name, sub: 'Repère personnalisé' }))].map(s => {
                    const on = form.meetupSpots.includes(s.name)
                    return (
                      <label key={s.name} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${on ? 'border-primary/40 bg-primary-fixed/20' : 'border-outline-variant bg-surface-container-low'}`}>
                        <input type="checkbox" checked={on} onChange={e => set('meetupSpots', e.target.checked ? [...form.meetupSpots, s.name] : form.meetupSpots.filter(x => x !== s.name))} className="mt-0.5 h-4 w-4 accent-[#BB0013]" />
                        <span><span className="block text-label-md text-on-surface">{s.name}</span><span className="block text-body-sm text-on-surface-variant">{s.sub}</span></span>
                      </label>
                    )
                  })}
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-outline-variant p-2">
                    <input value={newSpot} onChange={e => setNewSpot(e.target.value)} placeholder="Ajouter un autre repère sécurisé" className="min-w-0 flex-1 border-none bg-transparent px-1 text-body-sm text-on-surface outline-none" />
                    <button disabled={!newSpot.trim()} onClick={() => { set('meetupSpots', [...new Set([...form.meetupSpots, newSpot.trim()])]); setNewSpot('') }} className="cursor-pointer rounded-lg border-none bg-surface-container-high px-2.5 py-1.5 text-label-sm text-on-surface disabled:opacity-50">+ Ajouter</button>
                  </div>
                </div>
                <div className="mt-5 text-label-md text-on-surface">Modes de règlement acceptés à la remise</div>
                <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {PAYMENTS.map(p => {
                    const on = form.paymentMethods.includes(p.code)
                    return (
                      <label key={p.code} className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 ${on ? 'border-primary/40 bg-surface-lowest' : 'border-outline-variant bg-surface-container-low'}`}>
                        <span className="flex items-start justify-between"><Icon name={p.icon} size={22} className="text-primary" /><input type="checkbox" checked={on} onChange={e => set('paymentMethods', e.target.checked ? [...form.paymentMethods, p.code] : form.paymentMethods.filter(x => x !== p.code))} className="h-4 w-4 accent-[#BB0013]" /></span>
                        <span className="text-label-md text-on-surface">{p.title}</span>
                        <span className="text-body-sm text-on-surface-variant">{p.sub}</span>
                      </label>
                    )
                  })}
                </div>
                <div className="mt-4 flex gap-3 rounded-xl bg-tertiary-soft p-3">
                  <Icon name="shield" size={22} className="shrink-0 text-tertiary" />
                  <p className="m-0 text-body-sm text-on-surface"><b>Dilchap ne prélève aucune commission sur vos transactions directes.</b> 100% du prix convenu vous revient. Nos revenus proviennent uniquement des options de mise en avant (Boosts).</p>
                </div>
              </Card>

              {/* Sécurité */}
              <Card id="securite" icon="security" title="Sécurité & Connexions" sub="Surveillez l'accès à votre compte et vos validations d'identité."
                aside={<span className="flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface"><Icon name="lock" size={14} /> {me.isVerified ? 'Identité vérifiée' : 'Identité non vérifiée'}</span>}>
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <Icon name="badge" size={22} className={me.isVerified ? 'text-tertiary' : 'text-on-surface-variant'} />
                  <div className="min-w-0 flex-1">
                    <div className="text-label-md text-on-surface">Vérification d'identité (CNI)</div>
                    <div className="text-body-sm text-on-surface-variant">{me.isVerified ? `Validée le ${new Date(me.verifiedAt ?? rep?.verifiedAt ?? me.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} par l'équipe Dilchap.` : "Le badge « Vendeur certifié » est attribué par l'équipe Dilchap après vérification de votre pièce d'identité."}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <Icon name="password" size={22} className="text-on-surface-variant" />
                  <div className="min-w-0 flex-1">
                    <div className="text-label-md text-on-surface">Mot de passe</div>
                    <div className="text-body-sm text-on-surface-variant">Utilisez au moins 8 caractères, différents de vos autres comptes.</div>
                  </div>
                  {!pwOpen && <button onClick={() => { setPwOpen(true); setPwMsg(null) }} className="cursor-pointer rounded-lg border border-outline-variant bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface">Modifier</button>}
                  {pwOpen && (
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                      <input type="password" placeholder="Mot de passe actuel" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} className={field} />
                      <input type="password" placeholder="Nouveau (8 caractères min.)" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} className={field} />
                      <button disabled={changingPw || !pw.current || pw.next.length < 8} onClick={() => void changePassword({ variables: { input: { currentPassword: pw.current, newPassword: pw.next } } }).then(() => { setPwMsg({ ok: true, text: 'Mot de passe mis à jour.' }); setPwOpen(false); setPw({ current: '', next: '' }) }).catch(e => setPwMsg({ ok: false, text: e.message }))} className="shrink-0 cursor-pointer rounded-xl border-none bg-primary px-4 py-2 text-label-md text-white disabled:opacity-50">Confirmer</button>
                    </div>
                  )}
                  {pwMsg && <p className={`m-0 w-full text-body-sm ${pwMsg.ok ? 'text-tertiary' : 'text-primary'}`}>{pwMsg.text}</p>}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-label-md text-on-surface">Sessions et appareils actuellement connectés</div>
                  {refreshToken && sessions.length > 1 && <button disabled={revokingOthers} onClick={() => void revokeOthers({ variables: { currentRefreshToken: refreshToken } }).then(() => refetchSessions())} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">Déconnecter tous les autres appareils</button>}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {sessions.map(s => {
                    const d = deviceLabel(s.userAgent)
                    return (
                      <div key={s.id} className="flex items-center gap-3 rounded-xl border border-outline-variant p-3">
                        <Icon name={d.icon} size={22} className="text-on-surface-variant" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-label-md text-on-surface">{d.name}{s.current && <span className="rounded bg-tertiary-soft px-1.5 text-label-sm text-tertiary">Cet appareil</span>}</div>
                          <div className="text-body-sm text-on-surface-variant">Connecté le {new Date(s.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        {s.current ? <Icon name="check_circle" size={20} className="text-tertiary" /> : <button onClick={() => void revokeSession({ variables: { sessionId: s.id } }).then(() => refetchSessions())} className="cursor-pointer rounded-lg border-none bg-surface-container-high px-3 py-1.5 text-label-md text-on-surface">Déconnecter</button>}
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Compte */}
              <Card id="compte" icon="warning" title="Gestion du Compte & Zone Sensible" sub="Mettez en pause vos ventes ou gérez la fermeture de votre profil Dilchap.">
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-label-md text-on-surface">Mode Vacances / Pause de la boutique</div>
                    <div className="text-body-sm text-on-surface-variant">Masque instantanément vos {rep?.activeListings ?? 0} annonce{(rep?.activeListings ?? 0) > 1 ? 's' : ''} des résultats de recherche sans perdre vos favoris ni vos avis.</div>
                  </div>
                  <Toggle label="Mode vacances" on={me.vacationMode} onChange={v => void setVacation(v)} />
                  {vacationSaving && <Icon name="progress_activity" size={18} className="animate-spin text-on-surface-variant" />}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3">
                  <Icon name={dark ? 'dark_mode' : 'light_mode'} size={22} className="text-on-surface-variant" />
                  <div className="min-w-0 flex-1"><div className="text-label-md text-on-surface">Apparence</div><div className="text-body-sm text-on-surface-variant">{dark ? 'Mode sombre activé' : 'Mode clair activé'}</div></div>
                  <Toggle label="Mode sombre" on={dark} onChange={onToggleDark} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary-fixed/30 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-label-md text-primary">Supprimer définitivement la boutique</div>
                    <div className="text-body-sm text-on-surface-variant">Vos annonces sont retirées, vos données personnelles effacées et toutes vos sessions fermées.</div>
                  </div>
                  <button onClick={() => setDeleteOpen(true)} className="cursor-pointer rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white">Supprimer mon compte</button>
                </div>
              </Card>
            </div>

            {/* Aside */}
            <aside className="flex flex-col gap-4">
              <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <div className="flex items-center justify-between text-label-sm uppercase text-on-surface-variant">Aperçu badge acheteur <span className="h-2 w-2 rounded-full bg-tertiary" /></div>
                <div className="mt-3 rounded-xl bg-surface-container-low p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">{form.avatarUrl ? <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" /> : form.fullName.charAt(0)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 truncate text-label-md text-on-surface">{form.fullName}{me.isVerified && <Icon name="check_circle" size={14} className="text-tertiary" />}</div>
                      <div className="text-body-sm text-on-surface-variant">{form.city || '—'}</div>
                    </div>
                  </div>
                  {me.isVerified && <div className="mt-2 flex items-center gap-1 rounded-lg bg-surface-lowest px-2 py-1 text-label-sm text-tertiary"><Icon name="verified" size={14} /> Identité certifiée Dilchap</div>}
                  {form.bio && <p className="m-0 mt-2 line-clamp-3 text-body-sm italic text-on-surface-variant">« {form.bio} »</p>}
                </div>
                <dl className="m-0 mt-3 flex flex-col gap-2 text-body-sm">
                  <div className="flex justify-between"><dt className="text-on-surface-variant">Score de confiance :</dt><dd className="m-0 font-bold text-tertiary">{rep?.trustScore ?? '—'} / 100</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">Délai moyen de réponse :</dt><dd className="m-0 font-semibold text-on-surface">{rep?.responseTimeMinutes != null ? `${rep.responseTimeMinutes} minutes` : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">Validation identité :</dt><dd className="m-0 font-semibold text-on-surface">{me.verifiedAt ? new Date(me.verifiedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non vérifiée'}</dd></div>
                </dl>
              </div>
              <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <div className="flex items-center gap-2 text-label-lg text-primary"><Icon name="lightbulb" size={20} /> Règles d'or Dilchap</div>
                <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface-variant">
                  {['Fixez toujours les remises dans des centres commerciaux très éclairés (Playce, Cap Sud, Sococé).', 'Encouragez Wave ou Orange Money instantanés sur place après examen de l’objet par l’acheteur.', 'Ne livrez jamais sans acompte dans des lieux isolés.'].map(r => (
                    <li key={r} className="flex gap-1.5"><Icon name="check" size={16} className="shrink-0 text-tertiary" /> {r}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                <div className="text-label-md text-on-surface">Réactivité Vendeur (7 derniers jours)</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-headline-lg font-extrabold text-on-surface">{rep?.reactivity != null ? `${Math.round(rep.reactivity)}%` : '—'}</span>
                  {reactivityDelta != null && <span className={`text-label-sm ${reactivityDelta >= 0 ? 'text-tertiary' : 'text-primary'}`}>{reactivityDelta >= 0 ? '+' : ''}{Math.round(reactivityDelta)}% vs semaine passée</span>}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-tertiary" style={{ width: `${rep?.reactivity ?? 0}%` }} /></div>
                <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Part des discussions ouvertes par des acheteurs auxquelles vous avez répondu. Les vendeurs réactifs vendent nettement plus vite.</p>
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
            <span className="flex-1 text-label-md">Modifications non enregistrées</span>
            <button onClick={() => setForm(initial)} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-white/80">Annuler</button>
            <button onClick={() => void save()} disabled={saving} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary px-3 py-1.5 text-label-md text-white"><Icon name="check" size={16} /> Sauvegarder</button>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setDeleteOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-surface-lowest p-5 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="m-0 flex items-center gap-2 text-headline-sm text-primary"><Icon name="warning" size={22} /> Supprimer mon compte</h3>
            <p className="m-0 mt-2 text-body-md text-on-surface-variant">Cette action est irréversible. Confirmez avec votre mot de passe.</p>
            <input type="password" value={deletePw} onChange={e => setDeletePw(e.target.value)} placeholder="Mot de passe" className={`${field} mt-3`} />
            {deleteError && <p className="m-0 mt-1 text-body-sm text-primary">{deleteError.message}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high py-2.5 text-label-md text-on-surface">Annuler</button>
              <button disabled={!deletePw || deleting} onClick={() => void deleteAccount({ variables: { password: deletePw } }).then(() => onLogout())} className="flex-1 cursor-pointer rounded-xl border-none bg-primary py-2.5 text-label-md text-white disabled:opacity-50">Supprimer définitivement</button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  )
}
