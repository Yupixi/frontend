import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../components/Icon'
import Logo from '../components/DilchapLogo'
import { LOGIN_MUTATION, PHONE_AUTH_OPTIONS_QUERY, REGISTER_MUTATION, REQUEST_PASSWORD_RESET_CODE_MUTATION, REQUEST_PASSWORD_RESET_MUTATION, REQUEST_SIGNUP_CODE_MUTATION, RESET_PASSWORD_WITH_CODE_MUTATION, type AuthPayload, type PhoneAuthOptions, type PhoneCodeSent } from '../graphql/auth'
import { REQUEST_RECOVERY_MUTATION } from '../graphql/support'
import { getGuestSecret, storeAccessToken } from '../lib/auth'
import Select from '../components/Select'
import { AUTH_REASONS, takeAuthReason } from '../lib/authReason'
import PaymentLogo, { paymentLabel } from '../components/PaymentLogo'
import { useNoCommissionClaims, useSupportPhone } from '../lib/site'
import { placeOptions, useLists } from '../lib/lists'
import { countryOfIntl, localNumberError, toIntl } from '../lib/dialing'
import { useCooldown } from '../lib/useCooldown'
import { useCountries, useHomeCountry, useMarket, useMethods, type Country } from '../lib/countries'
import Flag from '../components/Flag'
import ManageCookies from '../components/ManageCookies'
import { track } from '../lib/analytics'

type AuthProps = {
  onNavigate: (page: any) => void
  onLogin: () => void
  onClose: () => void
}

const PERKS = [
  { icon: 'percent', title: '0 Franc de commission cachée', text: 'Le prix affiché est celui que vous payez au vendeur. Aucun frais de dossier.' },
  { icon: 'handshake', title: 'Vérification directe avant achat', text: "Testez le smartphone, essayez l'article ou examinez le produit avant de régler." },
  { icon: 'shield', title: 'Points relais & lieux publics', text: 'Rendez-vous dans des lieux éclairés et validation par code de remise.' },
]
const REASONS = AUTH_REASONS

const field = 'w-full rounded-xl border border-transparent bg-surface-container-low px-3 py-3 text-body-md text-on-surface outline-none focus:border-primary'

// Maps API errors to readable French (the backend already answers in French
// for credentials / duplicates; class-validator messages are English).
function readable(message?: string) {
  if (!message) return null
  if (/phone/i.test(message)) return 'Numéro de téléphone invalide.'
  if (/password.*(longer|8)/i.test(message)) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (/email must be/i.test(message)) return 'Adresse e-mail invalide.'
  return message
}

// Flag and dial code of the country a local number belongs to.
const DialPrefix = ({ country, className = '' }: { country: Country; className?: string }) => (
  <span className={`flex shrink-0 items-center gap-1 text-label-md ${className}`}><Flag code={country.code} />+{country.dialCode}</span>
)

function PhoneOrEmail({ value, onChange, country }: { value: string; onChange: (v: string) => void; country: Country }) {
  const isEmail = /[a-z@]/i.test(value)
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-container-low pr-3 focus-within:ring-1 focus-within:ring-primary">
      {!isEmail && <DialPrefix country={country} className="ml-1 rounded-lg bg-surface-lowest px-2 py-2 text-on-surface" />}
      <input value={value} onChange={e => onChange(e.target.value)} autoComplete="username" placeholder={isEmail ? 'nom@exemple.com' : country.phoneExample} className="w-full border-none bg-transparent px-2 py-3 text-body-md text-on-surface outline-none" />
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
  // A number typed without its country code is the visitor's market's.
  const home = useHomeCountry()
  const country = useMarket() ?? home
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = identifier.trim()
    const phone = /[a-z@]/i.test(id) ? undefined : toIntl(id, country)
    void login({ variables: { input: { email: phone ?? id, password, countryCode: country.code } } }).then(r => {
      if (!r.data) return
      // « Mesure d'audience »: how, never who.
      track('login', { method: phone ? 'phone' : 'email', country: country.code })
      onSuccess(r.data.login)
    }).catch(() => undefined)
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="text-label-md text-on-surface">
        <span className="flex items-center justify-between gap-2">Numéro mobile ou e-mail <span className="text-label-sm text-tertiary">{country.name}</span></span>
        <span className="mt-1.5 block"><PhoneOrEmail value={identifier} onChange={setIdentifier} country={country} /></span>
      </label>
      <div>
        <div className="flex items-center justify-between text-label-md text-on-surface">Mot de passe
          <button type="button" onClick={onForgot} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">Mot de passe oublié ?</button>
        </div>
        <div className="mt-1.5"><PasswordInput value={password} onChange={setPassword} placeholder="Votre mot de passe" autoComplete="current-password" /></div>
      </div>
      {error && <p className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{readable(error.message)}</p>}
      <button type="submit" disabled={loading || !identifier.trim() || !password} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-label-lg text-white hover:bg-primary-dark disabled:opacity-60">
        {loading ? 'Connexion…' : <>Continuer <Icon name="arrow_forward" size={19} /></>}
      </button>
    </form>
  )
}

