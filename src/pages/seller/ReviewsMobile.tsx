import EmptyState from '../../components/EmptyState'
import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { formatRelativeDate } from '../../lib/format'
import { formatResponseTime } from '../../graphql/reviews'
import { MY_DISPUTE_STATS_QUERY, type DisputeStats } from '../../graphql/sellerTools'
import type { FullReview, Reputation } from '../../graphql/sellerHub'
import type { AuthUser } from '../../graphql/auth'
import SellerBadge from '../../components/SellerBadge'

type Props = { rep?: Reputation; reviews: FullReview[]; currentUser?: AuthUser | null; replying?: boolean; onReply: (reviewId: string, text: string) => Promise<unknown> }

// "Avis & Réputation" (Stitch mobile): rating card, trust badges, filtered
// reviews and the WhatsApp share of the public profile.
export default function ReviewsMobile({ rep, reviews, currentUser, replying, onReply }: Props) {
  // Reply editor, as on desktop: one open review at a time.
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const openReply = (r: FullReview) => { setReplyTo(r.id); setDraft(r.reply ?? '') }
  const sendReply = (id: string) => { const text = draft.trim(); if (text) void onReply(id, text).then(() => setReplyTo(null)) }
  const { data: disputesData } = useQuery<{ myDisputeStats: DisputeStats }>(MY_DISPUTE_STATS_QUERY)
  const [filter, setFilter] = useState<'all' | 'five' | 'comment'>('all')
  const total = rep?.reviewsCount ?? 0
  const list = reviews.filter(r => filter === 'all' || (filter === 'five' ? r.rating === 5 : !!r.comment?.trim()))
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  const penalties = disputesData?.myDisputeStats.penalties ?? 0
  const response = formatResponseTime(rep?.responseTimeMinutes)
  const profileUrl = currentUser ? `${window.location.origin}${window.location.pathname}?seller=${currentUser.id}` : ''
  const badges = [
    { icon: 'schedule', title: 'Ponctuel', sub: `${rep?.confirmedMeetups ?? 0} RDV honorés` },
    { icon: 'task_alt', title: 'Conforme', sub: rep?.satisfactionRate != null ? `${Math.round(rep.satisfactionRate)}% d'avis positifs` : 'Pas encore d’avis' },
    { icon: 'bolt', title: 'Très réactif', sub: response ? `Répond en ${response}` : 'Temps de réponse à venir' },
    { icon: 'verified_user', title: penalties ? `${penalties} pénalité${penalties > 1 ? 's' : ''}` : 'Zéro litige perdu', sub: 'Paiement à la remise' },
  ]

  return (
    <div className="flex flex-col gap-4 pb-6">
      <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="relative">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary text-headline-sm text-white">{currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="h-full w-full object-cover" /> : currentUser?.fullName.charAt(0)}</span>
            {currentUser?.badge && <span className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-solid border-surface-lowest text-white ${currentUser.badge === 'CERTIFIED' ? 'bg-tertiary' : 'bg-verified'}`}><Icon name="check" size={12} /></span>}
          </span>
          <div className="min-w-0 flex-1"><div className="truncate text-headline-sm text-on-surface">{currentUser?.fullName}</div><div className="text-body-sm text-on-surface-variant">{rep?.salesCount ?? 0} vente{(rep?.salesCount ?? 0) > 1 ? 's' : ''} conclue{(rep?.salesCount ?? 0) > 1 ? 's' : ''}</div></div>
          <SellerBadge tier={currentUser?.badge} variant="pill" size={15} short />
        </div>
        <div className="mt-3 rounded-2xl bg-surface-container-low p-3">
          <div className="flex gap-3">
            <div className="flex w-28 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-lowest p-2 shadow-sm">
              <div className="text-headline-lg font-extrabold text-on-surface">{total ? rep!.averageRating.toFixed(1) : '—'}</div>
              <div className="flex">{[1, 2, 3, 4, 5].map(n => <Icon key={n} name="star" size={14} fill={n <= Math.round(rep?.averageRating ?? 0)} className="text-amber-500" />)}</div>
              <div className="text-label-sm text-on-surface-variant">{total} avis</div>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-1">
              {(rep?.distribution ?? []).map(d => (
                <div key={d.stars} className="flex items-center gap-2 text-label-sm text-on-surface">
                  <span className="w-3">{d.stars}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${pct(d.count)}%` }} /></span>
                  <span className="w-8 text-right text-on-surface-variant">{pct(d.count)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-label-md">
            <span className="flex items-center gap-1 text-tertiary"><Icon name="thumb_up" size={16} /> {rep?.satisfactionRate != null ? `${Math.round(rep.satisfactionRate)}% recommandent ce vendeur` : 'Premiers avis à venir'}</span>
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name="lock" size={14} /> Paiement direct</span>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="m-0 text-headline-sm text-on-surface">Badges de confiance</h2>{rep?.isVerified && <span className="text-label-sm text-tertiary">Identité validée</span>}</div>
        <div className="grid grid-cols-2 gap-2">
          {badges.map(b => (
            <div key={b.title} className="flex items-center gap-2 rounded-xl bg-surface-lowest p-2.5 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tertiary-soft text-tertiary"><Icon name={b.icon} size={17} /></span>
              <div className="min-w-0"><div className="truncate text-label-md text-on-surface">{b.title}</div><div className="truncate text-label-sm text-on-surface-variant">{b.sub}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* Three equal chips that always fit at 360px+ (no hidden, clipped tab). */}
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Filtrer les avis">
        {([['all', 'Tous', total, null], ['five', '5 étoiles', reviews.filter(r => r.rating === 5).length, 'star'], ['comment', 'Commentés', reviews.filter(r => r.comment?.trim()).length, 'chat']] as const).map(([k, label, n, icon]) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={`flex h-11 min-w-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl border-none px-1.5 text-label-md ${filter === k ? 'bg-inverse-surface text-white' : 'bg-surface-lowest text-on-surface shadow-sm'}`}>
            {icon && <span className="inline-flex max-[360px]:hidden"><Icon name={icon} size={15} className={filter === k ? '' : 'text-amber-500'} /></span>}{label}<span className={`rounded-full px-1.5 text-label-sm ${filter === k ? 'bg-white/20' : 'bg-surface-container'}`}>{n}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {list.length === 0 && <EmptyState icon="empty-star" fallback="star" title="Aucun avis pour ce filtre" />}
        {list.map(r => (
          <article key={r.id} className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-label-md text-primary">{r.author.avatarUrl ? <img src={r.author.avatarUrl} alt="" className="h-full w-full object-cover" /> : r.author.fullName.charAt(0)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2"><span className="truncate text-label-lg text-on-surface">{r.author.fullName}</span><span className="flex shrink-0">{[1, 2, 3, 4, 5].map(n => <Icon key={n} name="star" size={14} fill={n <= r.rating} className="text-amber-500" />)}</span></div>
                <div className="flex items-center gap-1 text-label-sm text-on-surface-variant">{r.author.city && <><Icon name="location_on" size={13} /> {r.author.city} •</>} {formatRelativeDate(r.createdAt)}</div>
              </div>
            </div>
            {r.comment && <p className="m-0 mt-2 text-body-md text-on-surface">« {r.comment} »</p>}
            {r.listing && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-label-md">
                <span className="flex min-w-0 items-center gap-1.5 text-on-surface"><Icon name="sell" size={15} className="text-primary" /><span className="truncate">{r.listing.title}</span></span>
                <span className="shrink-0 text-on-surface"><Price amount={r.listing.price} currency={r.listing.currency} /></span>
              </div>
            )}
            {replyTo === r.id ? (
              <div className="mt-2 rounded-xl bg-surface-container-low p-3">
                <textarea className="input" rows={3} autoFocus value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Remerciez ${r.author.fullName.split(' ')[0]} et renforcez votre image de sérieux…`} />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setReplyTo(null)} className="h-11 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-md text-on-surface">Annuler</button>
                  <button disabled={replying || !draft.trim()} onClick={() => sendReply(r.id)} className="flex h-11 flex-[1.4] cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary text-label-md text-white disabled:opacity-50"><Icon name="send" size={17} /> Publier</button>
                </div>
              </div>
            ) : r.reply ? (
              <div className="mt-2 rounded-lg border-0 border-l-2 border-solid border-l-primary bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
                <b className="text-on-surface">Votre réponse :</b> {r.reply}
                <button onClick={() => openReply(r)} className="ml-2 cursor-pointer border-none bg-transparent p-0 text-label-sm text-primary">Modifier</button>
              </div>
            ) : (
              <button onClick={() => openReply(r)} className="mt-2 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-solid border-primary/40 bg-transparent text-label-md text-primary"><Icon name="reply" size={17} /> Répondre</button>
            )}
          </article>
        ))}
      </div>

      <section className="rounded-2xl bg-tertiary-soft p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tertiary text-white"><Icon name="verified" size={20} /></span>
          <div><div className="text-label-lg text-on-surface">Passeport de confiance Dilchap</div><div className="text-body-sm text-on-surface-variant">Partagez votre réputation avec vos contacts</div></div>
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent(`Retrouvez ma boutique Dilchap (★ ${total ? rep!.averageRating.toFixed(1) : '—'}, ${total} avis) : ${profileUrl}`)}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-tertiary py-3 text-label-lg text-white no-underline"><Icon name="share" size={19} /> <span className="max-[380px]:hidden">Partager mon badge sur WhatsApp</span><span className="min-[380px]:hidden">Partager sur WhatsApp</span></a>
      </section>
    </div>
  )
}
