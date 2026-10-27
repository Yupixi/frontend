import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../components/Icon'
import Logo from '../components/DilchapLogo'
import { FACEBOOK_LOGIN_MUTATION, GOOGLE_LOGIN_MUTATION, LOGIN_MUTATION, LOGIN_WITH_CODE_MUTATION, PHONE_AUTH_OPTIONS_QUERY, REGISTER_MUTATION, REQUEST_LOGIN_CODE_MUTATION, REQUEST_PASSWORD_RESET_CODE_MUTATION, REQUEST_PASSWORD_RESET_MUTATION, REQUEST_SIGNUP_CODE_MUTATION, RESET_PASSWORD_WITH_CODE_MUTATION, SET_PASSWORD_MUTATION, SOCIAL_LOGIN_CONFIG_QUERY, authReasonOf, type AuthPayload, type CodeChannel, type PhoneAuthOptions, type PhoneCodeSent, type SocialLoginConfig } from '../graphql/auth'
import CodeHelp, { useCodeDelivery } from '../components/CodeHelp'
import { UPDATE_PROFILE_MUTATION } from '../graphql/account'
import { funnel } from '../lib/authFunnel'
import { facebookRedirectUri, inAppBrowser, loadGoogle, startFacebook, takeFacebookReturn } from '../lib/social'
import { usePageTitle } from '../lib/site'
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
import { metaTrack } from '../lib/metaPixel'
import { getLocale, useT } from '../i18n'
import auth from '../i18n/ns/auth'
import common from '../i18n/ns/common'

type AuthProps = {
  onNavigate: (page: any) => void
  onLogin: () => void
  onClose: () => void
}

const perks = () => [
  { icon: 'percent', title: auth.t('perk.percent.title'), text: auth.t('perk.percent.text') },
  { icon: 'handshake', title: auth.t('perk.handshake.title'), text: auth.t('perk.handshake.text') },
  { icon: 'shield', title: auth.t('perk.shield.title'), text: auth.t('perk.shield.text') },
]
const REASONS = AUTH_REASONS

// Links of the legal sentences (t.rich tags).
const legalLinks = {
  cgu: (c: React.ReactNode) => <a href="/legal/cgu" target="_blank" rel="noreferrer" className="text-primary">{c}</a>,
  charter: (c: React.ReactNode) => <a href="/legal/remise-en-main-propre" target="_blank" rel="noreferrer" className="text-primary">{c}</a>,
  privacy: (c: React.ReactNode) => <a href="/legal/confidentialite" target="_blank" rel="noreferrer" className="text-primary">{c}</a>,
}

const field = 'w-full rounded-xl border border-transparent bg-surface-container-low px-3 py-3 text-body-md text-on-surface outline-none focus:border-primary'

// Maps API errors to readable text (the backend already answers in the
// member's language for credentials / duplicates; class-validator messages are English).
function readable(message?: string) {
  if (!message) return null
  if (/phone/i.test(message)) return auth.t('error.phoneInvalid')
  if (/password.*(longer|8)/i.test(message)) return auth.t('error.passwordShort')
  if (/email must be/i.test(message)) return auth.t('error.emailInvalid')
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return auth.t('error.network')
  return message
}

// Flag and dial code of the country a local number belongs to.
const DialPrefix = ({ country, className = '' }: { country: Country; className?: string }) => (
  <span className={`flex shrink-0 items-center gap-1 text-label-md ${className}`}><Flag code={country.code} />+{country.dialCode}</span>
)

// « Afficher le mot de passe »: the eye shows what was typed (phones make
// typos easy).
function PasswordInput({ value, onChange, placeholder, autoComplete, id, invalid = false, autoFocus = false }: { value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string; id?: string; invalid?: boolean; autoFocus?: boolean }) {
  const t = useT(auth)
  const [show, setShow] = useState(false)
  return (
    <div className={`flex items-center gap-2 rounded-xl bg-surface-container-low px-3 focus-within:ring-1 ${invalid ? 'ring-1 ring-primary' : 'focus-within:ring-primary'}`}>
      <Icon name="lock" size={19} className="text-on-surface-variant" />
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} autoFocus={autoFocus} aria-invalid={invalid} autoCapitalize="none" spellCheck={false} className="w-full min-w-0 border-none bg-transparent py-3 text-body-md text-on-surface outline-none" />
      <button type="button" onClick={() => setShow(s => !s)} className="tap-44 relative flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-sm text-on-surface-variant" aria-label={show ? t('password.hideAria') : t('password.showAria')} aria-pressed={show}><Icon name={show ? 'visibility_off' : 'visibility'} size={20} /> <span className="max-[380px]:hidden">{show ? t('password.hide') : t('password.show')}</span></button>
    </div>
  )
}

// Inline error of a form, with the way out that fits (`actions`).
function FormError({ message, children }: { message: string, children?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-col gap-1.5 rounded-xl bg-primary-fixed/60 px-3 py-2.5 text-body-sm text-primary">
      <p className="m-0 flex items-start gap-1.5"><Icon name="error" size={17} className="mt-0.5 shrink-0" /> <span className="min-w-0">{message}</span></p>
      {children && <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">{children}</div>}
    </div>
  )
}
const linkBtn = 'cursor-pointer border-none bg-transparent p-0 text-label-md text-primary underline underline-offset-2'

// The one identifier field of the sign-in: a mobile number by default
// (phone keypad), or an e-mail. A number is read like at sign-up: with or
// without +225, spaces, a leading 0 (lib/dialing, Backend common/phone).
function IdentifierField({ value, onChange, country, asEmail, onAsEmail, invalid }: { value: string; onChange: (v: string) => void; country: Country; asEmail: boolean; onAsEmail: (v: boolean) => void; invalid: boolean }) {
  const t = useT(auth)
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-label-md text-on-surface">
        <label htmlFor="login-id">{asEmail ? t('id.emailLabel') : t('id.phoneLabel')}</label>
        <button type="button" onClick={() => onAsEmail(!asEmail)} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">{asEmail ? t('id.usePhone') : t('id.useEmail')}</button>
      </div>
      <div className={`mt-1.5 flex items-center gap-2 rounded-xl bg-surface-container-low pr-3 focus-within:ring-1 ${invalid ? 'ring-1 ring-primary' : 'focus-within:ring-primary'}`}>
        {!asEmail && <DialPrefix country={country} className="ml-1 rounded-lg bg-surface-lowest px-2 py-2 text-on-surface" />}
        <input id="login-id" value={value} autoFocus onChange={e => onChange(e.target.value)} aria-invalid={invalid}
          type={asEmail ? 'email' : 'tel'} inputMode={asEmail ? 'email' : 'tel'} autoComplete={asEmail ? 'username email' : 'username tel'} autoCapitalize="none" spellCheck={false}
          placeholder={asEmail ? t('emailPlaceholder') : country.phoneExample} className="w-full min-w-0 border-none bg-transparent px-2 py-3 text-body-md text-on-surface outline-none" />
      </div>
    </div>
  )
}

