import { useMarketCode } from '../../lib/countries'
import ListingThumb from '../../components/ListingThumb'
import PersonalizeHomeSetting from '../../components/PersonalizeHomeSetting'
import { clearInterests } from '../../lib/interests'
import { requestOpenHelp } from '../../lib/navigation'
import EmptyState from '../../components/EmptyState'
import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import { CLEAR_VIEW_HISTORY_MUTATION, REMOVE_VIEW_HISTORY_ITEM_MUTATION } from '../../graphql/account'
import { UPDATE_PREFERENCES_JSON_MUTATION } from '../../graphql/sellerTools'
import { POPULAR_SEARCHES_QUERY, type PopularSearch } from '../../graphql/categories'
import { MY_VIEW_HISTORY_FULL_QUERY, listingPlace, type HistoryEntry } from '../../graphql/buyerSpace'
import type { AuthUser } from '../../graphql/auth'
import { plainText } from '../../lib/format'
import SellerBadge from '../../components/SellerBadge'
import { useT } from '../../i18n'
import historyNs from '../../i18n/ns/history'
import common from '../../i18n/ns/common'

type Props = {
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  onContactSeller: (sellerId: string, listingId?: string) => void
  onSearch: (term: string) => void
  onSearchCategory: (slug: string) => void
  currentUser?: AuthUser | null
  onProfileUpdated: (u: AuthUser) => void
  onLogout: () => void
}

const DAY = 86_400_000
function groupOf(iso: string) {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const t = new Date(iso).getTime()
  if (t >= start.getTime()) return 'today'
  if (t >= start.getTime() - DAY) return 'yesterday'
  if (t >= start.getTime() - 6 * DAY) return 'week'
  return 'older'
}
const GROUPS = [
  { key: 'today', get label() { return historyNs.t('group.today') } },
  { key: 'yesterday', get label() { return historyNs.t('group.yesterday') } },
  { key: 'week', get label() { return historyNs.t('group.week') } },
  { key: 'older', get label() { return historyNs.t('group.older') } },
]

