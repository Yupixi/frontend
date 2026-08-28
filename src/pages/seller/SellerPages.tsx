import React, { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  Plus, Eye, Heart, Package, X,
  CheckCircle, Edit3, Clock,
  Trash2, ChevronRight, ChevronDown, Upload, MapPin, Tag, Image, ArrowUp,
  Users, AlertCircle, Check,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cities } from '../../data/cities'
import { CURRENCIES, MARKETS, marketForCountry } from '../../data/markets'
import Price from '../../components/Price'
import RichTextEditor from '../../components/RichTextEditor'
import BoostRibbon from '../../components/BoostRibbon'
import { CATEGORIES_QUERY, type RemoteCategory } from '../../graphql/categories'
import {
  ATTACH_LISTING_MEDIA_MUTATION,
  CREATE_LISTING_MUTATION,
  DELETE_LISTING_MEDIA_MUTATION,
  DELETE_LISTING_MUTATION,
  MY_LISTING_QUERY,
  MY_LISTINGS_QUERY,
  SUBMIT_LISTING_FOR_REVIEW_MUTATION,
  UPDATE_LISTING_MUTATION,
  type MyListingDetail,
  type MyListingRow,
} from '../../graphql/listings'
import { getAccessToken } from '../../lib/auth'
import { uploadImages } from '../../lib/upload'
import { LISTING_OFFERS_QUERY, RESPOND_TO_OFFER_MUTATION, type RemoteOffer } from '../../graphql/offers'
import { CREATE_BOOST_MUTATION, MY_SUBSCRIPTION_QUERY, SUBSCRIBE_TO_PLAN_MUTATION, BOOST_TIERS, type RemoteMySubscription, type SubscriptionTier } from '../../graphql/promotions'
import type { AuthUser } from '../../graphql/auth'
import { AccountLayout as DashboardLayout } from '../account/AccountLayout'