function LoginForm({ onSuccess, onForgot, onRegister, smsLogin, codeTtl }: { onSuccess: (p: AuthPayload) => void; onForgot: () => void; onRegister: () => void; smsLogin: boolean; codeTtl: number }) {
  const t = useT(auth)
  const home = useHomeCountry()
  const country = useMarket() ?? home
  const [asEmail, setAsEmail] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [bySms, setBySms] = useState(false)
  const [failure, setFailure] = useState<{ message: string; reason: string | null } | null>(null)
  const [login, { loading }] = useMutation<{ login: AuthPayload }>(LOGIN_MUTATION)
  const busy = useRef(false)
  // A pasted e-mail switches the field to « e-mail ».
  const setId = (v: string) => { if (!asEmail && v.includes('@')) setAsEmail(true); setIdentifier(v); setFailure(null) }
  const id = identifier.trim()
  const phoneError = !asEmail && id ? localNumberError(id, country) : null
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (busy.current || loading) return
    if (phoneError) { setFailure({ message: phoneError, reason: 'PHONE_FORMAT' }); funnel('login_failure', { method: 'password', country: country.code, reason: 'PHONE_FORMAT' }); return }
    if (asEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) { setFailure({ message: t('login.emailIncomplete'), reason: 'PHONE_FORMAT' }); return }
    busy.current = true
    setFailure(null)
    funnel('login_start', { method: asEmail ? 'email' : 'phone', country: country.code })
    const phone = asEmail ? undefined : toIntl(id, country)
    void login({ variables: { input: { email: phone ?? id.toLowerCase(), password, countryCode: country.code } } }).then(r => {
      if (!r.data) return
      funnel('login', { method: asEmail ? 'email' : 'phone', country: country.code })
      onSuccess(r.data.login)
    }).catch((err: unknown) => {
      const reason = authReasonOf(err)
      setFailure({ message: readable((err as Error).message) ?? t('login.failed'), reason })
      funnel('login_failure', { method: 'password', country: country.code, reason })
    }).finally(() => { busy.current = false })
  }
  if (bySms) return <SmsLoginForm initialPhone={asEmail ? '' : identifier} codeTtl={codeTtl} onSuccess={onSuccess} onBack={() => setBySms(false)} onUseEmail={() => { setBySms(false); setAsEmail(true); setIdentifier(''); setFailure(null) }} />
  const r = failure?.reason
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <IdentifierField value={identifier} onChange={setId} country={country} asEmail={asEmail} onAsEmail={v => { setAsEmail(v); setFailure(null) }} invalid={r === 'PHONE_FORMAT' || r === 'UNKNOWN_IDENTIFIER'} />
      <div>
        <div className="flex items-center justify-between text-label-md text-on-surface"><label htmlFor="login-pw">{t('password.label')}</label>
          <button type="button" onClick={onForgot} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">{t('login.forgotQ')}</button>
        </div>
        <div className="mt-1.5"><PasswordInput id="login-pw" value={password} onChange={v => { setPassword(v); if (r === 'WRONG_PASSWORD') setFailure(null) }} placeholder={t('login.passwordPlaceholder')} autoComplete="current-password" invalid={r === 'WRONG_PASSWORD'} /></div>
      </div>
      {failure && (
        <FormError message={failure.message}>
          {r === 'UNKNOWN_IDENTIFIER' && <button type="button" onClick={onRegister} className={linkBtn}>{t('createAccount')}</button>}
          {smsLogin && (r === 'WRONG_PASSWORD' || r === 'NO_PASSWORD' || r === 'LOCKED') && <button type="button" onClick={() => setBySms(true)} className={linkBtn}>{t('login.smsCode')}</button>}
          {(r === 'WRONG_PASSWORD' || r === 'LOCKED') && <button type="button" onClick={onForgot} className={linkBtn}>{t('login.forgot')}</button>}
        </FormError>
      )}
      <button type="submit" disabled={loading || !id || !password} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-label-lg text-white hover:bg-primary-dark disabled:opacity-60">
        {loading ? <><Spinner /> {t('signingIn')}</> : <>{t('signIn')} <Icon name="arrow_forward" size={19} /></>}
      </button>
      {smsLogin && (
        <button type="button" onClick={() => setBySms(true)} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-solid border-outline-variant bg-surface-lowest py-3 text-label-lg text-on-surface hover:bg-surface-container-low">
          <Icon name="sms" size={19} /> {t('login.bySms')}
        </button>
      )}
    </form>
  )
}

// A code just sent: where it went (number end, channel), how long it
// lasts, and what the code screen tells about its delivery.
type SentCode = PhoneCodeSent & { phone: string; country: string; ttl: number }
const sentCode = (d: PhoneCodeSent, phone: string, country: string): SentCode => ({
  ...d, phone, country, ttl: Math.max(1, Math.round((Date.parse(d.expiresAt) - Date.now()) / 60_000)),
})

const Spinner = () => <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