// "Historique de navigation" (Stitch desktop grid / mobile list).
export default function History({ onNavigate, onSelectListing, onContactSeller, onSearch, onSearchCategory, currentUser, onProfileUpdated, onLogout }: Props) {
  const t = useT(historyNs)
  const { data, loading, refetch } = useQuery<{ myViewHistory: HistoryEntry[] }>(MY_VIEW_HISTORY_FULL_QUERY, { fetchPolicy: 'cache-and-network' })
  const { data: popularData } = useQuery<{ popularSearches: PopularSearch[] }>(POPULAR_SEARCHES_QUERY, { variables: { limit: 5, countryCode: useMarketCode() ?? null } })
  const [removeItem] = useMutation(REMOVE_VIEW_HISTORY_ITEM_MUTATION)
  const [clearAll, { loading: clearing }] = useMutation(CLEAR_VIEW_HISTORY_MUTATION)
  const [updatePrefs] = useMutation<{ updateNotificationPreferences: { notificationPreferences: Record<string, unknown> } }>(UPDATE_PREFERENCES_JSON_MUTATION)
  const [q, setQ] = useState('')
  const items = data?.myViewHistory ?? []
  const prefs = (currentUser?.notificationPreferences ?? {}) as Record<string, unknown>
  const enabled = prefs.historyEnabled !== false
  const available = items.filter(i => i.listing.status === 'APPROVED').length
  const sold = items.filter(i => i.listing.status === 'SOLD').length
  const cities = new Set(items.map(i => i.listing.locationLabel ?? i.listing.city)).size

  const remove = (id: string) => void removeItem({ variables: { listingId: id } }).then(() => refetch())
  // The interest profile goes with the history (« Pour vous » starts again).
  const clear = () => { if (window.confirm(t('confirmClear'))) void clearAll().then(() => { clearInterests(); return refetch() }) }
  const toggle = () => void updatePrefs({ variables: { preferences: { historyEnabled: !enabled } } }).then(({ data: d }) => {
    if (d && currentUser) onProfileUpdated({ ...currentUser, notificationPreferences: d.updateNotificationPreferences.notificationPreferences as AuthUser['notificationPreferences'] })
  })

  return (
    <AccountLayout active="buyer-history" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <div className="flex items-center justify-between gap-3 md:flex-wrap md:items-start">
          <div className="min-w-0 max-w-xl">
            <div className="hidden items-center gap-1 text-label-sm uppercase text-primary md:flex"><Icon name="manage_search" size={15} /> {t('eyebrow')}</div>
            {/* Mobile: the account header already carries the title */}
            <h1 className="m-0 mt-1 hidden text-headline-lg text-on-surface md:block">{t('title')}</h1>
            {items.length > 0 && <p className="m-0 text-body-md text-on-surface-variant md:hidden">{t('recent', { count: items.length })}</p>}
            <p className="m-0 mt-1 hidden text-body-md text-on-surface-variant md:block">{t('intro')}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <label className="hidden cursor-pointer items-center gap-3 rounded-xl bg-surface-lowest px-3 py-2 text-label-md text-on-surface shadow-sm md:flex">
              {t('record')}
              <button role="switch" aria-checked={enabled} onClick={toggle} className={`relative h-6 w-11 cursor-pointer rounded-full border-none p-0 ${enabled ? 'bg-tertiary' : 'bg-surface-container-high'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} /></button>
            </label>
            {items.length > 0 && <button onClick={clear} disabled={clearing} className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary-fixed/60 px-3 py-2 text-label-md text-primary"><Icon name="delete_sweep" size={18} /> <span className="hidden md:inline">{t('clearAll')}</span><span className="md:hidden">{t('clear')}</span></button>}
          </div>
        </div>

        <section className="mt-4 hidden grid-cols-4 gap-3 md:grid">
          {[[t('stat.viewed'), items.length, 'visibility', 'text-on-surface'], [t('stat.available'), available, 'check_circle', 'text-tertiary'], [t('stat.sold'), sold, 'sell', 'text-on-surface'], [t('stat.places'), t('stat.areas', { count: cities }), 'location_on', 'text-primary']].map(([label, value, icon, cls]) => (
            <div key={label as string} className="flex items-start justify-between rounded-2xl bg-surface-lowest p-4 shadow-sm">
              <div><div className="text-label-sm text-on-surface-variant">{label}</div><div className={`mt-1 text-headline-md font-extrabold ${cls}`}>{value}</div></div>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant"><Icon name={icon as string} size={19} /></span>
            </div>
          ))}
        </section>
        <PersonalizeHomeSetting className="mt-4" prefs={prefs} onHelp={() => requestOpenHelp('accueil-personnalise')}
          onSaved={(p) => { if (currentUser) onProfileUpdated({ ...currentUser, notificationPreferences: p as AuthUser['notificationPreferences'] }) }} />
        {!enabled && <p className="m-0 mt-3 flex items-center gap-2 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="history_toggle_off" size={18} /> {t('disabled')}</p>}

        {loading && !data && <p className="mt-4 text-body-md text-on-surface-variant">{common.t('loading')}</p>}
        {!loading && items.length === 0 && (
          <EmptyState className="mt-4" icon="empty-history" fallback="history" tone="neutral" title={t('empty.title')} text={t('empty.text')} action={{ label: t('empty.action'), onClick: () => onNavigate('search') }} />
        )}

        {GROUPS.map(g => {
          const rows = items.filter(i => groupOf(i.viewedAt) === g.key)
          if (!rows.length) return null
          return (
            <section key={g.key} className="mt-5 md:mt-6">
              <div className="mb-2 flex items-center gap-2 md:mb-3">
                <span className={`h-2 w-2 rounded-full ${g.key === 'today' ? 'bg-primary' : 'bg-outline-variant'}`} />
                <h2 className="m-0 text-label-md uppercase tracking-wide text-on-surface-variant md:text-headline-md md:normal-case md:tracking-normal md:text-on-surface">{g.label}</h2>
                <span className="text-label-sm text-on-surface-variant md:rounded-full md:bg-surface-container md:px-2">{rows.length}<span className="max-md:hidden"> {t('listingsWord', { count: rows.length })}</span></span>
              </div>
              {/* Desktop cards */}
              <div className="hidden grid-cols-3 gap-4 md:grid lg:grid-cols-4">
                {rows.map(({ listing: l }) => {
                  const off = l.status !== 'APPROVED'
                  return (
                    <article key={l.id} className="flex flex-col overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
                      <div className="relative aspect-square overflow-hidden bg-surface-container">
                        <button onClick={() => onSelectListing(l.id)} className="absolute inset-0 block cursor-pointer border-none bg-transparent p-0"><ListingThumb listing={l} src={l.coverImageUrl} className={`h-full w-full object-cover ${off ? 'opacity-50 grayscale' : ''}`} iconSize={36} /></button>
                        {l.condition && l.condition !== 'N/A' && <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-surface-lowest/90 px-2 py-0.5 text-label-sm text-on-surface"><span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> {l.condition}</span>}
                        {off && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full bg-surface-lowest px-3 py-1 text-label-sm uppercase text-primary"><Icon name="cancel" size={14} /> {l.status === 'SOLD' ? t('itemSold') : t('unavailable')}</span>}
                        <button onClick={() => remove(l.id)} className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest text-on-surface shadow" aria-label={t('removeAria')}><Icon name="close" size={17} /></button>
                      </div>
                      <div className="flex flex-1 flex-col p-3">
                        <div className="flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name="location_on" size={13} className="text-primary" /> <span className="truncate">{listingPlace(l)}</span></div>
                        <button onClick={() => onSelectListing(l.id)} className={`mt-0.5 cursor-pointer truncate border-none bg-transparent p-0 text-left text-label-lg ${off ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{l.title}</button>
                        <p className="m-0 truncate text-body-sm text-on-surface-variant">{plainText(l.description)}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`text-headline-sm font-extrabold ${off ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}><Price amount={l.price} currency={l.currency} /></span>
                          {off ? <span className="rounded bg-surface-container px-1.5 text-label-sm text-on-surface-variant">{t('unavailable')}</span> : <SellerBadge tier={l.seller.badge} variant="pill" size={14} short />}
                        </div>
                        <div className="flex-1" />
                        {off
                          ? <button onClick={() => onSearchCategory(l.category.slug)} className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container-low py-2 text-label-md text-on-surface"><Icon name="manage_search" size={16} /> {t('similar')}</button>
                          : <button onClick={() => onContactSeller(l.seller.id, l.id)} className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container-low py-2 text-label-md text-on-surface hover:bg-surface-container"><Icon name="chat" size={16} /> {t('chat')}</button>}
                      </div>
                    </article>
                  )
                })}
              </div>
              {/* Mobile rows */}
              <div className="flex flex-col gap-2 md:hidden">
                {rows.map(({ listing: l }) => {
                  const off = l.status !== 'APPROVED'
                  return (
                    <div key={l.id} className={`flex items-center gap-3 rounded-2xl p-2.5 shadow-sm ${off ? 'bg-surface-container-low' : 'bg-surface-lowest'}`}>
                      <button onClick={() => onSelectListing(l.id)} className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border-none bg-surface-container p-0">
                        <ListingThumb listing={l} src={l.coverImageUrl} className={`h-full w-full object-cover ${off ? 'grayscale' : ''}`} />
                        {off && <span className="absolute inset-x-1 bottom-1 rounded bg-primary px-1 text-center text-label-sm uppercase text-white">{t('sold')}</span>}
                      </button>
                      <button onClick={() => onSelectListing(l.id)} className="min-w-0 flex-1 cursor-pointer border-none bg-transparent p-0 text-left">
                        <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">{!off && <SellerBadge tier={l.seller.badge} variant="pill" size={14} short />}<span className="truncate">{l.locationLabel ?? l.city}</span>{off && <span className="text-primary">{t('unavailable')}</span>}</span>
                        <span className={`block truncate text-label-lg ${off ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{l.title}</span>
                        <span className={`text-headline-sm font-extrabold ${off ? 'text-on-surface-variant' : 'text-primary'}`}><Price amount={l.price} currency={l.currency} /></span>
                        {l.negotiable && !off && <span className="ml-2 text-label-sm text-tertiary max-[360px]:hidden">{t('negotiable')}</span>}
                      </button>
                      <button onClick={() => remove(l.id)} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center self-start rounded-full border-none bg-transparent text-on-surface-variant" aria-label={t('remove')}><Icon name="close" size={18} /></button>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        <section className="mt-8 rounded-2xl bg-surface-container-low p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Icon name="manage_search" size={22} /></span>
            <div><div className="text-headline-sm text-on-surface">{t('search.title')}</div><div className="text-body-sm text-on-surface-variant">{t('search.text')}</div></div>
          </div>
          <form onSubmit={e => { e.preventDefault(); if (q.trim()) onSearch(q.trim()) }} className="mt-3 flex items-center gap-2 rounded-xl bg-surface-lowest p-1.5 shadow-sm">
            <Icon name="search" size={20} className="ml-2 text-on-surface-variant" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('search.placeholder')} aria-label={t('search.aria')} className="min-w-0 flex-1 border-none bg-transparent text-body-md text-on-surface outline-none" />
            <button type="submit" className="shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-none bg-primary px-4 py-2 text-label-md text-white">{t('search.submit')}</button>
          </form>
          {(popularData?.popularSearches.length ?? 0) > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">{t('search.popular')}
              {popularData!.popularSearches.map(p => <button key={p.term} onClick={() => onSearch(p.term)} className="cursor-pointer rounded-full border-none bg-surface-lowest px-3 py-1 text-label-sm text-on-surface">{p.term}</button>)}
            </div>
          )}
        </section>

        <section className="mt-4 hidden items-center gap-3 rounded-2xl bg-surface-container-low p-4 md:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="lock" size={20} /></span>
          <div className="flex-1"><div className="text-label-lg text-on-surface">{t('privacy.title')}</div><div className="text-body-sm text-on-surface-variant">{t('privacy.text')}</div></div>
        </section>
      </div>
    </AccountLayout>
  )
}