// Code field of an SMS code (6 digits, filled by the phone's keyboard
// suggestion), with the resend countdown.
function SmsCodeField({ value, onChange, sentTo, wait, resending, onResend, maybe = false }: { value: string; onChange: (v: string) => void; sentTo: string; wait: number; resending: boolean; onResend: () => void; maybe?: boolean }) {
  const to = <b className="font-semibold">…{sentTo.replace(/^…/, '')}</b>
  return (
    <div className="rounded-xl bg-tertiary-soft/60 p-3">
      <p className="m-0 flex items-start gap-2 text-body-sm text-on-surface"><Icon name="sms" size={18} className="mt-0.5 shrink-0 text-tertiary" /><span className="min-w-0">{maybe ? <>Si ce numéro est vérifié sur un compte Dilchap, un code arrive par SMS au {to}. Il expire dans 5 minutes.</> : <>Code envoyé par SMS au {to}. Il expire dans 5 minutes.</>}</span></p>
      <label className="mt-2 block text-label-md text-on-surface">Code reçu par SMS
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <input value={value} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="000000" aria-label="Code à 6 chiffres reçu par SMS"
            className="h-12 w-36 rounded-xl border border-solid border-outline-variant bg-surface-lowest px-3 text-center font-mono text-body-lg tracking-[0.3em] text-on-surface outline-none focus:border-primary" />
          <button type="button" disabled={resending || wait > 0} onClick={onResend} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary disabled:cursor-default disabled:text-on-surface-variant">
            {resending ? 'Envoi…' : wait > 0 ? `Renvoyer le code (${wait} s)` : 'Renvoyer le code'}
          </button>
        </span>
      </label>
    </div>
  )
}

