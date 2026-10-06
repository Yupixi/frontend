import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import BottomSheet from '../BottomSheet'
import Icon from '../Icon'
import {
  MEETUP_PLACES_QUERY, PROPOSE_MEETUP_MUTATION,
  type MeetupPlaces, type MeetupPlaceSuggestion,
} from '../../graphql/messaging'
import { distanceKm, type LatLng } from '../../lib/maps'
import { useMemberLists } from '../../lib/lists'

const MapPicker = lazy(() => import('./MapPicker'))

type Mode = 'places' | 'map' | 'here'
type Point = { lat: number; lng: number; source: 'SUGGESTED' | 'MAP' | 'CURRENT'; placeId?: string }
export type MeetupPrefill = { place?: string; placeId?: string | null; address?: string | null; lat?: number | null; lng?: number | null; scheduledAt?: string | null }

// City centres, only to open the map somewhere sensible (not meet-up
// points: those come from the Backoffice « Lieux conseillés »).
const CITY_CENTRES: Record<string, LatLng> = {
  abidjan: { lat: 5.345, lng: -4.024 },
  dakar: { lat: 14.716, lng: -17.467 },
  cotonou: { lat: 6.365, lng: 2.418 },
  ouagadougou: { lat: 12.371, lng: -1.519 },
  bamako: { lat: 12.639, lng: -8.002 },
  lome: { lat: 6.137, lng: 1.212 },
  niamey: { lat: 13.512, lng: 2.112 },
  bissau: { lat: 11.863, lng: -15.598 },
}
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const defaultWhen = () => { const d = new Date(Date.now() + 24 * 3600_000); d.setHours(15, 0, 0, 0); return localInput(d) }

