import { useState } from 'react'
import { Eye, EyeOff, Phone, Mail, Lock, User, ArrowLeft, Shield, CheckCircle } from 'lucide-react'
import Logo from '../components/Logo'

type AuthProps = {
  onNavigate: (page: any) => void
  onLogin: () => void
}

export default function Auth({ onNavigate, onLogin }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [showPass, setShowPass] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin()
    onNavigate('buyer-dashboard')
  }

  if (mode === 'forgot') {
    return <ForgotPassword onBack={() => setMode('login')} />
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Logo size="lg" />
          </div>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
            {mode === 'login' ? 'Connectez-vous à votre compte' : 'Créez votre compte gratuitement'}
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--border-subtle)', borderRadius: 10, padding: 3, marginBottom: '1.5rem' }}>
            {[
              { key: 'login', label: 'Se connecter' },
              { key: 'register', label: "S'inscrire" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setMode(t.key as any)}
                style={{
                  flex: 1, padding: '0.65rem', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                  background: mode === t.key ? 'var(--primary)' : 'transparent',
                  color: mode === t.key ? '#fff' : 'var(--fg-muted)',
                  transition: 'all 0.2s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'register' && (
              <>
                <div>
                  <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Nom complet</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                    <input className="input" style={{ paddingLeft: 36 }} placeholder="Ex: Kouamé Jean-Baptiste" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Téléphone</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                    <input className="input" style={{ paddingLeft: 36 }} placeholder="+225 07 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Je suis…</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {[
                      { key: 'buyer', label: '🛍️ Acheteur', desc: 'Je cherche des articles' },
                      { key: 'seller', label: '🏪 Vendeur', desc: 'Je vends des articles' },
                    ].map(r => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRole(r.key as any)}
                        style={{
                          flex: 1, padding: '0.75rem', border: '2px solid', borderColor: role === r.key ? 'var(--primary)' : 'var(--border)',
                          borderRadius: 'var(--radius-sm)', background: role === r.key ? 'rgba(254,0,0,0.05)' : 'var(--bg-card)',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: 'var(--fg)' }}>{r.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: 2 }}>{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                <input className="input" style={{ paddingLeft: 36 }} type="email" placeholder="votre@email.ci" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>Mot de passe</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => setMode('forgot' as any)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                <input className="input" style={{ paddingLeft: 36, paddingRight: 40 }} type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--fg-muted)' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)', marginTop: 2 }} />
                J'accepte les <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Conditions d'utilisation</span> et la <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Politique de confidentialité</span>
              </label>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.25rem' }}>
              {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>

            {/* Social login */}
            <div style={{ textAlign: 'center', color: 'var(--fg-muted)', fontSize: '0.8rem' }}>ou</div>
            <button
              type="button"
              style={{ width: '100%', border: '1.5px solid var(--border)', background: 'var(--bg-card)', borderRadius: 8, padding: '0.75rem', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span style={{ fontSize: '1.1rem' }}>📱</span>
              Continuer avec téléphone OTP
            </button>
          </form>
        </div>

        {/* Trust indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { icon: Shield, text: 'Données sécurisées' },
            { icon: CheckCircle, text: 'Inscription gratuite' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.8rem' }}>
              <item.icon size={14} color="var(--success, #10B981)" />
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email')
  const [email, setEmail] = useState('')

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontFamily: 'Nunito, sans-serif', fontWeight: 700, marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="card" style={{ padding: '2rem' }}>
          {step === 'email' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔐</div>
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, margin: '0 0 0.5rem' }}>Mot de passe oublié</h2>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>Saisissez votre email ou numéro de téléphone pour recevoir un code de réinitialisation.</p>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Email ou téléphone</label>
                <input className="input" placeholder="votre@email.ci ou +225..." value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button className="btn-primary" style={{ width: '100%', padding: '0.85rem' }} onClick={() => setStep('code')}>
                Envoyer le code
              </button>
            </>
          )}
          {step === 'code' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📲</div>
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, margin: '0 0 0.5rem' }}>Code de vérification</h2>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>Un code à 6 chiffres a été envoyé à <strong>{email || '+225 07 ****56'}</strong></p>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: '1rem' }}>
                {[0,1,2,3,4,5].map(i => (
                  <input key={i} className="input" style={{ width: 48, textAlign: 'center', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.2rem', padding: '0.6rem' }} maxLength={1} />
                ))}
              </div>
              <button className="btn-primary" style={{ width: '100%', padding: '0.85rem' }} onClick={() => setStep('success')}>
                Vérifier
              </button>
            </>
          )}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle size={32} color="#10B981" />
              </div>
              <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, margin: '0 0 0.5rem' }}>Mot de passe réinitialisé !</h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <button className="btn-primary" style={{ width: '100%', padding: '0.85rem' }} onClick={onBack}>
                Se connecter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
