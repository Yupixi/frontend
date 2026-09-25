import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../components/Icon'
import Logo from '../components/DilchapLogo'
import { LOGIN_MUTATION, REGISTER_MUTATION, type AuthPayload } from '../graphql/auth'
import { FOOTER_SETTINGS_QUERY } from '../graphql/content'
import { storeTokens } from '../lib/auth'

type AuthProps = {
  onNavigate: (page: any) => void
  onLogin: () => void
}

const COMMUNES = ['Cocody', 'Marcory', 'Plateau', 'Yopougon', 'Koumassi', 'Treichville', 'Adjamé', 'Abobo', 'Port-Bouët', 'Bingerville', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo']
const PERKS = [
  { icon: 'percent', title: '0 Franc de commission cachée', text: 'Le prix affiché est celui que vous payez au vendeur. Aucun frais de dossier.' },
  { icon: 'handshake', title: 'Vérification directe avant achat', text: "Testez le smartphone, essayez l'article ou examinez le produit avant de régler." },
  { icon: 'shield', title: 'Points relais & lieux publics', text: 'Rendez-vous dans des lieux éclairés et validation par code de remise.' },
]
const field = 'w-full rounded-xl border border-transparent bg-surface-container-low px-3 py-3 text-body-md text-on-surface outline-none focus:border-primary'

// Maps API errors to readable French (the backend already answers in French
// for credentials / duplicates; class-validator messages are English).
function readable(message?: string) {
  if (!message) return null
  if (/phone/i.test(message)) return 'Numéro de téléphone invalide (ex : 07 00 00 00 00).'
  if (/password.*(longer|8)/i.test(message)) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (/email must be/i.test(message)) return 'Adresse e-mail invalide.'
  return message
}

// "+225" prefix for local numbers, as stored by the rest of the app.
const toIntl = (raw: string) => {
  const d = raw.replace(/\D/g, '')
  if (!d) return undefined
  return d.startsWith('225') ? `+${d}` : `+225${d}`
}

function PhoneOrEmail({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isEmail = /[a-z@]/i.test(value)
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-container-low pr-3 focus-within:ring-1 focus-within:ring-primary">
      {!isEmail && <span className="ml-1 flex items-center gap-1 rounded-lg bg-surface-lowest px-2 py-2 text-label-md text-on-surface"><span aria-hidden className="flex h-3 w-4 overflow-hidden rounded-sm"><span className="flex-1 bg-orange-500" /><span className="flex-1 bg-white" /><span className="flex-1 bg-green-600" /></span>+225</span>}
      <input value={value} onChange={e => onChange(e.target.value)} autoComplete="username" placeholder="07 00 00 00 00 ou nom@exemple.ci" className="w-full border-none bg-transparent px-2 py-3 text-body-md text-on-surface outline-none" />
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder, autoComplete }: { value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 focus-within:ring-1 focus-within:ring-primary">
      <Icon name="lock" size={19} className="text-on-surface-variant" />
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="w-full border-none bg-transparent py-3 text-body-md text-on-surface outline-none" />
      <button type="button" onClick={() => setShow(s => !s)} className="flex cursor-pointer border-none bg-transparent p-0 text-on-surface-variant" aria-label={show ? 'Masquer' : 'Afficher'}><Icon name={show ? 'visibility_off' : 'visibility'} size={20} /></button>
    </div>
  )
}

function LoginForm({ onSuccess, onForgot }: { onSuccess: (p: AuthPayload) => void; onForgot: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [login, { loading, error }] = useMutation<{ login: AuthPayload }>(LOGIN_MUTATION)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    void login({ variables: { input: { email: identifier.trim(), password } } }).then(r => r.data && onSuccess(r.data.login)).catch(() => undefined)
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="text-label-md text-on-surface">Téléphone ou e-mail
        <span className="mt-1.5 block"><PhoneOrEmail value={identifier} onChange={setIdentifier} /></span>
      </label>
      <div>
        <div className="flex items-center justify-between text-label-md text-on-surface">Mot de passe
          <button type="button" onClick={onForgot} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">Mot de passe oublié ?</button>
        </div>
        <div className="mt-1.5"><PasswordInput value={password} onChange={setPassword} placeholder="Votre mot de passe" autoComplete="current-password" /></div>
      </div>
      {error && <p className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{readable(error.message)}</p>}
      <button type="submit" disabled={loading || !identifier.trim() || !password} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-label-lg text-white shadow-float hover:bg-primary-dark disabled:opacity-60">
        {loading ? 'Connexion…' : <>Se connecter à Dilchap <Icon name="arrow_forward" size={19} /></>}
      </button>
    </form>
  )
}

function RegisterForm({ onSuccess }: { onSuccess: (p: AuthPayload) => void }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', city: '', password: '' })
  const [accepted, setAccepted] = useState(false)
  const [register, { loading, error }] = useMutation<{ register: AuthPayload }>(REGISTER_MUTATION)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    void register({
      variables: { input: { fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), phone: toIntl(form.phone), city: form.city || undefined, password: form.password } },
    }).then(r => r.data && onSuccess(r.data.register)).catch(() => undefined)
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <label className="text-label-md text-on-surface">Nom complet ou nom de boutique<input value={form.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Ex : Aya Koné" className={`${field} mt-1.5`} /></label>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5 sm:grid-cols-2">
        <label className="text-label-md text-on-surface">E-mail<input type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="nom@exemple.ci" className={`${field} mt-1.5`} /></label>
        <label className="text-label-md text-on-surface">Téléphone WhatsApp
          <span className="mt-1.5 flex items-center gap-2 rounded-xl bg-surface-container-low pl-3 focus-within:ring-1 focus-within:ring-primary"><span className="text-label-md text-on-surface-variant">+225</span><input value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel-national" placeholder="07 00 00 00 00" className="w-full border-none bg-transparent px-2 py-3 text-body-md text-on-surface outline-none" /></span>
        </label>
      </div>
      <label className="text-label-md text-on-surface">Ville / commune
        <select value={form.city} onChange={set('city')} className={`${field} mt-1.5 cursor-pointer`}>
          <option value="">Choisir…</option>
          {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="text-label-md text-on-surface">Mot de passe
        <span className="mt-1.5 block"><PasswordInput value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="8 caractères minimum" autoComplete="new-password" /></span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-body-sm text-on-surface-variant">
        <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#BB0013]" />
        J'accepte les conditions d'utilisation et la charte de confiance Dilchap.
      </label>
      {error && <p className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{readable(error.message)}</p>}
      <button type="submit" disabled={loading || !accepted || form.fullName.trim().length < 2 || !form.email || form.password.length < 8} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-label-lg text-white shadow-float hover:bg-primary-dark disabled:opacity-60">
        {loading ? 'Création…' : <>Créer mon compte <Icon name="arrow_forward" size={19} /></>}
      </button>
    </form>
  )
}

// No self-service reset exists yet (no e-mail/SMS sender): the honest path
// is Dilchap support, reachable on WhatsApp.
function ForgotPassword({ onBack }: { onBack: () => void }) {
  const { data } = useQuery<{ footerSettings: { supportPhone: string | null } | null }>(FOOTER_SETTINGS_QUERY)
  const phone = data?.footerSettings?.supportPhone
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant"><Icon name="arrow_back" size={18} /> Retour à la connexion</button>
      <div className="rounded-2xl bg-surface-container-low p-5 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="lock_reset" size={24} /></span>
        <h2 className="m-0 mt-3 text-headline-sm text-on-surface">Mot de passe oublié</h2>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">Pour protéger votre compte, la réinitialisation se fait avec le support Dilchap : écrivez-nous depuis le numéro ou l'e-mail de votre compte.</p>
        {phone ? (
          <a href={`https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent('Bonjour, je souhaite réinitialiser le mot de passe de mon compte Dilchap.')}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-tertiary px-5 py-3 text-label-md text-white no-underline">
            <Icon name="chat" size={19} /> Contacter le support ({phone})
          </a>
        ) : <p className="m-0 mt-3 text-body-sm text-on-surface-variant">Le contact du support n'est pas encore configuré.</p>}
      </div>
    </div>
  )
}

// "Connexion & Inscription" (Stitch desktop split card / mobile stack).
export default function Auth({ onNavigate, onLogin }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const success = (payload: AuthPayload) => {
    storeTokens(payload.accessToken, payload.refreshToken)
    onLogin()
    onNavigate('home')
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 md:px-8 md:py-12">
      <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-3xl bg-surface-lowest shadow-card-hover lg:grid-cols-2">
        <section className="flex flex-col p-6 md:p-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Logo size="md" /><span className="hidden items-center gap-1 rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary sm:flex"><Icon name="verified" size={14} /> Côte d'Ivoire</span></div>
            <button onClick={() => onNavigate('search')} className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-label-md text-on-surface"><Icon name="storefront" size={18} /> Explorer le catalogue</button>
          </div>
          <p className="m-0 mt-4 text-center text-body-md text-on-surface-variant lg:hidden">Achetez, vendez et négociez en toute sécurité.</p>

          {mode !== 'forgot' && (
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-surface-container-low p-1">
              {([['login', 'login', 'Se connecter'], ['register', 'person_add', 'Créer un compte']] as const).map(([key, icon, label]) => (
                <button key={key} onClick={() => setMode(key)} className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none py-2.5 text-label-lg ${mode === key ? 'bg-surface-lowest text-primary shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>
                  <Icon name={icon} size={19} /> {label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6">
            {mode === 'login' && <LoginForm onSuccess={success} onForgot={() => setMode('forgot')} />}
            {mode === 'register' && <RegisterForm onSuccess={success} />}
            {mode === 'forgot' && <ForgotPassword onBack={() => setMode('login')} />}
          </div>

          {/* Mobile trust strip */}
          <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-surface-container-low p-3 text-center lg:hidden">
            {[['percent', '0% Commission', 'Vendez sans frais', 'bg-tertiary-soft text-tertiary'], ['handshake', 'Remise directe', 'Lieux publics', 'bg-primary-fixed text-primary'], ['shield', 'Anti-arnaque', 'Code de remise', 'bg-tertiary-soft text-tertiary']].map(([icon, t, s, cls]) => (
              <div key={t}><span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${cls}`}><Icon name={icon} size={18} /></span><div className="mt-1 text-label-sm text-on-surface">{t}</div><div className="text-label-sm text-on-surface-variant">{s}</div></div>
            ))}
          </div>

          <div className="flex-1" />
          <p className="m-0 mt-8 text-center text-label-sm text-on-surface-variant lg:text-left">Plateforme sécurisée • En continuant, vous acceptez les conditions d'utilisation et la charte de confiance Dilchap.</p>
        </section>

        <aside className="relative hidden overflow-hidden bg-surface-container-low p-10 lg:block">
          <span className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-fixed/50" aria-hidden />
          <span className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-tertiary-soft" aria-hidden />
          <div className="relative">
            <h2 className="m-0 text-headline-lg text-on-surface">Achetez et vendez en toute clarté.</h2>
            <p className="m-0 mt-3 text-body-lg text-on-surface-variant">Fini les arnaques de livraison et les faux profils. Dilchap réinvente les petites annonces avec des rencontres physiques sûres et des paiements directs sans intermédiaire.</p>
            <div className="mt-6 flex flex-col gap-3">
              {PERKS.map(p => (
                <div key={p.title} className="flex gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary text-white"><Icon name={p.icon} size={20} /></span>
                  <div><div className="text-label-lg text-on-surface">{p.title}</div><div className="text-body-sm text-on-surface-variant">{p.text}</div></div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-label-sm uppercase text-on-surface-variant">Paiement direct de main à main compatible :</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[['bg-sky-400', 'Wave CI'], ['bg-orange-500', 'Orange Money'], ['bg-yellow-400', 'MTN MoMo']].map(([dot, label]) => (
                <span key={label} className="flex items-center gap-1.5 rounded-lg bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface"><span className={`h-2 w-2 rounded-full ${dot}`} /> {label}</span>
              ))}
              <span className="flex items-center gap-1.5 rounded-lg bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface"><Icon name="payments" size={16} /> Espèces</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
