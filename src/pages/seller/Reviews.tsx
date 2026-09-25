import EmptyState from '../../components/EmptyState'
import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { Star, Share2, BadgeCheck, CheckCircle2, MessageSquare, Edit3, Send, ChevronDown, ShieldCheck, MapPin, Zap, Lightbulb, ArrowRight } from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import ReviewsMobile from './ReviewsMobile'
import { formatResponseTime } from '../../graphql/reviews'
import { MY_REPUTATION_QUERY, SELLER_REVIEWS_FULL_QUERY, REPLY_TO_REVIEW_MUTATION, type Reputation, type FullReview } from '../../graphql/sellerHub'
import { formatRelativeDate } from '../../lib/format'
import type { AuthUser } from '../../graphql/auth'
import Select from '../../components/Select'

type Props = { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }
const PAGE = 5

function Stars({ value, size = 16 }: { value: number, size?: number }) {
  return <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <Star key={s} size={size} fill={s <= Math.round(value) ? 'var(--primary)' : 'none'} color={s <= Math.round(value) ? 'var(--primary)' : 'var(--border)'} />)}</span>
}

// "Avis & Réputation Vendeur" mockup — figures from myReputation, reviews
// with the seller's public replies.
export default function Reviews({ onNavigate, currentUser, onLogout }: Props) {
  const { data: repData } = useQuery<{ myReputation: Reputation }>(MY_REPUTATION_QUERY)
  const rep = repData?.myReputation
  const { data, refetch } = useQuery<{ sellerReviews: FullReview[] }>(SELLER_REVIEWS_FULL_QUERY, { variables: { sellerId: currentUser?.id ?? '' }, skip: !currentUser })
  const reviews = data?.sellerReviews ?? []
  const [filter, setFilter] = useState<'all' | 'five' | 'unanswered'>('all')
  const [sort, setSort] = useState<'recent' | 'best' | 'worst'>('recent')
  const [shown, setShown] = useState(PAGE)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [reply, { loading: replying }] = useMutation(REPLY_TO_REVIEW_MUTATION)

  const list = reviews
    .filter(r => filter === 'all' || (filter === 'five' ? r.rating === 5 : !r.reply))
    .sort((a, b) => sort === 'best' ? b.rating - a.rating : sort === 'worst' ? a.rating - b.rating : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const max = Math.max(1, ...(rep?.distribution ?? []).map(d => d.count))
  const responseTime = formatResponseTime(rep?.responseTimeMinutes)
  const checks = [
    { ok: !!rep?.isVerified, label: 'Pièce d’identité validée par Dilchap' },
    { ok: !!rep?.hasPhone, label: 'Numéro mobile renseigné' },
    { ok: (rep?.salesCount ?? 0) >= 50, label: `Plus de 50 ventes réussies (${rep?.salesCount ?? 0})` },
    { ok: (rep?.averageRating ?? 0) >= 4.5 && (rep?.reviewsCount ?? 0) >= 5, label: 'Note ≥ 4,5 sur au moins 5 avis' },
  ]
  const score = checks.filter(c => c.ok).length

  const share = async () => {
    if (!currentUser) return
    await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?seller=${currentUser.id}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const publish = (id: string) => {
    const text = (drafts[id] ?? '').trim()
    if (!text) return
    void reply({ variables: { reviewId: id, reply: text } }).then(() => { setEditing(null); setDrafts(d => ({ ...d, [id]: '' })); void refetch() })
  }

  return (
    <AccountLayout active="seller-reviews" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="md:hidden"><ReviewsMobile rep={rep} reviews={reviews} currentUser={currentUser} replying={replying} onReply={(id, text) => reply({ variables: { reviewId: id, reply: text } }).then(() => { void refetch() })} /></div>
      <div className="mx-auto hidden max-w-[1160px] pb-6 md:block">
        <div className="mb-1 flex items-center gap-2 text-label-sm uppercase"><span className="rounded bg-surface-container-high px-1.5 text-on-surface-variant">Confiance & réputation</span><span className="flex items-center gap-1 text-tertiary"><span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> Actualisé en temps réel</span></div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">Avis &amp; Réputation Vendeur</h1>
            <p className="m-0 mt-1 max-w-xl text-body-md text-on-surface-variant">Consultez les retours de vos acheteurs et renforcez votre badge de confiance pour booster vos ventes en remise en main propre.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void share()} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-container-high px-3 py-2.5 text-label-md text-on-surface"><Share2 size={16} /> {copied ? 'Lien copié !' : 'Partager mon profil public'}</button>
            <button onClick={() => document.getElementById('statut')?.scrollIntoView({ behavior: 'smooth' })} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white"><ShieldCheck size={16} /> Critères badge certifié</button>
          </div>
        </div>

        {/* Overview */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-lowest p-5">
            <div>
              <div className="text-label-md text-on-surface-variant">Note globale d'expérience</div>
              <div className="mt-2 flex items-end gap-3"><span className="text-[52px] font-extrabold leading-none text-on-surface">{rep?.reviewsCount ? rep.averageRating.toFixed(1) : '—'}</span><Stars value={rep?.averageRating ?? 0} size={20} /></div>
              <div className="mt-1 text-body-sm text-on-surface-variant">{rep?.reviewsCount ?? 0} avis d'acheteurs après échange</div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${rep?.isVerified ? 'bg-tertiary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}><BadgeCheck size={20} /></span>
              <div className="text-body-sm"><div className="font-semibold text-on-surface">{rep?.isVerified ? 'Vendeur certifié' : 'Certification en attente'}</div><div className="text-on-surface-variant">{rep?.isVerified ? 'Identité vérifiée par Dilchap' : 'Demandez la vérification de votre identité'} • {rep?.negativeCount ?? 0} avis négatif{(rep?.negativeCount ?? 0) > 1 ? 's' : ''}</div></div>
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-5">
            <div className="flex items-start justify-between">
              <div className="text-headline-sm text-on-surface">Distribution des notes</div>
              <div className="text-right text-label-sm uppercase text-on-surface-variant">Taux de satisfaction<div className="text-label-md text-tertiary">{rep?.satisfactionRate != null ? `${rep.satisfactionRate}%` : '—'}</div></div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {(rep?.distribution ?? []).map(d => (
                <div key={d.stars} className="flex items-center gap-2 text-body-sm">
                  <span className="w-8 text-on-surface-variant">{d.stars} ★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-tertiary" style={{ width: `${(d.count / max) * 100}%` }} /></div>
                  <span className="w-10 text-right text-on-surface-variant">{rep?.reviewsCount ? Math.round((d.count / rep.reviewsCount) * 100) : 0}%</span>
                </div>
              ))}
            </div>
            <p className="m-0 mt-4 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><CheckCircle2 size={15} className="text-tertiary" /> {rep?.negativeCount ? `${rep.negativeCount} évaluation(s) de 1-2 étoiles` : 'Zéro évaluation négative à ce jour'}</p>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-5">
            <div className="flex items-start justify-between"><div className="text-headline-sm text-on-surface">Critères d'excellence</div><span className="flex items-center gap-1 text-label-sm text-primary"><Zap size={13} /> Remise directe</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { icon: 'forum', v: responseTime ?? '—', label: 'Réactivité chat', sub: 'Messagerie Dilchap' },
                { icon: 'sentiment_satisfied', v: rep?.satisfactionRate != null ? `${rep.satisfactionRate}%` : '—', label: 'Satisfaction', sub: 'Avis 4 et 5 étoiles' },
                { icon: 'event_available', v: rep?.confirmedMeetups ?? 0, label: 'RDV confirmés', sub: 'Remises planifiées' },
                { icon: 'handshake', v: rep?.salesCount ?? 0, label: 'Ventes conclues', sub: 'Transactions directes' },
              ].map(c => (
                <div key={c.label} className="rounded-xl bg-surface-container-low p-2.5">
                  <div className="flex items-center justify-between"><Icon name={c.icon} size={17} className="text-tertiary" /><span className="text-label-lg text-on-surface">{c.v}</span></div>
                  <div className="mt-1 text-label-md text-on-surface">{c.label}</div>
                  <div className="text-[11px] text-on-surface-variant">{c.sub}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-surface-container-low px-3 py-2 text-body-sm"><span className="text-on-surface-variant">Lieu le plus fréquenté</span><span className="font-semibold text-on-surface">{rep?.topMeetupPlace ?? '—'}</span></div>
          </div>
        </section>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_320px]">
          {/* Reviews */}
          <section className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface-lowest p-2">
              {([['all', `Tous les avis (${reviews.length})`], ['five', `5 étoiles (${reviews.filter(r => r.rating === 5).length})`], ['unanswered', `Sans réponse (${reviews.filter(r => !r.reply).length})`]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} className={`cursor-pointer rounded-lg border-none px-3 py-1.5 text-label-md ${filter === k ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface'}`}>{l}</button>
              ))}
              <label className="ml-auto flex items-center gap-1 text-label-md text-on-surface-variant">Trier par :
                <Select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="cursor-pointer rounded-lg border-none bg-surface-container-low px-2 py-1.5 text-label-md text-on-surface outline-none">
                  <option value="recent">Plus récents d'abord</option><option value="best">Meilleures notes</option><option value="worst">Notes les plus basses</option>
                </Select>
              </label>
            </div>

            {list.length === 0 && <EmptyState icon="empty-star" fallback="star" title="Aucun avis pour le moment" text="Les acheteurs peuvent vous évaluer depuis votre profil après avoir échangé avec vous." />}
            <div className="flex flex-col gap-4">
              {list.slice(0, shown).map(r => (
                <article key={r.id} className="rounded-2xl border border-outline-variant bg-surface-lowest p-5">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="relative h-11 w-11 shrink-0">
                      <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-bold text-on-surface-variant">{r.author.avatarUrl ? <img src={r.author.avatarUrl} alt="" className="h-full w-full object-cover" /> : r.author.fullName.charAt(0)}</span>
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-solid border-surface-lowest bg-tertiary text-white"><CheckCircle2 size={9} /></span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-label-lg text-on-surface">{r.author.fullName}</span><span className="rounded bg-surface-container px-1.5 text-label-sm text-on-surface-variant">Acheteur{r.author.city ? ` • ${r.author.city}` : ''}</span></div>
                      <div className="flex items-center gap-2 text-body-sm text-on-surface-variant"><Stars value={r.rating} size={14} /> • {formatRelativeDate(r.createdAt)}</div>
                    </div>
                  </div>
                  {r.listing && (
                    <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5">
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">{r.listing.coverImageUrl && <img src={r.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                      <div className="min-w-0 flex-1 text-body-sm">
                        <div className="truncate font-semibold text-on-surface">{r.listing.title}{r.listing.condition && r.listing.condition !== 'N/A' ? ` • ${r.listing.condition}` : ''}</div>
                        <div className="text-on-surface-variant">Prix affiché <Price amount={r.listing.price} currency={r.listing.currency} /> • Remise directe</div>
                      </div>
                      <span className="shrink-0 rounded bg-surface-lowest px-2 py-0.5 text-label-sm text-on-surface">{r.listing.category.name}</span>
                    </div>
                  )}
                  {r.comment && <p className="m-0 mt-3 text-body-md text-on-surface">« {r.comment} »</p>}

                  {r.reply && editing !== r.id ? (
                    <div className="mt-3 rounded-xl border-l-4 border-solid border-l-outline-variant bg-surface-container-low p-3">
                      <div className="flex items-center justify-between text-body-sm"><span className="flex items-center gap-1 font-semibold text-on-surface"><Icon name="reply" size={15} /> Votre réponse {r.repliedAt && <span className="font-normal text-on-surface-variant">• {formatRelativeDate(r.repliedAt)}</span>}</span>
                        <button onClick={() => { setEditing(r.id); setDrafts(d => ({ ...d, [r.id]: r.reply ?? '' })) }} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-primary"><Edit3 size={13} /> Modifier</button></div>
                      <p className="m-0 mt-1 text-body-sm italic text-on-surface-variant">« {r.reply} »</p>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl bg-surface-container-low p-3">
                      <div className="mb-2 flex items-center justify-between text-body-sm"><span className="flex items-center gap-1 text-primary"><MessageSquare size={15} /> Répondre à {r.author.fullName.split(' ')[0]}</span><span className="text-on-surface-variant">Répondre renforce votre image de sérieux</span></div>
                      <textarea className="input" rows={2} value={drafts[r.id] ?? ''} onChange={e => setDrafts(d => ({ ...d, [r.id]: e.target.value }))} placeholder="Remerciez l'acheteur et renforcez votre image de sérieux…" />
                      <div className="mt-2 flex justify-end gap-2">
                        {editing === r.id && <button onClick={() => setEditing(null)} className="cursor-pointer rounded-lg border-none bg-surface-container-high px-3 py-2 text-label-md text-on-surface">Annuler</button>}
                        <button disabled={replying || !(drafts[r.id] ?? '').trim()} onClick={() => publish(r.id)} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-4 py-2 text-label-md text-white disabled:opacity-50"><Send size={15} /> Publier ma réponse</button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
            {list.length > shown && (
              <button onClick={() => setShown(s => s + PAGE)} className="mx-auto mt-5 flex cursor-pointer items-center gap-1 rounded-full border border-outline-variant bg-surface-lowest px-5 py-2.5 text-label-md text-on-surface">Afficher les {list.length - shown} autres évaluations <ChevronDown size={16} /></button>
            )}
          </section>

          {/* Aside */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-5">
              <div className="flex items-center gap-2 text-headline-sm text-on-surface"><Lightbulb size={20} className="text-primary" /> Conseils 5 étoiles</div>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Les acheteurs privilégient la transparence et la sécurité lors des remises en direct.</p>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  { icon: <MapPin size={17} />, title: 'Lieu public éclairé', text: 'Privilégiez les galeries marchandes et lieux fréquentés.' },
                  { icon: <Icon name="battery_charging_full" size={17} />, title: 'Appareils chargés à 100%', text: 'Permettez à l’acheteur de tester sur place, évitant tout malentendu.' },
                  { icon: <Zap size={17} />, title: 'Réponse en < 10 minutes', text: 'Un vendeur rapide sur le chat conclut plus vite ses remises.' },
                ].map(t => (
                  <div key={t.title} className="flex gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm"><span className="text-primary">{t.icon}</span><div><div className="font-semibold text-on-surface">{t.title}</div><div className="text-on-surface-variant">{t.text}</div></div></div>
                ))}
              </div>
              <button onClick={() => onNavigate('seller-orders')} className="mt-3 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary hover:underline">Voir mes commandes <ArrowRight size={15} /></button>
            </div>

            <div id="statut" className="rounded-2xl border border-outline-variant bg-surface-lowest p-5">
              <div className="flex items-center justify-between text-label-lg text-on-surface">Statut vendeur certifié <ShieldCheck size={19} className="text-tertiary" /></div>
              <div className="mt-3 flex items-center justify-between text-body-sm text-on-surface-variant">Critères remplis <span className="font-bold text-tertiary">{score} / {checks.length}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-tertiary" style={{ width: `${(score / checks.length) * 100}%` }} /></div>
              <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-body-sm">
                {checks.map(c => <li key={c.label} className={`flex items-start gap-2 ${c.ok ? 'text-on-surface' : 'text-on-surface-variant'}`}><CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${c.ok ? 'text-tertiary' : 'text-outline'}`} /> {c.label}</li>)}
              </ul>
              <p className="m-0 mt-3 rounded-lg bg-surface-container-low p-2.5 text-body-sm text-on-surface-variant">La certification est attribuée par l'équipe Dilchap après vérification de votre identité.</p>
            </div>
          </aside>
        </div>
      </div>
    </AccountLayout>
  )
}
