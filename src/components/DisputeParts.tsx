import { useRef, useState } from 'react'
import { useMutation } from '@apollo/client/react'
import Icon from './Icon'
import { uploadImages } from '../lib/upload'
import {
  DISPUTE_REASON_ICONS, DISPUTE_REASON_LABELS, OPEN_DISPUTE_MUTATION,
  type Dispute, type DisputeReason, type DisputeStatus,
} from '../graphql/sellerTools'

// Shared pieces of the dispute screens (seller "Litiges & Signalements",
// buyer "Suivi de mon litige").

export const DISPUTE_STATUS_META: Record<DisputeStatus, { label: string; cls: string; icon: string }> = {
  AWAITING_SELLER: { label: 'Réponse vendeur attendue', cls: 'bg-primary-fixed text-primary', icon: 'timer' },
  AWAITING_BUYER: { label: "En attente de l'acheteur", cls: 'bg-surface-container-high text-on-surface', icon: 'hourglass_top' },
  IN_MEDIATION: { label: 'En cours de médiation', cls: 'bg-primary-fixed text-primary', icon: 'gavel' },
  RESOLVED_AMICABLY: { label: 'Accord amiable validé', cls: 'bg-tertiary-soft text-tertiary', icon: 'handshake' },
  CANCELLED: { label: 'Clôturé', cls: 'bg-surface-container-high text-on-surface-variant', icon: 'restart_alt' },
  REJECTED: { label: 'Rejeté', cls: 'bg-tertiary-soft text-tertiary', icon: 'gavel' },
}