// « Se connecter par code SMS »: the number, then the 6-digit code (sent
// only to the confirmed number of an account). The code submits itself.
function SmsLoginForm({ initialPhone, codeTtl, onSuccess, onBack, onUseEmail }: { initialPhone: string; codeTtl: number; onSuccess: (p: AuthPayload) => void; onBack: () => void; onUseEmail: () => void }) {
  const t = useT(auth)
  const home = useHomeCountry()
  const market = useMarket() ?? home
  const [phone, setPhone] = useState(initialPhone)
  const [code, setCode] = useState('')
  const [sent, setSent] = useState<SentCode | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const wait = useCooldown(resendAt)
  const delivery = useCodeDelivery(sent?.deliveryRef)
  const [failure, setFailure] = useState<{ message: string; reason: string | null } | null>(null)
  const [request, { loading: sending }] = useMutation<{ requestLoginCode: PhoneCodeSent }>(REQUEST_LOGIN_CODE_MUTATION)
  const [verify, { loading: checking }] = useMutation<{ loginWithCode: AuthPayload }>(LOGIN_WITH_CODE_MUTATION)
  const busy = useRef(false)
  const intl = toIntl(phone, market)
  const countryCode = countryOfIntl(intl) ?? market.code
  const phoneError = phone ? localNumberError(phone, market) : null
  const ask = (channel?: CodeChannel) => {
    if (!intl || phoneError || busy.current) return
    busy.current = true
    setFailure(null)
    void request({ variables: { phone: intl, countryCode, channel: channel ?? null } }).then(r => {
      const d = r.data?.requestLoginCode
      if (!d) return
      setSent(sentCode(d, intl, countryCode))
      setCode('')
      setResendAt(Date.now() + d.resendAfterSeconds * 1000)
      funnel('login_code_sent', { method: d.channel === 'WHATSAPP' ? 'whatsapp' : 'sms', country: countryCode })
    }).catch((err: unknown) => {
      const reason = authReasonOf(err)
      setFailure({ message: (err as Error).message, reason })
      funnel('login_failure', { method: 'sms', country: countryCode, reason })
    }).finally(() => { busy.current = false })
  }
  const check = (value: string) => {
    if (!sent || value.length !== 6 || busy.current) return
    busy.current = true
    setFailure(null)
    void verify({ variables: { input: { phone: sent.phone, countryCode: sent.country, code: value } } }).then(r => {
      if (!r.data) return
      funnel('login', { method: 'sms', country: sent.country })
      onSuccess(r.data.loginWithCode)
    }).catch((err: unknown) => {
      const reason = authReasonOf(err)
      setFailure({ message: (err as Error).message, reason })
      funnel('login_failure', { method: 'sms', country: sent.country, reason })
    }).finally(() => { busy.current = false })
  }
  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="flex w-fit cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant"><Icon name="arrow_back" size={18} /> {t('sms.backToPassword')}</button>
      {!sent ? (
        <form onSubmit={e => { e.preventDefault(); ask() }} noValidate className="flex flex-col gap-3">
          <label htmlFor="sms-phone" className="text-label-md text-on-surface">{t('sms.accountNumber')}</label>
          <span className={`flex h-12 items-center gap-2 rounded-xl bg-surface-container-low pl-2 focus-within:ring-1 ${phoneError ? 'ring-1 ring-primary' : 'focus-within:ring-primary'}`}>
            <DialPrefix country={market} className="rounded-lg bg-surface-lowest px-2 py-1.5 text-on-surface" />
            <input id="sms-phone" value={phone} autoFocus onChange={e => { setPhone(e.target.value.slice(0, 30)); setFailure(null) }} type="tel" inputMode="tel" autoComplete="tel" placeholder={market.phoneExample} aria-invalid={!!phoneError} className="h-full w-full min-w-0 border-none bg-transparent px-1 text-body-md text-on-surface outline-none" />
          </span>
          {phoneError && <span className="text-body-sm text-primary">{phoneError}</span>}
          {failure && <FormError message={failure.message} />}
          <button type="submit" disabled={!intl || !!phoneError || sending} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-60">{sending ? <><Spinner /> {t('sending')}</> : <><Icon name="sms" size={19} /> {t('sms.getCode')}</>}</button>
          <p className="m-0 text-body-sm text-on-surface-variant">{t('sms.note', { count: codeTtl })}</p>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <SmsCodeField value={code} onChange={v => { setCode(v); setFailure(null); if (v.length === 6) check(v) }} sent={sent} wait={wait} resending={sending} onResend={() => ask(sent.channel)} autoFocus />
          {checking && <p role="status" className="m-0 text-body-sm text-on-surface-variant">{t('sms.checking')}</p>}
          {failure && (
            <FormError message={failure.message}>
              {(failure.reason === 'CODE_EXPIRED' || failure.reason === 'LOCKED') && wait === 0 && <button type="button" onClick={() => ask(sent.channel)} className={linkBtn}>{t('newCode')}</button>}
            </FormError>
          )}
          <CodeHelp sent={sent} status={delivery} wait={wait} sending={sending} onOtherChannel={ask} email={{ label: t('sms.useEmail'), onClick: onUseEmail }} />
          <button type="button" onClick={() => { setSent(null); setCode(''); setFailure(null) }} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-on-surface-variant">{t('changeNumber')}</button>
        </div>
      )}
    </div>
  )
}

// Code field of an SMS code (6 digits, filled by the phone's keyboard
// suggestion), with the resend countdown.
function SmsCodeField({ value, onChange, sent, wait, resending, onResend, maybe = false, autoFocus = false }: { value: string; onChange: (v: string) => void; sent: SentCode; wait: number; resending: boolean; onResend: () => void; maybe?: boolean; autoFocus?: boolean }) {
  const t = useT(auth)
  const to = { hint: sent.phoneHint.replace(/^…/, ''), b: (c: React.ReactNode) => <b className="font-semibold">{c}</b> }
  const by = sent.channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS' // i18n-ignore
  return (
    <div className="rounded-xl bg-tertiary-soft/60 p-3">
      <p className="m-0 flex items-start gap-2 text-body-sm text-on-surface"><Icon name={sent.channel === 'WHATSAPP' ? 'chat' : 'sms'} size={18} className="mt-0.5 shrink-0 text-tertiary" /><span className="min-w-0">{maybe ? t.rich('code.sentMaybe', { by, count: sent.ttl, ...to }) : t.rich('code.sent', { by, count: sent.ttl, ...to })}</span></p>
      <label className="mt-2 block text-label-md text-on-surface">{t('code.label', { by })}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <input value={value} autoFocus={autoFocus} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="000000" aria-label={t('code.aria', { by })}
            className="h-12 w-36 rounded-xl border border-solid border-outline-variant bg-surface-lowest px-3 text-center font-mono text-body-lg tracking-[0.3em] text-on-surface outline-none focus:border-primary" />
          <button type="button" disabled={resending || wait > 0} onClick={onResend} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary disabled:cursor-default disabled:text-on-surface-variant">
            {resending ? t('sending') : wait > 0 ? t('code.resendWait', { wait }) : t('code.resend')}
          </button>
        </span>
      </label>
    </div>
  )
}

const Consent = ({ action }: { action: string }) => {
  const t = useT(auth)
  return <p className="m-0 text-body-sm text-on-surface-variant">{t.rich('consent.byTapping', { action, ...legalLinks })}</p>
}

