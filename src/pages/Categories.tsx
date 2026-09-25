import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon, { CategoryIcon } from '../components/Icon'
import { formatNumber } from '../lib/format'
import {
  ACTIVE_CAMPAIGNS_QUERY, CATEGORIES_QUERY, POPULAR_SEARCHES_QUERY,
  type ActiveCampaignTile, type PopularSearch, type RemoteCategory,
} from '../graphql/categories'
import type { SearchPreset } from './Home'

type CategoriesProps = {
  onNavigate: (page: any) => void
  onCategorySelect?: (slug: string) => void
  onSearch?: (term: string, preset?: SearchPreset) => void
}

const CITIES = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo']
// Tile accents cycle like the mockup (red / neutral / green).
const TONES = ['bg-primary-fixed text-primary', 'bg-primary-fixed/60 text-primary', 'bg-tertiary-soft text-tertiary', 'bg-surface-container text-on-surface', 'bg-primary-fixed text-primary', 'bg-tertiary-soft text-tertiary']
const TRUST = [
  { icon: 'verified_user', title: '0% Commission Vendeur', text: 'Gardez l’intégralité de vos gains. Vendez et achetez sans frais cachés partout en Côte d’Ivoire.', cls: 'bg-primary-fixed text-primary' },
  { icon: 'payments', title: 'Wave & Orange Money', text: 'Vous payez le vendeur directement, après avoir vérifié l’article sur place.', cls: 'bg-tertiary-soft text-tertiary' },
  { icon: 'handshake', title: 'Remise en main propre sûre', text: 'Points de rencontre publics et validation par code de remise à 4 chiffres.', cls: 'bg-primary-fixed text-primary' },
]