function RegisterForm({ onSuccess, onLogin }: { onSuccess: (p: AuthPayload) => void; onLogin: () => void }) {
  const countries = useCountries()
  const home = useHomeCountry()
  const market = useMarket() ?? home
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', city: '', password: '', countryCode: market.code })
  const country = countries.find(c => c.code === form.countryCode) ?? market
  const lists = useLists(country.code)
  const phoneError = form.phone ? localNumberError(form.phone, country) : null
  const [accepted, setAccepted] = useState(false)
  const [register, { loading, error }] = useMutation<{ register: AuthPayload }>(REGISTER_MUTATION)
  // « Inscription par téléphone » (BO › Règles), SMS first: the number and
  // its SMS code come first and are required, the e-mail last and optional;
  // the account is confirmed by its number at once. Not offered in the
  // country (setting off, SMS down): the e-mail sign-up as before.
  const { data: options, refetch: refetchOptions } = useQuery<{ phoneAuthOptions: PhoneAuthOptions }>(PHONE_AUTH_OPTIONS_QUERY, { variables: { countryCode: country.code } })
  const byPhone = !!options?.phoneAuthOptions.signup
  const [requestCode, { loading: sending }] = useMutation<{ requestSignupCode: PhoneCodeSent }>(REQUEST_SIGNUP_CODE_MUTATION)
  const [sent, setSent] = useState<{ phone: string; hint: string } | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const wait = useCooldown(resendAt)
  const intl = toIntl(form.phone, country)
  // A code is for one number: another number (or country) asks for a new one.
  const codeFor = sent && sent.phone === intl ? sent : null
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const sendCode = () => {
    if (!intl || phoneError) return
    setCodeError('')
    void requestCode({ variables: { phone: intl, countryCode: country.code } }).then(r => {
      const d = r.data?.requestSignupCode
      if (!d) return
      setSent({ phone: intl, hint: d.phoneHint })
      setCode('')
      setResendAt(Date.now() + d.resendAfterSeconds * 1000)
    }).catch((e: Error) => setCodeError(e.message))
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (byPhone && !codeFor) { sendCode(); return }
    setCodeError('')
    const email = form.email.trim().toLowerCase()
    void register({
      variables: { input: { fullName: form.fullName.trim(), email: email || undefined, phone: intl, phoneCode: byPhone && codeFor && code.length === 6 ? code : undefined, city: form.city || undefined, password: form.password, countryCode: country.code, guestSecret: getGuestSecret() ?? undefined } },
    }).then(r => {
      if (!r.data) return
      track('sign_up', { method: byPhone ? 'phone' : 'email', country: country.code })
      onSuccess(r.data.register)
    }).catch(() => {
      // The setting may have changed since the page opened.
      void refetchOptions()
    })
  }
  const basics = accepted && !phoneError && form.fullName.trim().length >= 2 && form.password.length >= 8
  const emailOk = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  const ready = byPhone
    ? basics && emailOk && !!codeFor && code.length === 6
    : basics && !!form.email
  const message = codeError || readable(error?.message)
  const taken = /déjà un compte|déjà associé/i.test(message ?? '')

  const nameField = <label className="text-label-md text-on-surface">Nom complet ou nom de boutique<input value={form.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Ex : Aya Koné" className={`${field} mt-1.5`} /></label>
  const countryField = (
    <label className="text-label-md text-on-surface">Pays
      {/* Another country, other towns: the chosen city no longer applies. */}
      <Select value={country.code} onChange={e => setForm(f => ({ ...f, countryCode: e.target.value, city: '' }))} className={`${field} mt-1.5 cursor-pointer`}>
        {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
      </Select>
    </label>
  )
  const cityField = (
    <label className="text-label-md text-on-surface">Ville / commune
      <Select value={form.city} onChange={set('city')} className={`${field} mt-1.5 cursor-pointer`}>
        <option value="">Choisir…</option>
        {placeOptions(lists).map(c => <option key={c} value={c}>{c}</option>)}
      </Select>
    </label>
  )
  const phoneInput = <span className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low pl-3 focus-within:ring-1 focus-within:ring-primary"><DialPrefix country={country} className="text-on-surface-variant" /><input value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel-national" placeholder={country.phoneExample} aria-invalid={!!phoneError} aria-label="Téléphone" required={byPhone} className="w-full min-w-0 border-none bg-transparent px-2 py-3 text-body-md text-on-surface outline-none" /></span>
  const passwordField = (
    <label className="text-label-md text-on-surface">Mot de passe
      <span className="mt-1.5 block"><PasswordInput value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="8 caractères minimum" autoComplete="new-password" /></span>
    </label>
  )
  const consent = (
    <label className="flex cursor-pointer items-start gap-2 text-body-sm text-on-surface-variant">
      <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
      <span>J'accepte les <a href="/legal/cgu" target="_blank" rel="noreferrer" className="text-primary">conditions d'utilisation</a>, la <a href="/legal/remise-en-main-propre" target="_blank" rel="noreferrer" className="text-primary">charte de confiance</a> Dilchap et sa <a href="/legal/confidentialite" target="_blank" rel="noreferrer" className="text-primary">politique de confidentialité</a>.</span>
    </label>
  )
  const alert = message && (
    <p role="alert" className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{message}
      {taken && <button type="button" onClick={onLogin} className="ml-1 cursor-pointer border-none bg-transparent p-0 text-label-md text-primary underline underline-offset-2">Se connecter</button>}
    </p>
  )
  const createBtn = (
    <button type="submit" disabled={loading || sending || !ready} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-label-lg text-white hover:bg-primary-dark disabled:opacity-60">
      {loading ? 'Création…' : <>Créer mon compte <Icon name="arrow_forward" size={19} /></>}
    </button>
  )

  if (byPhone)
    return (
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        {/* 1. Who and where. */}
        {nameField}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5 sm:grid-cols-2">{countryField}{cityField}</div>
        {/* 2. The number and its code. */}
        <div className="text-label-md text-on-surface">
          <span className="flex items-center gap-1.5">Téléphone <span className="text-body-sm font-normal text-on-surface-variant">(il confirme votre compte)</span></span>
          <div className="mt-1.5 flex flex-wrap items-stretch gap-2">
            {phoneInput}
            {!codeFor && (
              <button type="button" onClick={sendCode} disabled={sending || !intl || !!phoneError} className="flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white hover:bg-primary-dark disabled:opacity-60 max-sm:w-full">
                <Icon name="sms" size={18} /> {sending ? 'Envoi…' : 'Recevoir le code'}
              </button>
            )}
          </div>
          {phoneError && <span className="mt-1 block text-body-sm font-normal text-primary">{phoneError}</span>}
          {!codeFor && !phoneError && <span className="mt-1 block text-body-sm font-normal text-on-surface-variant">Un code à 6 chiffres vous est envoyé par SMS pour vérifier ce numéro.</span>}
        </div>
        {/* 3. The 6-digit code. */}
        {codeFor && <SmsCodeField value={code} onChange={setCode} sentTo={codeFor.hint} wait={wait} resending={sending} onResend={sendCode} />}
        {/* 4. Password. */}
        {passwordField}
        {/* 5. E-mail last, optional. */}
        <label className="text-label-md text-on-surface">E-mail <span className="text-body-sm font-normal text-on-surface-variant">(facultatif)</span><input type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="nom@exemple.com" className={`${field} mt-1.5`} /></label>
        {consent}
        {alert}
        {createBtn}
        {!codeFor && <p className="m-0 text-center text-body-sm text-on-surface-variant">Commencez par recevoir le code par SMS : il est demandé pour créer le compte.</p>}
      </form>
    )

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      {nameField}
      {countryField}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5 sm:grid-cols-2">
        <label className="text-label-md text-on-surface">E-mail<input type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="nom@exemple.com" className={`${field} mt-1.5`} /></label>
        <label className="text-label-md text-on-surface">Téléphone WhatsApp
          <span className="mt-1.5 flex">{phoneInput}</span>
          {phoneError && <span className="mt-1 block text-body-sm text-primary">{phoneError}</span>}
        </label>
      </div>
      {cityField}
      {passwordField}
      {consent}
      {alert}
      {createBtn}
    </form>
  )
}

const softField = 'h-12 rounded-xl border-none bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary'

// "Mot de passe oublié": a reset link e-mailed to the account's address,
// or (when SMS is set up) a code sent by SMS to the account's verified
// number — the same answer whether or not either belongs to a member. No
// access to either: the request reaches the support queue instead
// (SupportRecovery).
function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [support, setSupport] = useState(false)
  const home = useHomeCountry()
  const country = useMarket() ?? home
  const { data: options } = useQuery<{ phoneAuthOptions: PhoneAuthOptions }>(PHONE_AUTH_OPTIONS_QUERY, { variables: { countryCode: country.code } })
  const smsReset = !!options?.phoneAuthOptions.passwordReset
  const [by, setBy] = useState<'email' | 'sms'>('email')
  const method = smsReset ? by : 'email'
  if (support) return <SupportRecovery onBack={() => setSupport(false)} />
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant"><Icon name="arrow_back" size={18} /> Retour à la connexion</button>
      <div className="rounded-2xl bg-surface-container-low p-5">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="lock_reset" size={24} /></span>
          <h2 className="m-0 mt-3 text-headline-sm text-on-surface">Mot de passe oublié</h2>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">{method === 'email' ? 'Indiquez l’adresse e-mail de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.' : 'Indiquez le numéro de votre compte : nous vous envoyons un code par SMS pour choisir un nouveau mot de passe.'}</p>
        </div>
        {smsReset && (
          <div role="tablist" aria-label="Recevoir" className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-lowest p-1">
            {([['email', 'mail', 'Par e-mail'], ['sms', 'sms', 'Par SMS']] as const).map(([k, icon, label]) => (
              <button key={k} type="button" role="tab" aria-selected={method === k} onClick={() => setBy(k)} className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none py-2 text-label-md ${method === k ? 'bg-primary text-white' : 'bg-transparent text-on-surface-variant'}`}><Icon name={icon} size={17} /> {label}</button>
            ))}
          </div>
        )}
        {method === 'email' ? <ResetByEmail /> : <ResetBySms onDone={onBack} />}
        <button onClick={() => setSupport(true)} className="mx-auto mt-4 flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-center text-label-md text-primary"><Icon name="support_agent" size={18} className="shrink-0" /> {method === 'email' ? 'Plus accès à cet e-mail ? Contacter l’équipe' : 'Plus accès à ce numéro ? Contacter l’équipe'}</button>
      </div>
    </div>
  )
}

function ResetByEmail() {
  const [email, setEmail] = useState('')
  const [send, { data, loading, error }] = useMutation<{ requestPasswordReset: boolean }>(REQUEST_PASSWORD_RESET_MUTATION)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  return data?.requestPasswordReset ? (
    <p role="status" className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><Icon name="forward_to_inbox" size={18} className="mt-0.5 shrink-0" /> <span className="min-w-0 break-words">Si un compte Dilchap utilise <b className="font-semibold">{email.trim()}</b>, un e-mail vient de partir. Le lien est valable 1 heure ; pensez à regarder dans les spams.</span></p>
  ) : (
    <form onSubmit={e => { e.preventDefault(); void send({ variables: { email: email.trim().toLowerCase() } }).catch(() => undefined) }} className="mt-4 flex flex-col gap-3">
      <input type="email" value={email} onChange={e => setEmail(e.target.value.slice(0, 120))} placeholder="nom@exemple.com" autoComplete="email" aria-label="Adresse e-mail du compte" className={softField} />
      {error && <p className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{error.message}</p>}
      <button type="submit" disabled={!valid || loading} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-60"><Icon name="mail" size={19} /> {loading ? 'Envoi…' : 'Recevoir le lien'}</button>
    </form>
  )
}

// Number, then the code and the new password. The server answers the same
// whether or not the number has an account (and only texts a verified one).
function ResetBySms({ onDone }: { onDone: () => void }) {
  const home = useHomeCountry()
  const market = useMarket() ?? home
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState<{ phone: string; country: string; hint: string } | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const wait = useCooldown(resendAt)
  const [request, { loading: sending, error: sendError }] = useMutation<{ requestPasswordResetCode: PhoneCodeSent }>(REQUEST_PASSWORD_RESET_CODE_MUTATION)
  const [reset, { data: done, loading: saving, error: resetError }] = useMutation<{ resetPasswordWithCode: boolean }>(RESET_PASSWORD_WITH_CODE_MUTATION)
  const intl = toIntl(phone, market)
  // A number typed with its dial code may be of another open country.
  const countryCode = countryOfIntl(intl) ?? market.code
  const phoneError = phone ? localNumberError(phone, market) : null
  const ask = () => {
    if (!intl) return
    void request({ variables: { phone: intl, countryCode } }).then(r => {
      const d = r.data?.requestPasswordResetCode
      if (!d) return
      setSent({ phone: intl, country: countryCode, hint: d.phoneHint })
      setResendAt(Date.now() + d.resendAfterSeconds * 1000)
    }).catch(() => undefined)
  }
  if (done?.resetPasswordWithCode)
    return (
      <div className="mt-4 flex flex-col gap-3">
        <p role="status" className="m-0 flex items-start gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><Icon name="check_circle" size={18} className="mt-0.5 shrink-0" /> <span className="min-w-0">Mot de passe modifié. Tous vos appareils ont été déconnectés : connectez-vous avec votre nouveau mot de passe.</span></p>
        <button type="button" onClick={onDone} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="login" size={19} /> Se connecter</button>
      </div>
    )
  if (!sent)
    return (
      <form onSubmit={e => { e.preventDefault(); ask() }} className="mt-4 flex flex-col gap-3">
        <span className="flex h-12 items-center gap-2 rounded-xl bg-surface-lowest pl-2 focus-within:outline focus-within:outline-2 focus-within:outline-primary">
          <DialPrefix country={market} className="rounded-lg bg-surface-container-low px-2 py-1.5 text-on-surface" />
          <input value={phone} onChange={e => setPhone(e.target.value.slice(0, 30))} inputMode="tel" autoComplete="tel-national" placeholder={market.phoneExample} aria-label="Numéro de téléphone du compte" className="h-full w-full min-w-0 border-none bg-transparent px-1 text-body-md text-on-surface outline-none" />
        </span>
        {phoneError && <span className="text-body-sm text-primary">{phoneError}</span>}
        {sendError && <p className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{sendError.message}</p>}
        <button type="submit" disabled={!intl || !!phoneError || sending} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-60"><Icon name="sms" size={19} /> {sending ? 'Envoi…' : 'Recevoir le code'}</button>
      </form>
    )
  return (
    <form onSubmit={e => { e.preventDefault(); void reset({ variables: { input: { phone: sent.phone, countryCode: sent.country, code, newPassword: password } } }).catch(() => undefined) }} className="mt-4 flex flex-col gap-3">
      <SmsCodeField maybe value={code} onChange={setCode} sentTo={sent.hint} wait={wait} resending={sending} onResend={ask} />
      <label className="text-label-md text-on-surface">Nouveau mot de passe
        <span className="mt-1.5 block"><PasswordInput value={password} onChange={setPassword} placeholder="8 caractères minimum" autoComplete="new-password" /></span>
      </label>
      {(resetError || sendError) && <p role="alert" className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{(resetError ?? sendError)!.message}</p>}
      <button type="submit" disabled={code.length !== 6 || password.length < 8 || saving} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-60"><Icon name="lock_reset" size={19} /> {saving ? 'Enregistrement…' : 'Changer le mot de passe'}</button>
      <button type="button" onClick={() => { setSent(null); setCode('') }} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-on-surface-variant">Changer de numéro</button>
    </form>
  )
}

// Lost access to the mailbox (or no e-mail on the account): the request
// reaches the Dilchap support queue (matched to the account, with its badge
// priority); WhatsApp stays available as a second way.
function SupportRecovery({ onBack }: { onBack: () => void }) {
  const phone = useSupportPhone()
  // A number typed without its dial code is read in the visitor's country
  // (the server would otherwise take it as Ivorian).
  const home = useHomeCountry()
  const country = useMarket() ?? home
  const [form, setForm] = useState({ name: '', contact: '', message: '' })
  const [done, setDone] = useState<{ reference: string } | null>(null)
  const [send, { loading, error }] = useMutation<{ requestAccountRecovery: { reference: string } }>(REQUEST_RECOVERY_MUTATION)
  const isEmail = form.contact.includes('@')
  const ok = form.name.trim().length >= 2 && form.contact.trim().length >= 6 && form.message.trim().length >= 10
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    void send({ variables: { input: { name: form.name.trim(), message: form.message.trim(), ...(isEmail ? { email: form.contact.trim() } : { phone: toIntl(form.contact, country) ?? form.contact.trim() }) } } })
      .then(r => r.data && setDone(r.data.requestAccountRecovery))
  }
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant"><Icon name="arrow_back" size={18} /> Mot de passe oublié</button>
      <div className="rounded-2xl bg-surface-container-low p-5">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="support_agent" size={24} /></span>
          <h2 className="m-0 mt-3 text-headline-sm text-on-surface">Récupérer mon compte</h2>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">Pour protéger votre compte, un membre de l’équipe vérifie votre identité et vous recontacte sur l’e-mail ou le numéro de votre compte.</p>
        </div>
        {done ? (
          <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><Icon name="check_circle" size={18} className="mt-0.5 shrink-0" /> Demande {done.reference} reçue. L’équipe Dilchap vous recontacte rapidement.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.slice(0, 80) }))} placeholder="Nom et prénoms" autoComplete="name" className="h-12 rounded-xl border-none bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary" />
            <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value.slice(0, 120) }))} placeholder="E-mail ou téléphone du compte" autoComplete="username" className="h-12 rounded-xl border-none bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary" />
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value.slice(0, 2000) }))} rows={3} placeholder="Ce qui se passe (mot de passe oublié, numéro changé…)" className="resize-y rounded-xl border-none bg-surface-lowest p-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary" />
            {error && <p className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{error.message}</p>}
            <button type="submit" disabled={!ok || loading} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-60"><Icon name="send" size={19} /> {loading ? 'Envoi…' : 'Envoyer la demande'}</button>
          </form>
        )}
        {phone && (
          <a href={`https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent('Bonjour, je souhaite récupérer l’accès à mon compte Dilchap.')}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 text-label-md text-tertiary no-underline">
            <Icon name="chat" size={18} /> Ou écrire au support sur WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

// "Connexion & Inscription" (Stitch desktop split card / mobile stack).
export default function Auth({ onNavigate, onLogin, onClose }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [reason] = useState(takeAuthReason)
  const noCommission = useNoCommissionClaims()
  // Methods of the visitor's country (every one for « Tous les pays »).
  const methods = useMethods()
  const supportPhone = useSupportPhone()
  const success = (payload: AuthPayload) => {
    storeAccessToken(payload.accessToken)
    onLogin()
  }

  return (
    <div className="safe-pt mx-auto min-h-screen max-w-[1180px] px-4 pb-4 md:px-8 md:pb-12">
      <div className="h-4 md:h-12" />
      <button onClick={onClose} className="mb-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface md:mb-4" aria-label="Retour">
        <Icon name="arrow_back" size={22} />
      </button>
      <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface-lowest lg:grid-cols-2">
        <section className="flex flex-col p-6 md:p-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Logo size="md" /><span className="hidden items-center gap-1 rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary sm:flex"><Icon name="verified" size={14} /> Afrique de l’Ouest</span></div>
            <button onClick={() => onNavigate('search')} className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-label-md text-on-surface"><Icon name="storefront" size={18} /> <span className="max-[400px]:hidden">Explorer le catalogue</span><span className="min-[400px]:hidden">Catalogue</span></button>
          </div>
          <div className="mt-4 flex flex-col items-center gap-2 lg:hidden">
            <span className="flex items-center gap-1.5 rounded-full bg-tertiary-soft px-3 py-1 text-label-sm text-tertiary"><Icon name="verified" size={15} /> La marketplace de confiance</span>
            <p className="m-0 text-center text-body-md text-on-surface-variant">Achetez, vendez et négociez en toute sécurité.</p>
          </div>
          {reason && mode !== 'forgot' && (
            <p role="status" className="m-0 mt-4 flex items-center gap-2.5 rounded-xl bg-primary-fixed/60 px-3 py-2.5 text-body-sm text-on-surface">
              <Icon name={REASONS[reason].icon} size={19} className="shrink-0 text-primary" /> {REASONS[reason].text}
            </p>
          )}

          {mode !== 'forgot' && <h1 className="m-0 mt-6 text-headline-md text-on-surface">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h1>}

          <div className="mt-6">
            {mode === 'login' && <LoginForm onSuccess={success} onForgot={() => setMode('forgot')} />}
            {mode === 'register' && <RegisterForm onSuccess={success} onLogin={() => setMode('login')} />}
            {mode === 'forgot' && <ForgotPassword onBack={() => setMode('login')} />}
          </div>

          {/* Switch between logging in and signing up, under the form. */}
          {mode !== 'forgot' && (
            <div className="mt-4 flex flex-col gap-2">
              <span className="flex items-center gap-3 text-label-sm text-on-surface-variant"><span className="h-px flex-1 bg-outline-variant" />{mode === 'login' ? 'Pas encore inscrit ?' : 'Déjà inscrit ?'}<span className="h-px flex-1 bg-outline-variant" /></span>
              <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-solid border-outline-variant bg-surface-lowest py-3.5 text-label-lg text-on-surface hover:bg-surface-container-low">
                <Icon name={mode === 'login' ? 'person_add' : 'login'} size={19} /> {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </div>
          )}

          {/* Mobile trust strip */}
          <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-surface-container-low p-3 text-center lg:hidden">
            {[...(noCommission ? [['percent', '0% Commission', 'Vendez sans frais', 'bg-tertiary-soft text-tertiary']] : []), ['handshake', 'Remise directe', 'Lieux publics', 'bg-primary-fixed text-primary'], ['shield', 'Anti-arnaque', 'Code de remise', 'bg-tertiary-soft text-tertiary']].map(([icon, t, s, cls]) => (
              <div key={t}><span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${cls}`}><Icon name={icon} size={18} /></span><div className="mt-1 text-label-sm text-on-surface">{t}</div><div className="text-label-sm text-on-surface-variant">{s}</div></div>
            ))}
          </div>

          <div className="flex-1" />
          {supportPhone && (
            <p className="m-0 mt-6 flex flex-wrap items-center justify-center gap-1 text-body-sm text-on-surface-variant lg:justify-start">
              <Icon name="support_agent" size={18} /> Besoin d'aide ?
              <a href={`https://wa.me/${supportPhone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="text-label-md text-primary no-underline">Contacter le support</a>
            </p>
          )}
          <p className="m-0 mt-4 text-center text-label-sm text-on-surface-variant lg:text-left">Plateforme sécurisée • En continuant, vous acceptez les <a href="/legal/cgu" target="_blank" rel="noreferrer" className="text-primary">conditions d'utilisation</a>, la <a href="/legal/remise-en-main-propre" target="_blank" rel="noreferrer" className="text-primary">charte de confiance</a> Dilchap et sa <a href="/legal/confidentialite" target="_blank" rel="noreferrer" className="text-primary">politique de confidentialité</a>.
            <ManageCookies className="ml-1 cursor-pointer border-none bg-transparent p-0 text-label-sm text-primary underline underline-offset-2" />
          </p>
        </section>

        <aside className="relative hidden overflow-hidden bg-surface-container-low p-10 lg:block">
          <span className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-fixed/50" aria-hidden />
          <span className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-tertiary-soft" aria-hidden />
          <div className="relative">
            <h2 className="m-0 text-headline-lg text-on-surface">Achetez et vendez en toute clarté.</h2>
            <p className="m-0 mt-3 text-body-lg text-on-surface-variant">Fini les arnaques de livraison et les faux profils. Dilchap réinvente les petites annonces avec des rencontres physiques sûres et des paiements directs sans intermédiaire.</p>
            <div className="mt-6 flex flex-col gap-3">
              {PERKS.filter(p => noCommission || p.icon !== 'percent').map(p => (
                <div key={p.title} className="flex gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary text-white"><Icon name={p.icon} size={20} /></span>
                  <div><div className="text-label-lg text-on-surface">{p.title}</div><div className="text-body-sm text-on-surface-variant">{p.text}</div></div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-label-sm uppercase text-on-surface-variant">Paiement direct de main à main compatible :</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {methods.filter(code => code !== 'CASH').map(code => (
                <span key={code} className="flex items-center gap-1.5 rounded-lg bg-surface-lowest py-1 pl-1 pr-3 text-label-md text-on-surface"><PaymentLogo method={code} size={24} /> {paymentLabel(code)}</span>
              ))}
              <span className="flex items-center gap-1.5 rounded-lg bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface"><Icon name="payments" size={16} /> Espèces</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