// Sign-up. Where « Inscription par téléphone » applies (BO › Règles), SMS
// first and short: name and number → the code → the account is created as
// soon as the code is right (no other button). Then, where « Se connecter
// par code SMS » is on, the password and the e-mail are offered, both
// optional (« Plus tard »); elsewhere the password is typed with the name.
// Why: 37 % of the codes sent were never used — the code came before the
// password, the consent box and the e-mail, so the account waited on all of
// them (a disabled « Créer mon compte » without saying why, a code expiring
// after 5 minutes, errors only at the end). Without SMS sign-up: the e-mail
// form, every missing field said.
function RegisterForm({ onSuccess, onLogin }: { onSuccess: (p: AuthPayload) => void; onLogin: () => void }) {
  const t = useT(auth)
  const countries = useCountries()
  const home = useHomeCountry()
  const market = useMarket() ?? home
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', city: '', password: '', countryCode: market.code })
  const country = countries.find(c => c.code === form.countryCode) ?? market
  const lists = useLists(country.code)
  const [accepted, setAccepted] = useState(false)
  const [register, { loading }] = useMutation<{ register: AuthPayload }>(REGISTER_MUTATION)
  const { data: options, refetch: refetchOptions } = useQuery<{ phoneAuthOptions: PhoneAuthOptions }>(PHONE_AUTH_OPTIONS_QUERY, { variables: { countryCode: country.code } })
  const byPhone = !!options?.phoneAuthOptions.signup
  // « S'inscrire avec mon e-mail » next to the phone sign-up (BO › Règles,
  // on by default): the way in when SMS don't reach a network.
  const emailOffered = byPhone && options?.phoneAuthOptions.emailSignup !== false
  const [useEmail, setUseEmail] = useState(false)
  const emailMode = !byPhone || (emailOffered && useEmail)
  const method = emailMode ? 'email' : 'phone'
  // The password can wait (SMS login): asked after the account exists.
  const passwordLater = !emailMode && !!options?.phoneAuthOptions.smsLogin
  // The optional number of the e-mail form, only where phone sign-up is off
  // (where it is on, a number is proven by its code).
  const withPhone = !byPhone || !emailMode
  const phoneError = withPhone && form.phone ? localNumberError(form.phone, country) : null
  const [requestCode, { loading: sending }] = useMutation<{ requestSignupCode: PhoneCodeSent }>(REQUEST_SIGNUP_CODE_MUTATION)
  const [sent, setSent] = useState<SentCode | null>(null)
  const [code, setCode] = useState('')
  const [failure, setFailure] = useState<{ message: string; reason: string | null } | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const [created, setCreated] = useState<AuthPayload | null>(null)
  const wait = useCooldown(resendAt)
  const busy = useRef(false)
  const started = useRef(false)
  const intl = toIntl(form.phone, country)
  const codeFor = sent && sent.phone === intl ? sent : null
  const delivery = useCodeDelivery(codeFor?.deliveryRef)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setFailure(null)
    if (!started.current) { started.current = true; funnel('sign_up_start', { method, country: country.code }) }
  }
  const switchTo = (email: boolean) => {
    setUseEmail(email)
    setFailure(null)
    setSent(null)
    setCode('')
  }
  const fail = (err: unknown) => {
    const reason = authReasonOf(err)
    setFailure({ message: readable((err as Error).message) ?? t('register.failed'), reason })
    funnel('sign_up_failure', { method, country: country.code, reason })
    void refetchOptions()
  }
  const nameOk = form.fullName.trim().length >= 2
  const missing: string[] = []
  if (!nameOk) missing.push(t('missing.name'))
  if (!form.phone.trim() && !emailMode) missing.push(t('missing.phone'))
  if (phoneError) missing.push(t('missing.phoneComplete'))
  if (!passwordLater && form.password.length < 8) missing.push(t('missing.password'))
  if (emailMode && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) missing.push(t('missing.email'))
  if (emailMode && !accepted) missing.push(t('missing.terms'))

  const sendCode = (channel?: CodeChannel) => {
    if (!intl || phoneError || busy.current) return
    busy.current = true
    setFailure(null)
    void requestCode({ variables: { phone: intl, countryCode: country.code, channel: channel ?? null } }).then(r => {
      const d = r.data?.requestSignupCode
      if (!d) return
      setSent(sentCode(d, intl, country.code))
      setCode('')
      setResendAt(Date.now() + d.resendAfterSeconds * 1000)
      funnel('sign_up_code_sent', { method: d.channel === 'WHATSAPP' ? 'whatsapp' : 'phone', country: country.code })
    }).catch(fail).finally(() => { busy.current = false })
  }
  const create = (phoneCode?: string) => {
    if (busy.current) return
    busy.current = true
    setFailure(null)
    const email = form.email.trim().toLowerCase()
    void register({
      variables: { input: { fullName: form.fullName.trim(), email: emailMode ? email || undefined : undefined, phone: withPhone ? intl : undefined, phoneCode, city: form.city || undefined, password: form.password || undefined, countryCode: country.code, guestSecret: getGuestSecret() ?? undefined } },
    }).then(r => {
      if (!r.data) return
      funnel('sign_up', { method, country: country.code })
      metaTrack('CompleteRegistration', { status: method })
      // Signed in now; the next step (password, e-mail) is optional.
      storeAccessToken(r.data.register.accessToken)
      if (!emailMode && !r.data.register.user.hasPassword) setCreated(r.data.register)
      else onSuccess(r.data.register)
    }).catch(fail).finally(() => { busy.current = false })
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (missing.length) { setFailure({ message: t('missing.message', { list: missing.join(t('missing.separator')) }), reason: 'MISSING' }); return }
    if (!emailMode) sendCode()
    else create()
  }
  if (created) return <FinishSignup payload={created} country={country} cities={placeOptions(lists)} onDone={() => onSuccess(created)} />

  const taken = /déjà un compte|déjà associé|déjà utilisée/i.test(failure?.message ?? '')
  const alert = failure && (
    <FormError message={failure.message}>
      {taken && <button type="button" onClick={onLogin} className={linkBtn}>{t('signIn')}</button>}
      {failure.reason === 'CODE_EXPIRED' && wait === 0 && <button type="button" onClick={() => sendCode(codeFor?.channel)} className={linkBtn}>{t('newCode')}</button>}
    </FormError>
  )
  const nameField = <label className="text-label-md text-on-surface">{t('register.name')}<input value={form.fullName} onChange={set('fullName')} autoFocus autoComplete="name" autoCapitalize="words" placeholder={t('register.namePlaceholder')} className={`${field} mt-1.5`} /></label>
  const countryField = (
    <label className="text-label-md text-on-surface">{t('register.country')}
      <Select value={country.code} onChange={e => { setForm(f => ({ ...f, countryCode: e.target.value, city: '' })); setFailure(null) }} className={`${field} mt-1.5 cursor-pointer`}>
        {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
      </Select>
    </label>
  )
  const phoneInput = <span className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low pl-3 focus-within:ring-1 ${phoneError ? 'ring-1 ring-primary' : 'focus-within:ring-primary'}`}><DialPrefix country={country} className="text-on-surface-variant" /><input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder={country.phoneExample} aria-invalid={!!phoneError} aria-label={t('register.phone')} className="w-full min-w-0 border-none bg-transparent px-2 py-3 text-body-md text-on-surface outline-none" /></span>
  const passwordField = (
    <label className="text-label-md text-on-surface">{t('password.label')}
      <span className="mt-1.5 block"><PasswordInput value={form.password} onChange={v => { setForm(f => ({ ...f, password: v })); setFailure(null) }} placeholder={t('password.min')} autoComplete="new-password" /></span>
      {form.password && form.password.length < 8 && <span className="mt-1 block text-body-sm font-normal text-on-surface-variant">{t('password.remaining', { count: 8 - form.password.length })}</span>}
    </label>
  )
  const toEmail = emailOffered && (
    <button type="button" onClick={() => switchTo(true)} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-solid border-outline-variant bg-surface-lowest py-3 text-label-lg text-on-surface hover:bg-surface-container-low">
      <Icon name="mail" size={19} /> {t('register.withEmail')}
    </button>
  )

  if (!emailMode) {
    // 2. The code: the account is created as soon as it is complete.
    if (codeFor)
      return (
        <div className="flex flex-col gap-3.5">
          <SmsCodeField value={code} autoFocus onChange={v => { setCode(v); setFailure(null); if (v.length === 6) create(v) }} sent={codeFor} wait={wait} resending={sending} onResend={() => sendCode(codeFor.channel)} />
          {loading && <p role="status" className="m-0 flex items-center gap-2 text-body-sm text-on-surface-variant"><Icon name="hourglass_top" size={17} /> {t('register.creatingAccount')}</p>}
          {alert}
          <CodeHelp sent={codeFor} status={delivery} wait={wait} sending={sending} onOtherChannel={sendCode}
            email={emailOffered ? { label: t('register.withEmail'), onClick: () => switchTo(true) } : undefined} />
          <button type="button" onClick={() => { setSent(null); setCode(''); setFailure(null) }} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-on-surface-variant">{t('changeNumber')}</button>
        </div>
      )
    // 1. Who and the number.
    return (
      <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        {nameField}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          {countryField}
          <div className="text-label-md text-on-surface">{t('register.phone')}
            <div className="mt-1.5 flex">{phoneInput}</div>
          </div>
        </div>
        {phoneError ? <span className="-mt-2 block text-body-sm text-primary">{phoneError}</span>
          : <span className="-mt-2 block text-body-sm text-on-surface-variant">{t('register.codeHint')}</span>}
        {!passwordLater && passwordField}
        {alert}
        <button type="submit" disabled={sending} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-label-lg text-white hover:bg-primary-dark disabled:opacity-60">
          {sending ? <><Spinner /> {t('register.sendingCode')}</> : <><Icon name="sms" size={19} /> {t('register.getSmsCode')}</>}
        </button>
        <Consent action={t('register.getSmsCode')} />
        {toEmail && <span className="flex items-center gap-3 text-label-sm text-on-surface-variant"><span className="h-px flex-1 bg-outline-variant" />{t('register.noSms')}<span className="h-px flex-1 bg-outline-variant" /></span>}
        {toEmail}
      </form>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      {byPhone && (
        <p className="m-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface-variant">
          <span className="flex min-w-0 items-center gap-1.5"><Icon name="mail" size={17} className="shrink-0" /> {t('register.emailMode')}</span>
          <button type="button" onClick={() => switchTo(false)} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-primary">{t('id.usePhone')}</button>
        </p>
      )}
      {nameField}
      {countryField}
      <div className={`grid grid-cols-[minmax(0,1fr)] gap-3.5 ${withPhone ? 'sm:grid-cols-2' : ''}`}>
        <label className="text-label-md text-on-surface">{t('register.email')}<input type="email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" autoCapitalize="none" placeholder={t('emailPlaceholder')} className={`${field} mt-1.5`} /></label>
        {withPhone && (
          <label className="text-label-md text-on-surface">{t('register.whatsapp')} <span className="font-normal text-on-surface-variant">{t('optional')}</span>
            <span className="mt-1.5 flex">{phoneInput}</span>
            {phoneError && <span className="mt-1 block text-body-sm text-primary">{phoneError}</span>}
          </label>
        )}
      </div>
      <label className="text-label-md text-on-surface">{t('register.city')}
        <Select value={form.city} onChange={set('city')} className={`${field} mt-1.5 cursor-pointer`}>
          <option value="">{t('choose')}</option>
          {placeOptions(lists).map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </label>
      {passwordField}
      <label className="flex cursor-pointer items-start gap-2 text-body-sm text-on-surface-variant">
        <input type="checkbox" checked={accepted} onChange={e => { setAccepted(e.target.checked); setFailure(null) }} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
        <span>{t.rich('register.accept', legalLinks)}</span>
      </label>
      {alert}
      <button type="submit" disabled={loading} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-label-lg text-white hover:bg-primary-dark disabled:opacity-60">
        {loading ? <><Spinner /> {t('register.creating')}</> : <>{t('register.submit')} <Icon name="arrow_forward" size={19} /></>}
      </button>
      {byPhone && <p className="m-0 text-body-sm text-on-surface-variant">{t('register.emailNote')}</p>}
    </form>
  )
}

// Right after the account was created with the SMS code: a password (now
// or later — the member logs in by SMS code meanwhile), an e-mail and the
// town, all optional.
function FinishSignup({ payload, country, cities, onDone }: { payload: AuthPayload; country: Country; cities: string[]; onDone: () => void }) {
  const t = useT(auth)
  const tc = useT(common)
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const [setPw, { loading: savingPw }] = useMutation<{ setPassword: boolean }>(SET_PASSWORD_MUTATION)
  const [updateProfile, { loading: savingProfile }] = useMutation(UPDATE_PROFILE_MUTATION)
  const saving = savingPw || savingProfile
  const emailOk = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const save = async () => {
    if (saving) return
    setFailure(null)
    try {
      if (password) await setPw({ variables: { input: { newPassword: password } } })
      if (email.trim() || city) await updateProfile({ variables: { input: { ...(email.trim() ? { email: email.trim().toLowerCase() } : {}), ...(city ? { city } : {}) } } })
      funnel(password ? 'sign_up_password_set' : 'sign_up_password_later', { method: 'phone', country: country.code })
      onDone()
    } catch (e) {
      setFailure(readable((e as Error).message) ?? t('finish.failed'))
    }
  }
  return (
    <div className="flex flex-col gap-3.5">
      <p role="status" className="m-0 flex items-start gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><Icon name="check_circle" size={18} className="mt-0.5 shrink-0" /> <span className="min-w-0">{t('finish.welcome', { name: payload.user.fullName.split(' ')[0] })}</span></p>
      <label className="text-label-md text-on-surface">{t('password.label')} <span className="font-normal text-on-surface-variant">{t('optional')}</span>
        <span className="mt-1.5 block"><PasswordInput value={password} onChange={v => { setPassword(v); setFailure(null) }} placeholder={t('password.min')} autoComplete="new-password" autoFocus /></span>
        <span className="mt-1 block text-body-sm font-normal text-on-surface-variant">{password && password.length < 8 ? t('password.remaining', { count: 8 - password.length }) : t('finish.noPasswordHint')}</span>
      </label>
      <label className="text-label-md text-on-surface">{t('register.email')} <span className="font-normal text-on-surface-variant">{t('optional')}</span><input type="email" value={email} onChange={e => { setEmail(e.target.value); setFailure(null) }} autoComplete="email" inputMode="email" autoCapitalize="none" placeholder={t('emailPlaceholder')} className={`${field} mt-1.5`} /></label>
      <label className="text-label-md text-on-surface">{t('register.city')} <span className="font-normal text-on-surface-variant">{t('optional')}</span>
        <Select value={city} onChange={e => setCity(e.target.value)} className={`${field} mt-1.5 cursor-pointer`}>
          <option value="">{t('choose')}</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </label>
      {failure && <FormError message={failure} />}
      <button type="button" onClick={() => void save()} disabled={saving || (!!password && password.length < 8) || !emailOk} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3.5 text-label-lg text-white hover:bg-primary-dark disabled:opacity-60">
        {saving ? <><Spinner /> {tc('saving')}</> : <>{tc('continue')} <Icon name="arrow_forward" size={19} /></>}
      </button>
      <button type="button" onClick={() => { funnel('sign_up_password_later', { method: 'phone', country: country.code }); onDone() }} disabled={saving} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-on-surface-variant">{t('finish.later')}</button>
    </div>
  )
}

// « Continuer avec Google / Facebook » when the BO switched them on for the
// visitor's country. Google's script loads only here; Facebook needs none
// (redirect to its dialog). Inside Facebook's / Instagram's browser Google
// refuses to sign in: a note says to open the site in the browser.
function SocialButtons({ onSuccess }: { onSuccess: (p: AuthPayload) => void }) {
  const t = useT(auth)
  const tc = useT(common)
  const home = useHomeCountry()
  const country = useMarket() ?? home
  const { data } = useQuery<{ socialLoginConfig: SocialLoginConfig }>(SOCIAL_LOGIN_CONFIG_QUERY, { variables: { country: country.code }, fetchPolicy: 'cache-first' })
  const cfg = data?.socialLoginConfig
  const [googleLogin] = useMutation<{ googleLogin: AuthPayload }>(GOOGLE_LOGIN_MUTATION)
  const [facebookLogin, { loading: fbLoading }] = useMutation<{ facebookLogin: AuthPayload }>(FACEBOOK_LOGIN_MUTATION)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const googleBox = useRef<HTMLDivElement>(null)
  const iab = inAppBrowser()
  const done = (method: 'google' | 'facebook') => (p: AuthPayload) => {
    funnel(p.isNewAccount ? 'sign_up' : 'login', { method, country: country.code })
    if (p.isNewAccount) metaTrack('CompleteRegistration', { status: method })
    onSuccess(p)
  }
  const failed = (method: string) => (err: unknown) => {
    setFailure((err as Error).message)
    funnel('login_failure', { method, country: country.code, reason: authReasonOf(err) })
  }
  // Back from Facebook's dialog (/connexion/facebook).
  useEffect(() => {
    const back = takeFacebookReturn('login')
    if (!back) return
    if ('error' in back) { setFailure(back.error); return }
    setBusy(true)
    void facebookLogin({ variables: { input: { code: back.code, redirectUri: facebookRedirectUri(), countryCode: back.intent.country } } })
      .then(r => r.data && done('facebook')(r.data.facebookLogin), failed('facebook'))
      .finally(() => setBusy(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Google's own button (its look is required by Google).
  const clientId = cfg?.google.enabled ? cfg.google.clientId : null
  useEffect(() => {
    if (!clientId || iab || !googleBox.current) return
    let cancelled = false
    void loadGoogle().then(g => {
      if (cancelled || !googleBox.current) return
      g.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        use_fedcm_for_prompt: true,
        callback: (res: { credential?: string }) => {
          if (!res.credential) return
          setBusy(true)
          setFailure(null)
          void googleLogin({ variables: { input: { idToken: res.credential, countryCode: country.code } } })
            .then(r => r.data && done('google')(r.data.googleLogin), failed('google'))
            .finally(() => setBusy(false))
        },
      })
      g.renderButton(googleBox.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: getLocale(), width: Math.min(googleBox.current.clientWidth || 320, 400) })
    }).catch(() => { if (!cancelled) setFailure(auth.t('social.googleDown')) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, iab])
  if (!cfg || (!cfg.google.enabled && !cfg.facebook.enabled)) return failure ? <FormError message={failure} /> : null
  return (
    <div className="flex flex-col gap-2.5">
      <span className="flex items-center gap-3 text-label-sm text-on-surface-variant"><span className="h-px flex-1 bg-outline-variant" />{tc('or')}<span className="h-px flex-1 bg-outline-variant" /></span>
      {cfg.google.enabled && (iab
        ? <p className="m-0 rounded-xl bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface-variant">{t('social.inAppBrowser')}</p>
        : <div ref={googleBox} className="flex min-h-[44px] w-full justify-center" aria-label={t('social.googleAria')} onClick={() => funnel('social_start', { method: 'google', country: country.code })} />)}
      {cfg.facebook.enabled && cfg.facebook.appId && (
        <button type="button" disabled={busy || fbLoading} onClick={() => { funnel('social_start', { method: 'facebook', country: country.code }); startFacebook(cfg.facebook.appId!, 'login', country.code) }}
          className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-[#1877F2] px-4 text-label-lg text-white hover:opacity-90 disabled:opacity-60">
          <svg aria-hidden viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" /></svg>
          {busy || fbLoading ? t('signingIn') : t('social.facebook')}
        </button>
      )}
      {busy && !fbLoading && <p role="status" className="m-0 text-center text-body-sm text-on-surface-variant">{t('signingIn')}</p>}
      {failure && <FormError message={failure} />}
      <p className="m-0 text-center text-label-sm text-on-surface-variant">{t('social.note')}</p>
    </div>
  )
}

const softField = 'h-12 rounded-xl border-none bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary'

// "Mot de passe oublié": a reset link e-mailed to the account's address,
// or (when SMS is set up) a code sent by SMS to the account's verified
// number — the same answer whether or not either belongs to a member. No
// access to either: the request reaches the support queue instead
// (SupportRecovery).
function ForgotPassword({ onBack }: { onBack: () => void }) {
  const t = useT(auth)
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
      <button onClick={onBack} className="flex w-fit cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant"><Icon name="arrow_back" size={18} /> {t('forgot.back')}</button>
      <div className="rounded-2xl bg-surface-container-low p-5">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="lock_reset" size={24} /></span>
          <h2 className="m-0 mt-3 text-headline-sm text-on-surface">{t('login.forgot')}</h2>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">{method === 'email' ? t('forgot.emailText') : t('forgot.smsText')}</p>
        </div>
        {smsReset && (
          <div role="tablist" aria-label={t('forgot.receiveAria')} className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-lowest p-1">
            {([['email', 'mail', t('forgot.byEmail')], ['sms', 'sms', t('forgot.bySms')]] as const).map(([k, icon, label]) => (
              <button key={k} type="button" role="tab" aria-selected={method === k} onClick={() => setBy(k)} className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none py-2 text-label-md ${method === k ? 'bg-primary text-white' : 'bg-transparent text-on-surface-variant'}`}><Icon name={icon} size={17} /> {label}</button>
            ))}
          </div>
        )}
        {method === 'email' ? <ResetByEmail /> : <ResetBySms onDone={onBack} onUseEmail={() => setBy('email')} />}
        <button onClick={() => setSupport(true)} className="mx-auto mt-4 flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-center text-label-md text-primary"><Icon name="support_agent" size={18} className="shrink-0" /> {method === 'email' ? t('forgot.lostEmail') : t('forgot.lostPhone')}</button>
      </div>
    </div>
  )
}