export function DisputeStatusChip({ d }: { d: Dispute }) {
  const meta = DISPUTE_STATUS_META[d.status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm ${meta.cls}`}>
      <Icon name={meta.icon} size={14} /> {d.verdict ?? meta.label}
    </span>
  )
}

export function hoursLeft(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000))
}

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function DisputeTimeline({ d, perspective }: { d: Dispute; perspective: 'SELLER' | 'BUYER' }) {
  const who = { BUYER: perspective === 'BUYER' ? 'Vous' : 'Acheteur', SELLER: perspective === 'SELLER' ? 'Vous' : 'Vendeur', SYSTEM: 'Dilchap', ADMIN: 'Modération Dilchap' }
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {d.events.map((e, i) => (
        <li key={e.id} className="relative flex gap-3">
          <span className="flex flex-col items-center">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${e.actor === 'SYSTEM' || e.actor === 'ADMIN' ? 'bg-tertiary' : 'bg-primary'}`} />
            {i < d.events.length - 1 && <span className="w-px flex-1 bg-outline-variant" />}
          </span>
          <div className="min-w-0 flex-1 rounded-xl bg-surface-container-low p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className={`text-label-md ${e.actor === 'SYSTEM' || e.actor === 'ADMIN' ? 'text-tertiary' : 'text-on-surface'}`}>{e.title}</span>
              <span className="text-label-sm text-on-surface-variant">{who[e.actor]} • {fmt(e.createdAt)}</span>
            </div>
            {e.body && <p className="m-0 mt-1 whitespace-pre-line text-body-sm text-on-surface-variant">{e.body}</p>}
            {e.photos.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {e.photos.map(url => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block h-14 w-14 overflow-hidden rounded-lg bg-surface-container"><img src={url} alt="" className="h-full w-full object-cover" /></a>
                ))}
                <span className="text-label-sm text-on-surface-variant">{e.photos.length} pièce{e.photos.length > 1 ? 's' : ''} jointe{e.photos.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

// Uploads right away and keeps the resulting URLs.
export function PhotoPicker({ urls, onChange, label, max = 4 }: { urls: string[]; onChange: (u: string[]) => void; label: string; max?: number }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true); setError(null)
    try {
      const uploaded = await uploadImages(Array.from(files).slice(0, max - urls.length))
      onChange([...urls, ...uploaded])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi")
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {urls.map(u => (
          <span key={u} className="relative h-16 w-16 overflow-hidden rounded-lg bg-surface-container">
            <img src={u} alt="" className="h-full w-full object-cover" />
            <button onClick={() => onChange(urls.filter(x => x !== u))} className="absolute right-0.5 top-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-black/60 p-0 text-white" aria-label="Retirer"><Icon name="close" size={13} /></button>
          </span>
        ))}
      </div>
      {urls.length < max && (
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-lowest px-3 py-3 text-left hover:bg-surface-container-low">
          <Icon name={busy ? 'progress_activity' : 'add_photo_alternate'} size={22} className={`text-primary ${busy ? 'animate-spin' : ''}`} />
          <span className="flex-1 text-label-md text-on-surface">{label}</span>
          <span className="rounded bg-surface-container px-1.5 text-label-sm text-on-surface-variant">JPG, PNG</span>
        </button>
      )}
      {error && <p className="m-0 mt-1 text-body-sm text-primary">{error}</p>}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={e => { void pick(e.target.files); e.target.value = '' }} />
    </div>
  )
}

export function MediationCard({ whatsapp, compact }: { whatsapp: string | null; compact?: boolean }) {
  const digits = whatsapp?.replace(/[^\d]/g, '')
  return (
    <div className="rounded-2xl bg-inverse-surface p-5 text-white">
      <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/25 px-2.5 py-1 text-label-sm text-[#6ee7b7]"><Icon name="support_agent" size={14} /> Permanence Modération 7j/7 • 08h - 22h</span>
      <h3 className="m-0 mt-3 text-headline-sm text-white">Ligne Prioritaire d'Urgence &amp; Médiation P2P</h3>
      {!compact && <p className="m-0 mt-1 text-body-sm text-white/70">En cas d'incident critique sur votre point de rendez-vous, notre équipe de modération intervient par WhatsApp.</p>}
      {whatsapp ? (
        <>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <Icon name="chat" size={22} className="text-[#6ee7b7]" />
            <div className="flex-1">
              <div className="text-label-sm text-white/60">WhatsApp Modération Dilchap</div>
              <div className="text-headline-sm text-white">{whatsapp}</div>
            </div>
            <span className="rounded bg-tertiary px-1.5 py-0.5 text-label-sm text-white">Actif</span>
          </div>
          <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-tertiary px-4 py-3 text-label-md text-white no-underline hover:opacity-90">
            <Icon name="call" size={18} /> Joindre un médiateur d'astreinte
          </a>
        </>
      ) : (
        <p className="m-0 mt-3 text-body-sm text-white/70">Le numéro de médiation n'est pas encore configuré.</p>
      )}
    </div>
  )
}

// "Signaler un litige" — either side of a sale opens a dispute on it.
export function OpenDisputeModal({ conversationId, perspective, onClose, onOpened }: {
  conversationId: string; perspective: 'SELLER' | 'BUYER'; onClose: () => void; onOpened: (d: Dispute) => void
}) {
  const reasons: DisputeReason[] = perspective === 'SELLER'
    ? ['FAKE_PAYMENT', 'NO_SHOW', 'LATE', 'OTHER']
    : ['NOT_AS_DESCRIBED', 'NO_SHOW', 'LATE', 'FAKE_PAYMENT', 'OTHER']
  const [reason, setReason] = useState<DisputeReason>(reasons[0])
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [open, { loading, error }] = useMutation<{ openDispute: Dispute }>(OPEN_DISPUTE_MUTATION)
  const submit = () => void open({ variables: { input: { conversationId, reason, description: description.trim(), photos } } })
    .then(r => r.data && onOpened(r.data.openDispute))
  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface-lowest p-5 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="report_problem" size={22} className="text-primary" /> Signaler un litige</h3>
          <button onClick={onClose} className="flex cursor-pointer border-none bg-transparent p-1 text-on-surface-variant" aria-label="Fermer"><Icon name="close" size={22} /></button>
        </div>
        <div className="mt-4 text-label-sm uppercase text-on-surface-variant">Motif</div>
        <div className="mt-2 flex flex-col gap-2">
          {reasons.map(r => (
            <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${reason === r ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant'}`}>
              <input type="radio" checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--primary)]" />
              <Icon name={DISPUTE_REASON_ICONS[r]} size={18} className="text-primary" />
              <span className="text-label-md text-on-surface">{DISPUTE_REASON_LABELS[r]}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 text-label-sm uppercase text-on-surface-variant">Description</div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Décrivez précisément ce qui s'est passé au point de remise…" className="mt-2 w-full resize-none rounded-xl border border-outline-variant bg-surface-lowest p-3 text-body-md text-on-surface outline-none focus:border-primary" />
        <div className="mt-3"><PhotoPicker urls={photos} onChange={setPhotos} label="Ajouter des photos (preuves)" /></div>
        {error && <p className="m-0 mt-2 text-body-sm text-primary">{error.message}</p>}
        <button onClick={submit} disabled={loading || description.trim().length < 5} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-4 py-3 text-label-md text-white disabled:opacity-60">
          <Icon name="send" size={18} /> Envoyer le signalement
        </button>
        <p className="m-0 mt-2 text-center text-label-sm text-on-surface-variant">Aucun paiement ne doit être effectué tant que le litige n'est pas résolu.</p>
      </div>
    </div>
  )
}

export const ANTI_FRAUD_RULES = [
  { icon: 'phonelink_lock', title: '1. Solde réel In-App', text: "Ne jamais céder l'article sur présentation d'un simple SMS. Vérifiez toujours le crédit effectif dans votre application Wave ou Orange Money." },
  { icon: 'store', title: '2. Zones sécurisées', text: 'Privilégiez les galeries marchandes éclairées et sous vidéosurveillance (Playce, Cap Sud, Sococé, Cosmos Yopougon).' },
  { icon: 'verified_user', title: '3. Code de validation', text: "Exigez le code de remise à 4 chiffres de l'acheteur, affiché sur son application Dilchap, avant de clôturer la vente." },
]
