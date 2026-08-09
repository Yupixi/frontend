import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, ShieldCheck, Sparkles, Users, TrendingUp } from 'lucide-react'
import Logo from '../components/Logo'
import { LOGIN_MUTATION, REGISTER_MUTATION, type AuthPayload } from '../graphql/auth'
import { storeTokens } from '../lib/auth'

type AuthProps = {
  onNavigate: (page: any) => void
  onLogin: () => void
}

const BRAND_POINTS = [
  { icon: Sparkles, text: 'Publiez une annonce en quelques minutes' },
  { icon: Users, text: "Achetez et vendez librement, sans distinction de compte" },
  { icon: TrendingUp, text: 'Boostez votre visibilité auprès de milliers de visiteurs' },
]

export default function Auth({ onNavigate, onLogin }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')

  if (mode === 'forgot') {
    return <AuthShell><ForgotPassword onBack={() => setMode('login')} /></AuthShell>
  }

  return (
    <AuthShell>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
          <Logo size="lg" />
        </div>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>
          {mode === 'login' ? 'Connectez-vous à votre compte' : 'Créez votre compte gratuitement'}
        </p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', background: 'var(--border-subtle)', borderRadius: 10, padding: 3, marginBottom: '1.5rem' }}>
          {([
            { key: 'login', label: 'Se connecter' },
            { key: 'register', label: "S'inscrire" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              style={{
                flex: 1, padding: '0.65rem', border: 'none', borderRadius: 8, cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.9rem',
                background: mode === t.key ? 'var(--primary)' : 'transparent',
                color: mode === t.key ? '#fff' : 'var(--fg-muted)',
                transition: 'all 0.2s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === 'login'
          ? <LoginForm onForgot={() => setMode('forgot')} onSuccess={(payload) => handleAuthSuccess(payload, onLogin, onNavigate)} />
          : <RegisterForm onSuccess={(payload) => handleAuthSuccess(payload, onLogin, onNavigate)} />}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { icon: ShieldCheck, text: 'Données sécurisées' },
        ].map(item => (
          <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.8rem' }}>
            <item.icon size={14} color="var(--success, #10B981)" />
            {item.text}
          </div>
        ))}
      </div>
    </AuthShell>
  )
}

function handleAuthSuccess(payload: AuthPayload, onLogin: () => void, onNavigate: (page: any) => void) {
  storeTokens(payload.accessToken, payload.refreshToken)
  onLogin()
  onNavigate('home')
}

function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div style={{
      background: 'rgba(254,0,0,0.06)', border: '1px solid rgba(254,0,0,0.2)', borderRadius: 'var(--radius-sm)',
      padding: '0.65rem 0.85rem', color: 'var(--primary-dark)', fontSize: '0.85rem', fontWeight: 600,
    }}>
      {message}
    </div>
  )
}

function LoginForm({ onForgot, onSuccess }: { onForgot: () => void; onSuccess: (p: AuthPayload) => void }) {
  const [showPass, setShowPass] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [login, { loading, error }] = useMutation<{ login: AuthPayload }>(LOGIN_MUTATION)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await login({ variables: { input: { email, password } } })
      if (data) onSuccess(data.login)
    } catch {
      // error state is surfaced via the `error` field from useMutation
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <FormError message={error?.message} />

      <Field label="Email" icon={Mail}>
        <input className="input" style={{ paddingLeft: 36 }} type="email" placeholder="votre@email.ci" value={email} onChange={e => setEmail(e.target.value)} required />
      </Field>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem' }}>Mot de passe</label>
          <button type="button" onClick={onForgot} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
            Mot de passe oublié ?
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
          <input className="input" style={{ paddingLeft: 36, paddingRight: 40 }} type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.25rem', opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  )
}

function RegisterForm({ onSuccess }: { onSuccess: (p: AuthPayload) => void }) {
  const [showPass, setShowPass] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [register, { loading, error }] = useMutation<{ register: AuthPayload }>(REGISTER_MUTATION)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedTerms) return
    try {
      const { data } = await register({
        variables: { input: { email, password, fullName, phone: phone || undefined } },
      })
      if (data) onSuccess(data.register)
    } catch {
      // error state is surfaced via the `error` field from useMutation
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <FormError message={error?.message} />

      <Field label="Nom complet" icon={User}>
        <input className="input" style={{ paddingLeft: 36 }} placeholder="Ex: Kouamé Jean-Baptiste" value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} />
      </Field>

      <Field label="Téléphone (optionnel)" icon={Phone}>
        <input className="input" style={{ paddingLeft: 36 }} placeholder="+225 07 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} />
      </Field>

      <Field label="Email" icon={Mail}>
        <input className="input" style={{ paddingLeft: 36 }} type="email" placeholder="votre@email.ci" value={email} onChange={e => setEmail(e.target.value)} required />
      </Field>

      <div>
        <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Mot de passe</label>
        <div style={{ position: 'relative' }}>
          <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
          <input className="input" style={{ paddingLeft: 36, paddingRight: 40 }} type={showPass ? 'text' : 'password'} placeholder="8 caractères minimum" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--fg-muted)' }}>
        <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ accentColor: 'var(--primary)', marginTop: 2 }} />
        J'accepte les <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Conditions d'utilisation</span> et la <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Politique de confidentialité</span>
      </label>

      <button type="submit" className="btn-primary" disabled={loading || !acceptedTerms} style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.25rem', opacity: loading || !acceptedTerms ? 0.6 : 1 }}>
        {loading ? 'Création...' : 'Créer mon compte'}
      </button>
    </form>
  )
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <Icon size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
        {children}
      </div>
    </div>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '85vh', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)' }} className="auth-shell">
      <div className="auth-shell-brand pattern-yupixi">
        <div className="auth-shell-brand-inner">
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', color: '#fff', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
            La marketplace ivoirienne pour tout acheter et tout vendre
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {BRAND_POINTS.map(point => (
              <div key={point.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <point.icon size={17} color="#fff" />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: '0.92rem', fontWeight: 600 }}>{point.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="auth-shell-form" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.25rem' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>{children}</div>
      </div>
    </div>
  )
}

function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email')
  const [email, setEmail] = useState('')

  return (
    <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: 700, marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Retour
      </button>
      <div className="card" style={{ padding: '2rem' }}>
        {step === 'email' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔐</div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, margin: '0 0 0.5rem' }}>Mot de passe oublié</h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>Saisissez votre email pour recevoir un lien de réinitialisation.</p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input" placeholder="votre@email.ci" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ width: '100%', padding: '0.85rem' }} onClick={() => setStep('code')}>
              Envoyer le lien
            </button>
          </>
        )}
        {step === 'code' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📩</div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, margin: '0 0 0.5rem' }}>Vérifiez vos emails</h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>Un lien de réinitialisation a été envoyé à <strong>{email || 'votre adresse email'}</strong></p>
            </div>
            <button className="btn-primary" style={{ width: '100%', padding: '0.85rem' }} onClick={() => setStep('success')}>
              J'ai réinitialisé mon mot de passe
            </button>
          </>
        )}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <ShieldCheck size={32} color="#10B981" />
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, margin: '0 0 0.5rem' }}>Mot de passe réinitialisé !</h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            <button className="btn-primary" style={{ width: '100%', padding: '0.85rem' }} onClick={onBack}>
              Se connecter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