function ResetByEmail() {
  const t = useT(auth)
  const [email, setEmail] = useState('')
  const [send, { data, loading, error }] = useMutation<{ requestPasswordReset: boolean }>(REQUEST_PASSWORD_RESET_MUTATION)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  return data?.requestPasswordReset ? (
    <p role="status" className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><Icon name="forward_to_inbox" size={18} className="mt-0.5 shrink-0" /> <span className="min-w-0 break-words">{t.rich('resetEmail.sent', { email: email.trim(), b: c => <b className="font-semibold">{c}</b> })}</span></p>
  ) : (
    <form onSubmit={e => { e.preventDefault(); void send({ variables: { email: email.trim().toLowerCase() } }).catch(() => undefined) }} className="mt-4 flex flex-col gap-3">
      <input type="email" value={email} onChange={e => setEmail(e.target.value.slice(0, 120))} placeholder={t('emailPlaceholder')} autoComplete="email" aria-label={t('resetEmail.aria')} className={softField} />
      {error && <p className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{error.message}</p>}
      <button type="submit" disabled={!valid || loading} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-60"><Icon name="mail" size={19} /> {loading ? t('sending') : t('resetEmail.submit')}</button>
    </form>
  )
}

// Number, then the code and the new password. The server answers the same
// whether or not the number has an account (and only texts a verified one).
function ResetBySms({ onDone, onUseEmail }: { onDone: () => void; onUseEmail: () => void }) {
  const t = useT(auth)
  const home = useHomeCountry()
  const market = useMarket() ?? home
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState<SentCode | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const wait = useCooldown(resendAt)
  const [request, { loading: sending, error: sendError }] = useMutation<{ requestPasswordResetCode: PhoneCodeSent }>(REQUEST_PASSWORD_RESET_CODE_MUTATION)
  const [reset, { data: done, loading: saving, error: resetError }] = useMutation<{ resetPasswordWithCode: boolean }>(RESET_PASSWORD_WITH_CODE_MUTATION)
  const intl = toIntl(phone, market)
  // A number typed with its dial code may be of another open country.
  const countryCode = countryOfIntl(intl) ?? market.code
  const phoneError = phone ? localNumberError(phone, market) : null
  // The answer never tells whether the number has an account, nor the
  // delivery of the code (no `deliveryRef`): only what depends on the
  // network (SMS unreliable there, WhatsApp offered).
  const ask = (channel?: CodeChannel) => {
    if (!intl) return
    void request({ variables: { phone: intl, countryCode, channel: channel ?? null } }).then(r => {
      const d = r.data?.requestPasswordResetCode
      if (!d) return
      setSent(sentCode(d, intl, countryCode))
      setResendAt(Date.now() + d.resendAfterSeconds * 1000)
    }).catch(() => undefined)
  }
  if (done?.resetPasswordWithCode)
    return (
      <div className="mt-4 flex flex-col gap-3">
        <p role="status" className="m-0 flex items-start gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><Icon name="check_circle" size={18} className="mt-0.5 shrink-0" /> <span className="min-w-0">{t('resetSms.done')}</span></p>
        <button type="button" onClick={onDone} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white"><Icon name="login" size={19} /> {t('signIn')}</button>
      </div>
    )
  if (!sent)
    return (
      <form onSubmit={e => { e.preventDefault(); ask() }} className="mt-4 flex flex-col gap-3">
        <span className="flex h-12 items-center gap-2 rounded-xl bg-surface-lowest pl-2 focus-within:outline focus-within:outline-2 focus-within:outline-primary">
          <DialPrefix country={market} className="rounded-lg bg-surface-container-low px-2 py-1.5 text-on-surface" />
          <input value={phone} onChange={e => setPhone(e.target.value.slice(0, 30))} inputMode="tel" autoComplete="tel-national" placeholder={market.phoneExample} aria-label={t('resetSms.phoneAria')} className="h-full w-full min-w-0 border-none bg-transparent px-1 text-body-md text-on-surface outline-none" />
        </span>
        {phoneError && <span className="text-body-sm text-primary">{phoneError}</span>}
        {sendError && <p className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{sendError.message}</p>}
        <button type="submit" disabled={!intl || !!phoneError || sending} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-60"><Icon name="sms" size={19} /> {sending ? t('sending') : t('sms.getCode')}</button>
      </form>
    )
  return (
    <form onSubmit={e => { e.preventDefault(); void reset({ variables: { input: { phone: sent.phone, countryCode: sent.country, code, newPassword: password } } }).catch(() => undefined) }} className="mt-4 flex flex-col gap-3">
      <SmsCodeField maybe value={code} onChange={setCode} sent={sent} wait={wait} resending={sending} onResend={() => ask(sent.channel)} />
      <label className="text-label-md text-on-surface">{t('resetSms.newPassword')}
        <span className="mt-1.5 block"><PasswordInput value={password} onChange={setPassword} placeholder={t('password.min')} autoComplete="new-password" /></span>
      </label>
      {(resetError || sendError) && <p role="alert" className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{(resetError ?? sendError)!.message}</p>}
      <button type="submit" disabled={code.length !== 6 || password.length < 8 || saving} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-60"><Icon name="lock_reset" size={19} /> {saving ? common.t('saving') : t('resetSms.submit')}</button>
      <CodeHelp sent={sent} status={null} wait={wait} sending={sending} onOtherChannel={ask} email={{ label: t('resetSms.byEmail'), onClick: onUseEmail }} />
      <button type="button" onClick={() => { setSent(null); setCode('') }} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-on-surface-variant">{t('changeNumber')}</button>
    </form>
  )
}