// « Fixer un rendez-vous »: a « Lieu conseillé » (sorted by distance once a
// position is known), a pin on the map, or the member's position (one-shot,
// after a tap); then the name, the date and the confirmation. The point is
// shared only when the proposal is sent.
export default function MeetupSheet({ open, onClose, onSent, conversationId, otherName, listing, prefill }: {
  open: boolean
  onClose: () => void
  onSent: () => void
  conversationId: string
  otherName: string
  listing?: { city?: string | null; meetupSpot?: string | null } | null
  prefill?: MeetupPrefill | null
}) {
  const lists = useMemberLists()
  const [near, setNear] = useState<LatLng | null>(null)
  const { data } = useQuery<{ meetupPlaceSuggestions: MeetupPlaces }>(MEETUP_PLACES_QUERY, {
    variables: { conversationId, near: near ? [near] : null },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  })
  const info = data?.meetupPlaceSuggestions
  const places = info?.places ?? []
  const [propose, { loading }] = useMutation(PROPOSE_MEETUP_MUTATION)
  const [mode, setMode] = useState<Mode>('places')
  const [point, setPoint] = useState<Point | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [when, setWhen] = useState(defaultWhen)
  const [q, setQ] = useState('')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fresh form on each opening (prefilled by Aide Dilchap when asked).
  useEffect(() => {
    if (!open) return
    setError(null); setQ(''); setNear(null)
    const p = prefill
    setName(p?.place ?? listing?.meetupSpot ?? '')
    setAddress(p?.address ?? '')
    setWhen(p?.scheduledAt ? localInput(new Date(p.scheduledAt)) : defaultWhen())
    setPoint(p && typeof p.lat === 'number' && typeof p.lng === 'number'
      ? { lat: p.lat, lng: p.lng, source: p.placeId ? 'SUGGESTED' : 'MAP', placeId: p.placeId ?? undefined }
      : null)
    setMode('places')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const centre = useMemo<LatLng>(() => {
    if (point) return point
    if (places.length) return { lat: places[0].lat, lng: places[0].lng }
    return CITY_CENTRES[fold(info?.city ?? listing?.city ?? '')] ?? CITY_CENTRES.abidjan
  }, [point, places, info?.city, listing?.city])

  const pick = (p: MeetupPlaceSuggestion) => {
    setPoint({ lat: p.lat, lng: p.lng, source: 'SUGGESTED', placeId: p.id })
    setName(p.name); setAddress(p.address); setError(null)
  }
  const locate = () => {
    if (!navigator.geolocation) { setError('Votre appareil ne permet pas la localisation.'); return }
    setLocating(true); setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocating(false); setNear(p)
        setPoint({ ...p, source: 'CURRENT' })
        if (!name.trim()) setName('Ma position')
      },
      () => { setLocating(false); setError('Position introuvable : autorisez la localisation ou choisissez un lieu conseillé.') },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }
  const shown = places.filter(p => !q.trim() || fold(`${p.name} ${p.address} ${p.typeLabel}`).includes(fold(q)))
  // The point is close to a « Lieu conseillé » (or is one).
  const nearSafe = point && (point.source === 'SUGGESTED' || places.some(p => distanceKm(p, point) < 0.15))

  const submit = () => {
    if (!name.trim()) { setError('Donnez un nom au lieu (ex : centre commercial, station-service…).'); return }
    if (!when) { setError('Choisissez une date et une heure.'); return }
    setError(null)
    void propose({
      variables: {
        conversationId,
        place: name.trim(),
        scheduledAt: new Date(when).toISOString(),
        point: point && info?.enabled
          ? { lat: point.lat, lng: point.lng, source: point.source, placeId: point.placeId ?? null, address: address.trim() || null }
          : address.trim() ? { source: 'TEXT', address: address.trim() } : null,
      },
    }).then(() => { onSent(); onClose() }).catch((e: Error) => setError(e.message))
  }

  const tabs: [Mode, string, string][] = [
    ['places', 'Lieux conseillés', 'verified_user'],
    ['map', 'Sur la carte', 'map'],
    ...(info?.currentPosition ? [['here', 'Ma position', 'my_location'] as [Mode, string, string]] : []),
  ]
  const footer = (
    <div className="border-0 border-t border-solid border-outline-variant bg-surface px-4 pb-4 pt-3">
      {error && <p role="alert" className="m-0 mb-2 text-body-sm text-primary">{error}</p>}
      <button type="button" disabled={loading} onClick={submit} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3 text-label-lg text-white disabled:opacity-60">
        <Icon name="send" size={18} /> {loading ? 'Envoi…' : `Proposer à ${otherName}`}
      </button>
    </div>
  )

  return (
    <BottomSheet open={open} onClose={onClose} title="Fixer un rendez-vous" maxHeight="92dvh" maxWidth="560px" footer={footer}>
      <div className="flex flex-col gap-3">
        <p className="m-0 flex items-start gap-2 rounded-xl bg-tertiary-soft/60 px-3 py-2 text-body-sm text-on-surface"><Icon name="shield" size={17} className="mt-0.5 shrink-0 text-tertiary" /> Pour votre sécurité, préférez un lieu public plutôt que votre domicile, de jour.</p>

        {info?.enabled !== false && (
          <>
            <div role="tablist" aria-label="Choisir le lieu" className="flex gap-1 rounded-full bg-surface-container-low p-1">
              {tabs.map(([m, label, icon]) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); if (m === 'here' && point?.source !== 'CURRENT') locate() }}
                  className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-full border-none px-2 py-2 text-label-sm font-semibold ${mode === m ? 'bg-surface-lowest text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>
                  <Icon name={icon} size={16} className="shrink-0" /> <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {mode === 'places' && (
              <div className="flex flex-col gap-2">
                {places.length > 4 && (
                  <label className="flex items-center gap-2 rounded-full bg-surface-container-low px-3.5 py-2">
                    <Icon name="search" size={17} className="text-outline" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un lieu" aria-label="Chercher un lieu conseillé" className="w-full border-none bg-transparent text-body-sm text-on-surface outline-none" />
                  </label>
                )}
                {!info && <div className="space-y-2"><div className="chat-skeleton h-14 rounded-xl" /><div className="chat-skeleton h-14 rounded-xl" /></div>}
                {info && !places.length && (
                  <p className="m-0 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                    Pas encore de lieu conseillé {info.city ? `à ${info.city}` : 'ici'}. Choisissez un point sur la carte{info.currentPosition ? ' ou votre position' : ''}, ou saisissez le nom d’un lieu public{lists.meetupSpots[0] ? ` (ex : ${lists.meetupSpots[0].name})` : ''}.
                  </p>
                )}
                <ul className="m-0 flex max-h-64 list-none flex-col gap-1.5 overflow-y-auto p-0">
                  {shown.map(p => {
                    const on = point?.placeId === p.id
                    return (
                      <li key={p.id}>
                        <button type="button" onClick={() => pick(p)} aria-pressed={on}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border border-solid px-3 py-2.5 text-left ${on ? 'border-primary bg-primary-fixed/40' : 'border-outline-variant bg-surface-lowest hover:border-primary/60'}`}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tertiary-soft text-tertiary"><Icon name="verified_user" size={18} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-label-md text-on-surface"><span className="truncate">{p.name}</span>{p.closest && <span className="shrink-0 rounded bg-primary px-1.5 text-[10px] font-bold text-white">Le plus proche</span>}</span>
                            <span className="block truncate text-body-sm text-on-surface-variant">{p.typeLabel}{p.address ? ` • ${p.address}` : ''}</span>
                          </span>
                          {p.distanceKm != null && <span className="shrink-0 text-label-sm text-on-surface-variant">{p.distanceKm < 1 ? `${Math.round(p.distanceKm * 1000)} m` : `${p.distanceKm.toFixed(1)} km`}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {info?.currentPosition && !near && places.length > 1 && (
                  <button type="button" onClick={() => { locate() }} disabled={locating} className="flex cursor-pointer items-center justify-center gap-1.5 self-start rounded-full border-none bg-surface-container px-3 py-1.5 text-label-sm text-on-surface">
                    <Icon name="near_me" size={15} /> {locating ? 'Localisation…' : 'Trier par distance depuis ma position'}
                  </button>
                )}
              </div>
            )}

            {(mode === 'map' || (mode === 'here' && point?.source === 'CURRENT')) && (
              <Suspense fallback={<div className="chat-skeleton h-64 rounded-2xl" />}>
                <MapPicker
                  center={centre}
                  value={point}
                  marks={places.map(p => ({ id: p.id, point: { lat: p.lat, lng: p.lng }, name: p.name }))}
                  onPick={p => { setPoint({ ...p, source: mode === 'here' ? 'CURRENT' : 'MAP' }); if (mode === 'here') setMode('map') }}
                  onPickMark={id => { const p = places.find(x => x.id === id); if (p) pick(p) }}
                />
                <p className="m-0 text-body-sm text-on-surface-variant">Touchez la carte pour placer le point, ou un repère vert pour choisir un lieu conseillé.</p>
              </Suspense>
            )}
            {mode === 'here' && point?.source !== 'CURRENT' && (
              <p className="m-0 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant">{locating ? 'Localisation en cours…' : 'Votre position est demandée une seule fois, jamais suivie.'}</p>
            )}

            {point && !nearSafe && (
              <p className="m-0 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-body-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100"><Icon name="warning" size={17} className="mt-0.5 shrink-0" /> Ce point n’est pas un lieu conseillé : vérifiez qu’il s’agit d’un endroit public et fréquenté.</p>
            )}
          </>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
          <label className="text-label-sm text-on-surface-variant">Nom du lieu
            <input className="input mt-1" value={name} maxLength={160} onChange={e => setName(e.target.value)} placeholder={lists.meetupSpots[0] ? `Ex : ${lists.meetupSpots[0].name}` : 'Ex : centre commercial, station-service…'} />
          </label>
          <label className="text-label-sm text-on-surface-variant">Date et heure
            <input className="input mt-1" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
          </label>
        </div>
        <label className="text-label-sm text-on-surface-variant">Adresse ou repère (facultatif)
          <input className="input mt-1" value={address} maxLength={200} onChange={e => setAddress(e.target.value)} placeholder="Ex : entrée principale, à côté de la pharmacie" />
        </label>
        {point && info?.enabled && (
          <p className="m-0 flex items-start gap-2 text-body-sm text-on-surface-variant"><Icon name="lock" size={16} className="mt-0.5 shrink-0" /> Le point sur la carte sera visible seulement par {otherName} et vous, une fois la proposition envoyée.</p>
        )}
      </div>
    </BottomSheet>
  )
}