// ─── SELLER DASHBOARD ───────────────────────────────────────────────────────
export function SellerDashboard({ onNavigate, currentUser, onLogout }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const { data, loading } = useQuery<{ myListings: { totalCount: number; items: MyListingRow[] } }>(MY_LISTINGS_QUERY, {
    variables: { page: 1, pageSize: 100 },
  })
  const myListings = data?.myListings.items ?? []
  const activeCount = myListings.filter(l => l.status === 'APPROVED').length
  const pendingCount = myListings.filter(l => l.status === 'PENDING_REVIEW').length
  const totalViews = myListings.reduce((sum, l) => sum + l.viewsCount, 0)
  const totalFavorites = myListings.reduce((sum, l) => sum + l.favoritesCount, 0)

  const stats = [
    { label: 'Annonces actives', value: activeCount, icon: Package, color: '#FE0000', bg: 'rgba(254,0,0,0.08)' },
    { label: 'Vues totales', value: totalViews, icon: Eye, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'En attente de validation', value: pendingCount, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Favoris reçus', value: totalFavorites, icon: Heart, color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
  ]

  const topListings = [...myListings].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 6)
  const chartData = topListings.map(l => ({ name: l.title.length > 14 ? l.title.slice(0, 14) + '…' : l.title, vues: l.viewsCount }))

  return (
    <DashboardLayout active="seller-dashboard" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Tableau de bord</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Bienvenue sur votre espace vendeur</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => onNavigate('seller-post')}>
          <Plus size={16} /> Nouvelle annonce
        </button>
      </div>

      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.6rem' }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Vues par annonce</h2>
        {!loading && chartData.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Publiez une annonce pour voir vos statistiques de vues.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FE0000" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FE0000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: "'Outfit', sans-serif" }} />
              <Area type="monotone" dataKey="vues" stroke="#FE0000" strokeWidth={2.5} fill="url(#colorViews)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: 0, fontSize: '1rem' }}>Meilleures annonces</h2>
          <button onClick={() => onNavigate('seller-listings')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            Voir tout <ChevronRight size={15} />
          </button>
        </div>
        {!loading && topListings.length === 0 && (
          <p style={{ padding: '1.25rem', color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Aucune annonce pour le moment.</p>
        )}
        {topListings.map((l, i) => (
          <div key={l.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1.25rem', borderBottom: i < topListings.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1rem', color: i < 3 ? 'var(--primary)' : 'var(--fg-muted)', width: 22, textAlign: 'center' }}>#{i + 1}</span>
            <div style={{ width: 48, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0 }}>
              {l.coverImageUrl && (
                <img src={l.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
              <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}><Price amount={l.price} /></span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={13} />{l.viewsCount}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={13} />{l.favoritesCount}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}

// ─── POST LISTING ────────────────────────────────────────────────────────────
export function PostListing({ onNavigate, currentUser, onLogout, listingId }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void, listingId?: string }) {
  const isEditing = !!listingId
  useEffect(() => {
    if (!getAccessToken()) onNavigate('auth')
  }, [onNavigate])

  const [step, setStep] = useState(1)
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [negotiable, setNegotiable] = useState(false)
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('Abidjan')
  const [countryCode, setCountryCode] = useState('CI')
  const [currency, setCurrency] = useState('XOF')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingMedia, setExistingMedia] = useState<{ id: string; url: string }[]>([])
  const [customFields, setCustomFields] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [prefilled, setPrefilled] = useState(false)

  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const categories = categoriesData?.categories ?? []
  const { data: existingData, loading: loadingExisting } = useQuery<{ myListing: MyListingDetail }>(MY_LISTING_QUERY, {
    variables: { id: listingId },
    skip: !isEditing,
  })
  const [createListing, { loading: creating }] = useMutation<{ createListing: { id: string; status: string } }>(CREATE_LISTING_MUTATION)
  const [updateListing, { loading: updating }] = useMutation<{ updateListing: { id: string; status: string } }>(UPDATE_LISTING_MUTATION)
  const [attachListingMedia, { loading: attaching }] = useMutation(ATTACH_LISTING_MEDIA_MUTATION)
  const [deleteListingMedia] = useMutation(DELETE_LISTING_MEDIA_MUTATION)
  const [submitListingForReview, { loading: submittingReview }] = useMutation(SUBMIT_LISTING_FOR_REVIEW_MUTATION)
  const [uploading, setUploading] = useState(false)
  const publishing = creating || updating || uploading || attaching || submittingReview

  // Prefill the wizard from the existing listing once both it and the
  // category list (needed to resolve requiresPrice/attributes schema) are in.
  useEffect(() => {
    if (prefilled || !isEditing) return
    const listing = existingData?.myListing
    if (!listing || categories.length === 0) return
    setCategoryId(listing.category.id)
    setSubcategoryId(listing.subcategory?.id ?? '')
    setTitle(listing.title)
    setPrice(listing.price != null ? String(listing.price) : '')
    setNegotiable(listing.negotiable)
    setDescription(listing.description)
    setCity(listing.city)
    setCountryCode(listing.countryCode)
    setCurrency(listing.currency)
    setCustomFields((listing.attributes ?? {}) as Record<string, string>)
    setExistingMedia(listing.media)
    setPrefilled(true)
  }, [existingData, categories, isEditing, prefilled])

  const steps = ['Catégorie', 'Sous-catégorie', 'Informations', 'Photos', 'Aperçu']

  const catData = categories.find(c => c.id === categoryId)
  const subData = catData?.subcategories.find(s => s.id === subcategoryId)
  const stepsCount = steps.length

  if (isEditing && loadingExisting && !prefilled) {
    return (
      <DashboardLayout active="seller-listings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--fg-muted)' }}>Chargement de l'annonce...</div>
      </DashboardLayout>
    )
  }

  if (success) {
    return (
      <DashboardLayout active={isEditing ? 'seller-listings' : 'seller-post'} onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <CheckCircle size={40} color="#10B981" />
          </div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.75rem', margin: '0 0 0.75rem' }}>{isEditing ? 'Annonce mise à jour !' : 'Annonce soumise !'}</h2>
          <p style={{ color: 'var(--fg-muted)', marginBottom: '2rem' }}>
            {isEditing
              ? 'Vos modifications ont été enregistrées.'
              : 'Votre annonce est en attente de validation par notre équipe. Elle sera visible par les acheteurs dès son approbation.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => onNavigate('seller-listings')}>Voir mes annonces</button>
            {!isEditing && (
              <button className="btn-outline" onClick={() => { setSuccess(false); setStep(1); setCategoryId(''); setSubcategoryId(''); setCustomFields({}); setImageFiles([]); setImagePreviews([]) }}>Publier une autre annonce</button>
            )}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const catSlug = catData?.slug ?? ''
  // Backend-driven per category (Category.requiresPrice) — categories like
  // Emploi/Services/Animaux/Divers don't ask for a fixed price.
  const requiresPrice = catData?.requiresPrice ?? true

  const canGoNext = () => {
    if (step === 1) return !!categoryId
    if (step === 2) return !!subcategoryId
    if (step === 3) {
      if (!title.trim() || !description.trim()) return false
      if (requiresPrice && !price) return false
      return true
    }
    if (step === 4) return true
    return true
  }

  const titlePlaceholders: Record<string, string> = {
    emploi: 'Ex: Chef de projet IT confirmé - Abidjan',
    vehicules: 'Ex: Toyota RAV4 2021 - Full options',
    immobilier: 'Ex: Villa F4 à louer - Cocody',
    mode: 'Ex: Robe été taille 38 - Très bon état',
    loisirs: 'Ex: Vélo VTT Giant 26 pouces',
    animaux: 'Ex: Chiot berger allemand à donner',
    electronique: 'Ex: iPhone 15 Pro 256Go - Très bon état',
    services: 'Ex: Cours de maths niveau collège et lycée',
    famille: 'Ex: Lit bébé avec matelas - Bon état',
    maison: 'Ex: Canapé d\'angle cuir cognac',
    'materiel-pro': 'Ex: Tracteur John Deere 2022',
    agriculture: 'Ex: Plants de tomates cerises bio',
    divers: 'Ex: Lot de livres à vendre',
  }

  const setCustomField = (key: string, value: string) => {
    setCustomFields(prev => ({ ...prev, [key]: value }))
  }

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return
    const remaining = 8 - existingMedia.length - imageFiles.length
    const picked = Array.from(files).slice(0, remaining)
    setImageFiles(prev => [...prev, ...picked])
    setImagePreviews(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (i: number) => {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i))
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const removeExistingImage = (mediaId: string) => {
    setExistingMedia(prev => prev.filter(m => m.id !== mediaId))
    void deleteListingMedia({ variables: { mediaId } }).catch(() => undefined)
  }

  const handlePublish = async () => {
    if (!catData) return
    setSubmitError(null)
    try {
      const input = {
        categoryId: catData.id,
        subcategoryId: subcategoryId || undefined,
        title: title.trim(),
        description,
        price: requiresPrice ? (price ? Number(price) : undefined) : undefined,
        currency,
        countryCode,
        city,
        negotiable,
        attributes: customFields,
      }

      let targetId: string
      if (isEditing && listingId) {
        await updateListing({ variables: { id: listingId, input } })
        targetId = listingId
      } else {
        const { data: createData } = await createListing({ variables: { input } })
        const newId = createData?.createListing?.id
        if (!newId) throw new Error('La création a échoué')
        targetId = newId
      }

      if (imageFiles.length > 0) {
        setUploading(true)
        const urls = await uploadImages(imageFiles)
        setUploading(false)
        await attachListingMedia({ variables: { listingId: targetId, urls } })
      }

      if (!isEditing) await submitListingForReview({ variables: { id: targetId } })
      setSuccess(true)
    } catch (err) {
      setUploading(false)
      setSubmitError(err instanceof Error ? err.message : (isEditing ? "La mise à jour a échoué. Réessayez." : 'La publication a échoué. Réessayez.'))
    }
  }

  return (
    <DashboardLayout active={isEditing ? 'seller-listings' : 'seller-post'} onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>{isEditing ? "Modifier l'annonce" : 'Publier une annonce'}</h1>

        <div className="seller-steps-desktop" style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', alignItems: 'center', background: 'var(--border-subtle)', borderRadius: 12, padding: '0.75rem 1rem' }}>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: step > i + 1 ? '#10B981' : step === i + 1 ? 'var(--primary)' : 'var(--border)', color: step >= i + 1 ? '#fff' : 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, flexShrink: 0 }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className="seller-step-label" style={{ fontSize: '0.85rem', fontWeight: step === i + 1 ? 700 : 500, color: step === i + 1 ? 'var(--fg)' : 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < steps.length - 1 && <div className="seller-step-line" style={{ width: 24, height: 2, background: step > i + 1 ? '#10B981' : 'var(--border)', borderRadius: 1, flexShrink: 0 }} />}
            </React.Fragment>
          ))}
        </div>
        <div className="seller-steps-mobile" style={{ display: 'none', marginBottom: '1.25rem', background: 'var(--border-subtle)', borderRadius: 10, padding: '0.6rem 1rem', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>{step}</div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: 'var(--fg)' }}>Étape {step} sur {stepsCount}</span>
          <span style={{ color: 'var(--fg-muted)', fontSize: '0.82rem', marginLeft: 'auto' }}>{steps[step - 1]}</span>
        </div>

        <div className="card postlisting-step-card" style={{ padding: '2rem' }}>
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.5rem', fontSize: '1.1rem' }}>Choisissez une catégorie</h2>
              <div className="postlisting-category-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem' }}>
                {categories.map(cat => {
                  const selected = categoryId === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setCategoryId(cat.id); setSubcategoryId(''); setStep(2) }}
                      style={{
                        border: 'none', cursor: 'pointer', borderRadius: 'var(--radius)', overflow: 'hidden',
                        background: selected ? cat.color + '15' : 'transparent',
                        outline: selected ? `2px solid ${cat.color}` : '1.5px solid var(--border)',
                        outlineOffset: -1, transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { if (!selected) e.currentTarget.style.outlineColor = cat.color + '60' }}
                      onMouseLeave={e => { if (!selected) e.currentTarget.style.outlineColor = 'var(--border)' }}
                    >
                      <div style={{ padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                          {cat.icon}
                        </div>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.82rem', color: selected ? cat.color : 'var(--fg)', textAlign: 'center', lineHeight: 1.2 }}>{cat.name}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 2 && catData && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: catData.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  {catData.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1rem' }}>{catData.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>Choisissez une sous-catégorie</div>
                </div>
              </div>
              <div className="postlisting-subcategory-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {catData.subcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => { setSubcategoryId(sub.id); setStep(3) }}
                    style={{
                      padding: '0.85rem 1.25rem', border: '1.5px solid', cursor: 'pointer', textAlign: 'left',
                      borderColor: subcategoryId === sub.id ? catData.color : 'var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: subcategoryId === sub.id ? catData.color + '0A' : 'var(--bg-card)',
                      fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: subcategoryId === sub.id ? catData.color : 'var(--fg)',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { if (subcategoryId !== sub.id) e.currentTarget.style.borderColor = catData.color + '60' }}
                    onMouseLeave={e => { if (subcategoryId !== sub.id) e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
              <button className="btn-outline" style={{ marginTop: '1.25rem' }} onClick={() => setStep(1)}>← Changer de catégorie</button>
            </div>
          )}

          {step === 3 && catData && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: catData.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  {catData.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1.05rem' }}>{catData.name}</div>
                  <div style={{ fontSize: '0.78rem', color: catData.color, fontWeight: 600 }}>{subData?.name}</div>
                </div>
              </div>

              <div className="postlisting-fields-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Titre de l'annonce *</label>
                  <input className="input" placeholder={titlePlaceholders[catSlug] || 'Ex: Titre de votre annonce'} value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: 4 }}>{title.length}/100 caractères</div>
                </div>

                {requiresPrice && (
                  <div>
                    <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Prix ({currency}) *</label>
                    <div style={{ position: 'relative' }}>
                      <Tag size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                      <input className="input" style={{ paddingLeft: 40 }} placeholder="Ex: 150 000" value={price} onChange={e => setPrice(e.target.value)} type="number" />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
                      <input type="checkbox" checked={negotiable} onChange={e => setNegotiable(e.target.checked)} style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} /> Prix négociable
                    </label>
                  </div>
                )}

                <div>
                  <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Pays</label>
                  <select className="input" value={countryCode} onChange={e => {
                    const nextCountry = e.target.value
                    setCountryCode(nextCountry)
                    const market = marketForCountry(nextCountry)
                    if (market) setCurrency(market.currency)
                  }}>
                    {MARKETS.map(market => <option key={market.countryCode} value={market.countryCode}>{market.country}</option>)}
                  </select>
                </div>

                {requiresPrice && (
                  <div>
                    <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Devise</label>
                    <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                      {CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Ville</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: catData.color }} />
                    <input className="input" style={{ paddingLeft: 40 }} list="market-cities" value={city} onChange={e => setCity(e.target.value)} />
                    <datalist id="market-cities">{cities.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>

                {catData.attributes.map(field => (
                  <div key={field.key}>
                    <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>
                      {field.label}{field.required ? ' *' : ''}
                    </label>
                    {field.type === 'SELECT' && field.options.length > 0 ? (
                      <select className="input" value={customFields[field.key] || ''} onChange={e => setCustomField(field.key, e.target.value)}>
                        <option value="">Sélectionnez...</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="input" type={field.type === 'NUMBER' ? 'number' : 'text'} placeholder={field.label} value={customFields[field.key] || ''} onChange={e => setCustomField(field.key, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Description *</label>
                <RichTextEditor content={description} onChange={onChange => setDescription(onChange)} placeholder="Décrivez votre article en détail... (gras, titres, listes, liens...)" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Ajoutez vos photos</h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>La première photo sera la photo principale. Maximum 8 photos.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                {existingMedia.map((m, i) => (
                  <div key={m.id} style={{ aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
                    <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {i === 0 && (
                      <span style={{ position: 'absolute', top: 6, left: 6, background: 'var(--primary)', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>Principale</span>
                    )}
                    <button
                      onClick={() => removeExistingImage(m.id)}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                {imagePreviews.map((src, i) => (
                  <div key={src} style={{ aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {existingMedia.length === 0 && i === 0 && (
                      <span style={{ position: 'absolute', top: 6, left: 6, background: 'var(--primary)', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>Principale</span>
                    )}
                    <button
                      onClick={() => removeImage(i)}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                {existingMedia.length + imageFiles.length < 8 && (
                  <label style={{ aspectRatio: '1', border: '2px dashed var(--primary)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', background: 'rgba(254,0,0,0.02)' }}>
                    <Upload size={28} color="var(--primary)" />
                    <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>Ajouter</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => { handleFilesSelected(e.target.files); e.target.value = '' }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {step === 5 && catData && (
            <div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.5rem', fontSize: '1.1rem' }}>Aperçu de votre annonce</h2>
              <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ height: 220, background: `linear-gradient(135deg, ${catData.color}10 0%, var(--border) 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {(existingMedia[0]?.url || imagePreviews[0]) ? (
                      <img src={existingMedia[0]?.url || imagePreviews[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Image size={48} color="var(--fg-subtle)" />
                    )}
                  </div>
                  <div style={{ padding: '1.25rem' }}>
                    {requiresPrice && <div className="price-tag" style={{ fontSize: '1.1rem' }}><Price amount={price ? parseInt(price) : 0} currency={currency} /></div>}
                    {!requiresPrice && customFields.salaire && <div className="price-tag" style={{ fontSize: '1.1rem', color: '#6366F1' }}><Price amount={Number(customFields.salaire)} currency={currency} />/mois</div>}
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '8px 0 10px', fontSize: '1.1rem' }}>{title || 'Titre de votre annonce'}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} />{city}</span>
                      <span className="badge" style={{ background: catData.color + '15', color: catData.color }}>{catData.name}</span>
                    </div>
                    <div style={{ marginTop: 12, fontSize: '0.875rem', color: 'var(--fg)', lineHeight: 1.7, maxHeight: 200, overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: description || '<em>Aucune description</em>' }} />
                  </div>
                </div>
                <div className="card" style={{ padding: '1.25rem', background: 'rgba(254,0,0,0.03)', border: '1px solid rgba(254,0,0,0.15)', alignSelf: 'start' }}>
                  {submitError && (
                    <div style={{ marginBottom: 12, padding: '0.6rem 0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.85rem', fontWeight: 600 }}>
                      {submitError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertCircle size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>{isEditing ? 'Avant d\'enregistrer' : 'Avant de publier'}</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem', color: 'var(--fg-muted)', lineHeight: 1.8 }}>
                        {isEditing ? (
                          <>
                            <li>Vos modifications seront visibles immédiatement</li>
                            <li>Le statut actuel de l'annonce est conservé</li>
                            <li>Respectez nos conditions d'utilisation</li>
                          </>
                        ) : (
                          <>
                            <li>Votre annonce sera publiée immédiatement</li>
                            <li>Elle sera visible dans les résultats de recherche</li>
                            <li>Respectez nos conditions d'utilisation</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            {step > 1 && (
              <button className="btn-outline" onClick={() => setStep(s => s - 1)}>← Précédent</button>
            )}
            {step < stepsCount ? (
              <button className="btn-primary" onClick={() => canGoNext() && setStep(s => s + 1)} disabled={!canGoNext()} style={{ opacity: canGoNext() ? 1 : 0.5 }}>Suivant →</button>
            ) : (
              <button className="btn-primary" style={{ background: '#10B981', borderColor: '#10B981', opacity: publishing ? 0.7 : 1 }} onClick={handlePublish} disabled={publishing}>
                {publishing ? (isEditing ? 'Enregistrement...' : 'Publication...') : (isEditing ? '✓ Enregistrer les modifications' : "✓ Publier l'annonce")}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// ─── MY LISTINGS ─────────────────────────────────────────────────────────────
const LISTING_STATUS_META: Record<string, { bg: string, color: string, label: string }> = {
  DRAFT: { bg: 'rgba(100,116,139,0.1)', color: '#64748B', label: 'Brouillon' },
  PENDING_REVIEW: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'En attente de validation' },
  APPROVED: { bg: 'rgba(16,185,129,0.1)', color: '#10B981', label: 'En ligne' },
  REJECTED: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', label: 'Rejetée' },
  EXPIRED: { bg: 'rgba(100,116,139,0.1)', color: '#64748B', label: 'Expirée' },
  SOLD: { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6', label: 'Vendue' },
  PAUSED: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'En pause' },
}

// Small tier picker shown under "Booster" — no payment step yet (see
// backend commit), so choosing a tier activates the boost immediately.
function BoostMenu({ listingId, onDone }: { listingId: string, onDone: () => void }) {
  const [createBoost, { loading }] = useMutation(CREATE_BOOST_MUTATION)

  const pick = (tier: string) =>
    void createBoost({ variables: { input: { listingId, tier } } }).then(() => onDone())

  return (
    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6, zIndex: 20, width: 200 }}>
      {BOOST_TIERS.map(t => (
        <button key={t.tier} disabled={loading} onClick={() => pick(t.tier)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 10px', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--fg)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span>{t.label}</span>
          <span style={{ color: 'var(--primary)' }}><Price amount={t.price} /></span>
        </button>
      ))}
    </div>
  )
}

// Lazy-loaded per row on expand rather than fetched for every listing up
// front — avoids an N+1 burst of queries when the list first renders.
function ListingOffersPanel({ listingId }: { listingId: string }) {
  const { data, loading, refetch } = useQuery<{ listingOffers: RemoteOffer[] }>(LISTING_OFFERS_QUERY, {
    variables: { listingId },
  })
  const [respondToOffer, { loading: responding }] = useMutation(RESPOND_TO_OFFER_MUTATION)
  const offers = data?.listingOffers ?? []

  const respond = (offerId: string, accept: boolean) =>
    void respondToOffer({ variables: { offerId, accept } }).then(() => refetch())

  if (loading) return <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Chargement...</div>
  if (offers.length === 0) return <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Aucune offre pour l'instant.</div>

  const statusLabel: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'En attente', color: 'var(--fg-muted)' },
    ACCEPTED: { label: 'Acceptée', color: '#10B981' },
    REJECTED: { label: 'Refusée', color: '#EF4444' },
    EXPIRED: { label: 'Expirée', color: 'var(--fg-subtle)' },
  }

  return (
    <div style={{ padding: '0.5rem 1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {offers.map(o => (
        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.75rem', background: 'var(--border-subtle)', borderRadius: 8, flexWrap: 'wrap' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', fontWeight: 800, color: 'var(--fg-muted)' }}>
            {o.buyer.avatarUrl ? <img src={o.buyer.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : o.buyer.fullName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{o.buyer.fullName}</div>
            <div className="price-tag" style={{ fontSize: '0.85rem' }}><Price amount={o.amount} /></div>
          </div>
          {o.status === 'PENDING' ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={responding} onClick={() => respond(o.id, true)} style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                <Check size={13} /> Accepter
              </button>
              <button disabled={responding} onClick={() => respond(o.id, false)} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                <X size={13} /> Refuser
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusLabel[o.status]?.color }}>{statusLabel[o.status]?.label}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function SellerListings({ onNavigate, onSelectListing, onEditListing, currentUser, onLogout }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void, onEditListing: (id: string) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const [filter, setFilter] = useState('all')
  const [expandedOffers, setExpandedOffers] = useState<string | null>(null)
  const [boostMenuFor, setBoostMenuFor] = useState<string | null>(null)
  const { data, loading, refetch } = useQuery<{ myListings: { totalCount: number; items: MyListingRow[] } }>(
    MY_LISTINGS_QUERY,
    { variables: { page: 1, pageSize: 100 } },
  )
  const [deleteListing] = useMutation(DELETE_LISTING_MUTATION)

  const myListings = data?.myListings.items ?? []
  const filtered = filter === 'all' ? myListings : myListings.filter(l => l.status === filter)

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return
    void deleteListing({ variables: { id } }).then(() => refetch())
  }

  const filterTabs = [
    { key: 'all', label: `Toutes (${myListings.length})` },
    { key: 'PENDING_REVIEW', label: `En attente (${myListings.filter(l => l.status === 'PENDING_REVIEW').length})` },
    { key: 'APPROVED', label: `En ligne (${myListings.filter(l => l.status === 'APPROVED').length})` },
    { key: 'PAUSED', label: `En pause (${myListings.filter(l => l.status === 'PAUSED').length})` },
    { key: 'REJECTED', label: `Rejetées (${myListings.filter(l => l.status === 'REJECTED').length})` },
  ]

  return (
    <DashboardLayout active="seller-listings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <BoostRibbon onNavigate={onNavigate} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Mes annonces ({myListings.length})</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Gérez vos annonces</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => onNavigate('seller-post')}>
          <Plus size={16} /> Nouvelle annonce
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--border-subtle)', borderRadius: 10, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {filterTabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{ padding: '0.55rem 1rem', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.82rem', background: filter === t.key ? 'var(--bg-card)' : 'transparent', color: filter === t.key ? 'var(--primary)' : 'var(--fg-muted)', boxShadow: filter === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'visible' }}>
        {loading && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fg-muted)' }}>Chargement...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--fg-muted)', marginBottom: '1rem' }}>Aucune annonce dans cette catégorie.</p>
            <button className="btn-primary" onClick={() => onNavigate('seller-post')}>Publier une annonce</button>
          </div>
        )}
        {filtered.map((l, i) => {
          const s = LISTING_STATUS_META[l.status] ?? LISTING_STATUS_META.DRAFT
          const offersExpanded = expandedOffers === l.id
          return (
            <div key={l.id}>
            <div className="seller-listing-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', padding: '1rem', borderBottom: offersExpanded ? 'none' : (i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none'), alignItems: 'center' }}>
              <div style={{ width: 72, height: 56, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0, cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>
                {l.coverImageUrl && (
                  <img src={l.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>
              <div className="seller-listing-content" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>{l.title}</p>
                  <span className="badge" style={{ background: s.bg, color: s.color, flexShrink: 0, fontSize: '0.72rem' }}>{s.label}</span>
                  {l.boostExpiresAt && new Date(l.boostExpiresAt) > new Date() && (
                    <span className="badge" style={{ background: 'rgba(254,0,0,0.08)', color: 'var(--primary)', flexShrink: 0, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <ArrowUp size={11} /> Boosté jusqu'au {new Date(l.boostExpiresAt).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                  <span className="price-tag" style={{ fontSize: '0.9rem' }}><Price amount={l.price} /></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={12} />{l.viewsCount}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={12} />{l.favoritesCount}</span>
                  <span>{new Date(l.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <div className="seller-listing-actions" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => onEditListing(l.id)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--fg-muted)' }}>
                  <Edit3 size={14} /> Modifier
                </button>
                <button onClick={() => handleDelete(l.id, l.title)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444' }}>
                  <Trash2 size={15} />
                </button>
                <button onClick={() => setExpandedOffers(offersExpanded ? null : l.id)} style={{ background: offersExpanded ? 'var(--border-subtle)' : 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--fg-muted)' }}>
                  <Tag size={14} /> Offres <ChevronDown size={13} style={{ transform: offersExpanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
                </button>
                {l.status === 'APPROVED' && (
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setBoostMenuFor(boostMenuFor === l.id ? null : l.id)} style={{ background: 'rgba(254,0,0,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--primary)' }}>
                      <ArrowUp size={14} /> Booster
                    </button>
                    {boostMenuFor === l.id && (
                      <BoostMenu listingId={l.id} onDone={() => { setBoostMenuFor(null); void refetch() }} />
                    )}
                  </div>
                )}
              </div>
            </div>
            {offersExpanded && (
              <div style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: 'var(--bg)' }}>
                <ListingOffersPanel listingId={l.id} />
              </div>
            )}
            </div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}

// ─── STATISTICS ────────────────────────────────────────────────────────────
export function SellerStats({ onNavigate, currentUser, onLogout }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const { data, loading } = useQuery<{ myListings: { totalCount: number; items: MyListingRow[] } }>(MY_LISTINGS_QUERY, {
    variables: { page: 1, pageSize: 100 },
  })
  const myListings = data?.myListings.items ?? []
  const activeCount = myListings.filter(l => l.status === 'APPROVED').length
  const totalViews = myListings.reduce((sum, l) => sum + l.viewsCount, 0)
  const totalFavorites = myListings.reduce((sum, l) => sum + l.favoritesCount, 0)
  const engagementRate = totalViews > 0 ? ((totalFavorites / totalViews) * 100).toFixed(1) + '%' : '—'

  const byViews = [...myListings].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 6)
    .map(l => ({ name: l.title.length > 14 ? l.title.slice(0, 14) + '…' : l.title, value: l.viewsCount }))
  const byFavorites = [...myListings].sort((a, b) => b.favoritesCount - a.favoritesCount).slice(0, 6)
    .map(l => ({ name: l.title.length > 14 ? l.title.slice(0, 14) + '…' : l.title, value: l.favoritesCount }))

  return (
    <DashboardLayout active="seller-stats" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: '0 0 0.25rem' }}>Statistiques</h1>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Analysez les performances de vos annonces</p>

      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Annonces actives', value: activeCount, icon: Package, color: '#FE0000' },
          { label: 'Vues totales', value: totalViews, icon: Eye, color: '#3B82F6' },
          { label: 'Favoris reçus', value: totalFavorites, icon: Heart, color: '#EC4899' },
          { label: "Taux d'engagement", value: engagementRate, icon: Users, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.6rem' }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Vues par annonce</h2>
          {!loading && byViews.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Aucune donnée pour le moment.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={byViews}>
                <defs>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FE0000" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FE0000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke="#FE0000" strokeWidth={2} fill="url(#gViews)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Favoris par annonce</h2>
          {!loading && byFavorites.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Aucune donnée pour le moment.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={byFavorites}>
                <defs>
                  <linearGradient id="gFavorites" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#gFavorites)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

// ─── PREMIUM ─────────────────────────────────────────────────────────────────
const PLANS: { tier: SubscriptionTier, name: string, price: number, color: string, features: string[], highlight?: boolean }[] = [
  {
    tier: 'FREE',
    name: 'Gratuit',
    price: 0,
    color: '#6B7280',
    features: ['5 annonces actives', '3 photos par annonce', 'Statistiques de base', 'Support email'],
  },
  {
    tier: 'PRO',
    name: 'Pro',
    price: 25000,
    color: '#FE0000',
    features: ['Annonces illimitées', '10 photos par annonce', 'Statistiques avancées', '3 boosts par mois', 'Badge Vendeur Pro', 'Support prioritaire', 'Mise en avant dans la recherche'],
    highlight: true,
  },
  {
    tier: 'BUSINESS',
    name: 'Business',
    price: 75000,
    color: '#8B5CF6',
    features: ['Tout ce qui est dans Pro', 'Annonces sponsorisées', '20 boosts par mois', 'Page boutique dédiée', 'API access', 'Manager dédié', 'Rapports personnalisés'],
  },
]

export function SellerPremium({ onNavigate, currentUser, onLogout }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const { data, loading, refetch } = useQuery<{ mySubscription: RemoteMySubscription }>(MY_SUBSCRIPTION_QUERY)
  const [subscribeToPlan, { loading: subscribing }] = useMutation(SUBSCRIBE_TO_PLAN_MUTATION)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const currentTier = data?.mySubscription.tier ?? 'FREE'
  const expiresAt = data?.mySubscription.expiresAt

  const choose = async (tier: SubscriptionTier) => {
    setSubscribeError(null)
    try {
      await subscribeToPlan({ variables: { tier } })
      void refetch()
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : 'Impossible de changer de plan.')
    }
  }

  return (
    <DashboardLayout active="seller-premium" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="badge badge-orange" style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>⭐ Plans Premium</div>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '2rem', margin: '0 0 0.75rem' }}>Boostez vos ventes</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '1rem' }}>Choisissez le plan qui correspond à vos besoins</p>
        {expiresAt && currentTier !== 'FREE' && (
          <p style={{ color: 'var(--fg-subtle)', fontSize: '0.8rem', marginTop: 4 }}>Actif jusqu'au {new Date(expiresAt).toLocaleDateString('fr-FR')}</p>
        )}
        {subscribeError && <p style={{ color: 'var(--primary)', fontSize: '0.85rem', marginTop: 8 }}>{subscribeError}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {PLANS.map(plan => {
          const isCurrent = plan.tier === currentTier
          return (
          <div key={plan.name} className="card" style={{ padding: '1.75rem', border: plan.highlight ? `2px solid var(--primary)` : '1px solid var(--border)', position: 'relative', transform: plan.highlight ? 'scale(1.02)' : 'none' }}>
            {plan.highlight && !isCurrent && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#fff', padding: '4px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800 }}>⭐ Le plus populaire</div>
            )}
            {isCurrent && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#6B7280', color: '#fff', padding: '4px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800 }}>Plan actuel</div>
            )}
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.2rem', color: plan.color, margin: '0 0 0.75rem' }}>{plan.name}</h2>
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: plan.price === 0 ? '1.5rem' : '2rem' }}>
                {plan.price === 0 ? 'Gratuit' : <Price amount={plan.price} />}
              </span>
              {plan.price > 0 && <span style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}> / mois</span>}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', gap: 8, fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
                  <CheckCircle size={16} color={plan.color} style={{ flexShrink: 0, marginTop: 1 }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={isCurrent ? 'btn-outline' : 'btn-primary'}
              style={{ width: '100%', padding: '0.75rem', background: isCurrent ? undefined : plan.color, borderColor: plan.color, color: isCurrent ? plan.color : '#fff' }}
              disabled={isCurrent || loading || subscribing || plan.tier === 'FREE'}
              onClick={() => void choose(plan.tier)}
            >
              {isCurrent ? 'Plan actuel' : subscribing ? 'Un instant...' : `Choisir ${plan.name}`}
            </button>
          </div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}