// "Toutes les catégories" (Stitch desktop mockup; stacks on mobile).
export default function Categories({ onNavigate, onCategorySelect, onSearch }: CategoriesProps) {
  const { data, loading } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const { data: popularData } = useQuery<{ popularSearches: PopularSearch[] }>(POPULAR_SEARCHES_QUERY, { variables: { limit: 10 } })
  const { data: campaignsData } = useQuery<{ activeCampaigns: ActiveCampaignTile[] }>(ACTIVE_CAMPAIGNS_QUERY)
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const categories = [...(data?.categories ?? [])].sort((a, b) => (b.listingsCount ?? 0) - (a.listingsCount ?? 0))
  const total = categories.reduce((n, c) => n + (c.listingsCount ?? 0), 0)
  const popular = popularData?.popularSearches ?? []
  const campaigns = (campaignsData?.activeCampaigns ?? []).slice(0, 2)
  const explore = () => onSearch?.(q.trim(), city ? { city } : undefined)

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-5 md:px-8 lg:px-12">
      {/* Hero + search */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-fixed/50 via-surface-container-low to-tertiary-soft/60 p-5 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5 text-label-sm uppercase text-primary"><Icon name="warning" size={13} /> Répertoire officiel Côte d'Ivoire</span>
            <h1 className="m-0 mt-2 text-headline-lg-mobile text-on-surface md:text-headline-lg">Explorez tout l'univers Dilchap</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Plus de {formatNumber(total)} trouvailles vérifiées et négociées entre particuliers, à Abidjan et partout en Côte d'Ivoire.</p>
          </div>
          <div className="hidden items-center gap-3 rounded-2xl bg-surface-lowest px-4 py-3 shadow-sm md:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="verified_user" size={22} /></span>
            <div><div className="text-label-lg text-on-surface">100% Sécurisé</div><div className="text-label-sm text-on-surface-variant">Wave • Orange • Main propre</div></div>
          </div>
        </div>
        <form onSubmit={e => { e.preventDefault(); explore() }} className="mt-5 flex flex-col gap-2 rounded-2xl bg-surface-lowest p-2 shadow-sm md:flex-row md:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5">
            <Icon name="search" size={19} className="text-on-surface-variant" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrer par mot-clé (ex : iPhone, Wax, Salon, Moto)…" className="w-full border-none bg-transparent text-body-md text-on-surface outline-none" />
          </label>
          <label className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 md:w-60">
            <Icon name="location_on" size={18} className="text-primary" />
            <select value={city} onChange={e => setCity(e.target.value)} className="w-full cursor-pointer border-none bg-transparent text-body-md text-on-surface outline-none">
              <option value="">Toute la Côte d'Ivoire</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button type="submit" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 py-3 text-label-md text-white hover:bg-primary-dark"><Icon name="tune" size={18} /> Explorer</button>
        </form>
      </section>

      {/* Grid */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="m-0 text-headline-md text-on-surface">Grandes Catégories <span className="ml-1 text-label-sm uppercase text-primary">{categories.length} rayons</span></h2>
          <span className="text-label-sm text-on-surface-variant">Compteurs mis à jour en direct</span>
        </div>
        {loading && <p className="text-on-surface-variant">Chargement…</p>}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <article key={cat.id} className="flex flex-col rounded-2xl bg-surface-lowest p-5 shadow-sm transition-shadow hover:shadow-card-hover">
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${TONES[i % TONES.length]}`}><CategoryIcon icon={cat.icon} size={26} /></span>
                <span className="flex items-center gap-1 rounded-full bg-surface-container-low px-2.5 py-1 text-label-sm text-on-surface"><span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> {formatNumber(cat.listingsCount ?? 0)} annonce{(cat.listingsCount ?? 0) > 1 ? 's' : ''}</span>
              </div>
              <button onClick={() => onCategorySelect?.(cat.slug)} className="mt-4 cursor-pointer border-none bg-transparent p-0 text-left text-headline-sm text-on-surface hover:text-primary">{cat.name}</button>
              {cat.description && <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{cat.description}</p>}
              {cat.subcategories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cat.subcategories.slice(0, 4).map(s => (
                    <button key={s.id} onClick={() => onCategorySelect?.(cat.slug)} className="cursor-pointer rounded-lg border-none bg-surface-container-low px-2.5 py-1 text-label-sm text-on-surface hover:bg-surface-container">{s.name}</button>
                  ))}
                  {cat.subcategories.length > 4 && <span className="px-1 py-1 text-label-sm text-on-surface-variant">+{cat.subcategories.length - 4}</span>}
                </div>
              )}
              <div className="flex-1" />
              <button onClick={() => onCategorySelect?.(cat.slug)} className="mt-4 flex w-full cursor-pointer items-center justify-between rounded-xl border-none bg-surface-container-low px-3 py-2.5 text-label-sm text-tertiary hover:bg-surface-container">
                <span className="flex items-center gap-1.5"><Icon name="verified" size={15} /> {cat.highlight ?? 'Remise en main propre sécurisée'}</span>
                <Icon name="arrow_forward" size={17} className="text-on-surface-variant" />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Campaign tiles */}
      {campaigns.length > 0 && (
        <section className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          {campaigns.map((c, i) => {
            const cover = c.listings.find(l => l.listing.coverImageUrl)?.listing.coverImageUrl
            return (
              <button key={c.id} onClick={() => onNavigate('flash-offers')} className="flex min-h-[170px] cursor-pointer overflow-hidden rounded-2xl border-none bg-surface-lowest p-0 text-left shadow-sm">
                <div className="flex flex-1 flex-col p-5">
                  <span className={`w-fit rounded px-2 py-0.5 text-label-sm uppercase ${i === 0 ? 'bg-primary-fixed text-primary' : 'bg-tertiary-soft text-tertiary'}`}>{i === 0 ? 'Top tendance' : 'Sélection Dilchap'}</span>
                  <span className="mt-2 text-headline-sm text-on-surface">{c.name}</span>
                  {c.description && <span className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">{c.description}</span>}
                  <span className="flex-1" />
                  <span className={`mt-3 flex w-fit items-center gap-1 rounded-lg px-3 py-2 text-label-sm ${i === 0 ? 'bg-inverse-surface text-white' : 'text-primary'}`}>{i === 0 ? 'Découvrir la sélection' : 'Voir les pièces'} <Icon name={i === 0 ? 'north_east' : 'arrow_forward'} size={15} /></span>
                </div>
                {cover && <img src={cover} alt="" className="hidden w-40 object-cover sm:block" />}
              </button>
            )
          })}
        </section>
      )}

      {/* Popular searches */}
      {popular.length > 0 && (
        <section className="mt-8 rounded-2xl bg-surface-container-low p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="trending_up" size={21} className="text-primary" /> Recherches les plus populaires en Côte d'Ivoire</h2>
            <span className="text-label-sm uppercase text-on-surface-variant">7 derniers jours</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {popular.map(p => (
              <button key={p.term} onClick={() => onSearch?.(p.term)} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-lowest px-3 py-2 text-label-md text-on-surface shadow-sm hover:text-primary">
                <Icon name="search" size={15} className="text-on-surface-variant" /> {p.term}
                {p.growth > 0 && <span className="rounded bg-tertiary-soft px-1 text-label-sm text-tertiary">+{p.growth}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Seller CTA */}
      <section className="mt-8 overflow-hidden rounded-3xl bg-inverse-surface p-6 text-white md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-label-sm uppercase"><Icon name="bolt" size={13} /> 0% de commission vendeur</span>
            <h2 className="m-0 mt-3 text-headline-md text-white md:text-headline-lg">Vous avez des articles qui dorment chez vous ?</h2>
            <p className="m-0 mt-2 text-body-md text-white/75">Vendez-les en 2 minutes et <b className="text-white">gardez 100% de votre prix</b>. Dilchap ne prélève rien sur vos gains : l'acheteur vous paie directement par Wave, Orange Money ou en espèces à la remise.</p>
            <div className="mt-3 flex flex-wrap gap-4 text-label-sm text-white/80">
              <span className="flex items-center gap-1"><Icon name="timer" size={15} className="text-[#6ee7b7]" /> En ligne en 2 minutes</span>
              <span className="flex items-center gap-1"><Icon name="chat" size={15} className="text-[#6ee7b7]" /> Messagerie directe</span>
              <span className="flex items-center gap-1"><Icon name="payments" size={15} className="text-[#6ee7b7]" /> Paiement sans frais</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button onClick={() => onNavigate('seller-post')} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-6 py-3 text-label-lg text-white hover:bg-primary-dark"><Icon name="add_circle" size={20} /> Déposer mon annonce</button>
            <button onClick={() => onNavigate('flash-offers')} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-white/10 px-6 py-2.5 text-label-md text-white"><Icon name="help" size={17} /> Voir les offres du moment</button>
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        {TRUST.map(t => (
          <div key={t.title} className="flex items-start gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.cls}`}><Icon name={t.icon} size={22} /></span>
            <div><div className="text-headline-sm text-on-surface">{t.title}</div><div className="text-body-sm text-on-surface-variant">{t.text}</div></div>
          </div>
        ))}
      </section>
    </div>
  )
}