// Lost access to the mailbox (or no e-mail on the account): the request
// reaches the Dilchap support queue (matched to the account, with its badge
// priority); WhatsApp stays available as a second way.
function SupportRecovery({ onBack }: { onBack: () => void }) {
  const t = useT(auth)
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
      <button onClick={onBack} className="flex w-fit cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant"><Icon name="arrow_back" size={18} /> {t('login.forgot')}</button>
      <div className="rounded-2xl bg-surface-container-low p-5">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="support_agent" size={24} /></span>
          <h2 className="m-0 mt-3 text-headline-sm text-on-surface">{t('recovery.title')}</h2>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('recovery.text')}</p>
        </div>
        {done ? (
          <p className="m-0 mt-4 flex items-start gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><Icon name="check_circle" size={18} className="mt-0.5 shrink-0" /> {t('recovery.done', { ref: done.reference })}</p>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.slice(0, 80) }))} placeholder={t('recovery.name')} autoComplete="name" className="h-12 rounded-xl border-none bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary" />
            <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value.slice(0, 120) }))} placeholder={t('recovery.contact')} autoComplete="username" className="h-12 rounded-xl border-none bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary" />
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value.slice(0, 2000) }))} rows={3} placeholder={t('recovery.message')} className="resize-y rounded-xl border-none bg-surface-lowest p-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary" />
            {error && <p className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{error.message}</p>}
            <button type="submit" disabled={!ok || loading} className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-60"><Icon name="send" size={19} /> {loading ? t('sending') : t('recovery.submit')}</button>
          </form>
        )}
        {phone && (
          <a href={`https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(t('recovery.whatsappText'))}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 text-label-md text-tertiary no-underline">
            <Icon name="chat" size={18} /> {t('recovery.whatsapp')}
          </a>
        )}
      </div>
    </div>
  )
}

// "Connexion & Inscription" (Stitch desktop split card / mobile stack).
export default function Auth({ onNavigate, onLogin, onClose }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const t = useT(auth)
  const tc = useT(common)
  const [reason] = useState(takeAuthReason)
  usePageTitle(mode === 'login' ? t('login.title') : mode === 'register' ? t('createAccount') : t('login.forgot'))
  // « Se connecter par code SMS » offered in the visitor's country.
  const home = useHomeCountry()
  const country = useMarket() ?? home
  const { data: phoneOptions } = useQuery<{ phoneAuthOptions: PhoneAuthOptions }>(PHONE_AUTH_OPTIONS_QUERY, { variables: { countryCode: country.code } })
  const smsLogin = !!phoneOptions?.phoneAuthOptions.smsLogin
  const codeTtl = phoneOptions?.phoneAuthOptions.codeTtlMinutes ?? 5
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
      <button onClick={onClose} className="mb-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface md:mb-4" aria-label={tc('back')}>
        <Icon name="arrow_back" size={22} />
      </button>
      <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface-lowest lg:grid-cols-2">
        <section className="flex flex-col p-6 md:p-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Logo size="md" /><span className="hidden items-center gap-1 rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary sm:flex"><Icon name="verified" size={14} /> {t('page.westAfrica')}</span></div>
            <button onClick={() => onNavigate('search')} className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-label-md text-on-surface"><Icon name="storefront" size={18} /> <span className="max-[400px]:hidden">{t('page.explore')}</span><span className="min-[400px]:hidden">{t('page.catalogue')}</span></button>
          </div>
          <div className="mt-4 flex flex-col items-center gap-2 lg:hidden">
            <span className="flex items-center gap-1.5 rounded-full bg-tertiary-soft px-3 py-1 text-label-sm text-tertiary"><Icon name="verified" size={15} /> {t('page.tagline')}</span>
            <p className="m-0 text-center text-body-md text-on-surface-variant">{t('page.taglineText')}</p>
          </div>
          {reason && mode !== 'forgot' && (
            <p role="status" className="m-0 mt-4 flex items-center gap-2.5 rounded-xl bg-primary-fixed/60 px-3 py-2.5 text-body-sm text-on-surface">
              <Icon name={REASONS[reason].icon} size={19} className="shrink-0 text-primary" /> {t(`reason.${reason}`)}
            </p>
          )}

          {mode !== 'forgot' && <h1 className="m-0 mt-6 text-headline-md text-on-surface">{mode === 'login' ? t('login.title') : t('createAccount')}</h1>}

          <div className="mt-6">
            {mode === 'login' && <LoginForm onSuccess={success} onForgot={() => setMode('forgot')} onRegister={() => setMode('register')} smsLogin={smsLogin} codeTtl={codeTtl} />}
            {mode === 'register' && <RegisterForm onSuccess={success} onLogin={() => setMode('login')} />}
            {mode === 'forgot' && <ForgotPassword onBack={() => setMode('login')} />}
          </div>

          {/* « Continuer avec Google / Facebook » (when switched on). */}
          <div className={mode === 'forgot' ? 'hidden' : 'mt-4'}>
            <SocialButtons onSuccess={success} />
          </div>

          {/* Switch between logging in and signing up, under the form. */}
          {mode !== 'forgot' && (
            <div className="mt-4 flex flex-col gap-2">
              <span className="flex items-center gap-3 text-label-sm text-on-surface-variant"><span className="h-px flex-1 bg-outline-variant" />{mode === 'login' ? t('page.notYet') : t('page.already')}<span className="h-px flex-1 bg-outline-variant" /></span>
              <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-solid border-outline-variant bg-surface-lowest py-3.5 text-label-lg text-on-surface hover:bg-surface-container-low">
                <Icon name={mode === 'login' ? 'person_add' : 'login'} size={19} /> {mode === 'login' ? t('createAccount') : t('signIn')}
              </button>
            </div>
          )}

          {/* Mobile trust strip */}
          <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-surface-container-low p-3 text-center lg:hidden">
            {[...(noCommission ? [['percent', t('strip.noCommission'), t('strip.noFees'), 'bg-tertiary-soft text-tertiary']] : []), ['handshake', t('strip.direct'), t('strip.public'), 'bg-primary-fixed text-primary'], ['shield', t('strip.antiScam'), t('strip.code'), 'bg-tertiary-soft text-tertiary']].map(([icon, title, s, cls]) => (
              <div key={icon}><span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${cls}`}><Icon name={icon} size={18} /></span><div className="mt-1 text-label-sm text-on-surface">{title}</div><div className="text-label-sm text-on-surface-variant">{s}</div></div>
            ))}
          </div>

          <div className="flex-1" />
          {supportPhone && (
            <p className="m-0 mt-6 flex flex-wrap items-center justify-center gap-1 text-body-sm text-on-surface-variant lg:justify-start">
              <Icon name="support_agent" size={18} /> {t('page.help')}
              <a href={`https://wa.me/${supportPhone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="text-label-md text-primary no-underline">{t('page.contactSupport')}</a>
            </p>
          )}
          <p className="m-0 mt-4 text-center text-label-sm text-on-surface-variant lg:text-left">{t.rich('page.legal', legalLinks)}
            <ManageCookies className="ml-1 cursor-pointer border-none bg-transparent p-0 text-label-sm text-primary underline underline-offset-2" />
          </p>
        </section>

        <aside className="relative hidden overflow-hidden bg-surface-container-low p-10 lg:block">
          <span className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-fixed/50" aria-hidden />
          <span className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-tertiary-soft" aria-hidden />
          <div className="relative">
            <h2 className="m-0 text-headline-lg text-on-surface">{t('page.asideTitle')}</h2>
            <p className="m-0 mt-3 text-body-lg text-on-surface-variant">{t('page.asideText')}</p>
            <div className="mt-6 flex flex-col gap-3">
              {perks().filter(p => noCommission || p.icon !== 'percent').map(p => (
                <div key={p.title} className="flex gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary text-white"><Icon name={p.icon} size={20} /></span>
                  <div><div className="text-label-lg text-on-surface">{p.title}</div><div className="text-body-sm text-on-surface-variant">{p.text}</div></div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-label-sm uppercase text-on-surface-variant">{t('page.payments')}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {methods.filter(code => code !== 'CASH').map(code => (
                <span key={code} className="flex items-center gap-1.5 rounded-lg bg-surface-lowest py-1 pl-1 pr-3 text-label-md text-on-surface"><PaymentLogo method={code} size={24} /> {paymentLabel(code)}</span>
              ))}
              <span className="flex items-center gap-1.5 rounded-lg bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface"><Icon name="payments" size={16} /> {tc('cash')}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
