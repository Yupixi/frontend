import { gql } from '@apollo/client'

// Identity verification (KYC) — "Vendeur certifié" badge.
export type KycDocType = 'CNI' | 'PASSPORT' | 'DRIVING_LICENSE' | 'RESIDENT_CARD'
export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type KycPart = 'FRONT' | 'BACK' | 'SELFIE'
export type KycRejectReason = 'BLURRY' | 'GLARE' | 'EXPIRED' | 'NAME_MISMATCH' | 'SELFIE_MISMATCH' | 'INCOMPLETE' | 'UNSUPPORTED_DOCUMENT' | 'SUSPECTED_FRAUD' | 'OTHER'

export type KycSubmission = {
  id: string
  reference: string
  docType: KycDocType
  status: KycStatus
  lastName: string
  firstNames: string
  birthDate: string
  docNumber: string
  docExpiry: string
  submittedAt: string
  reviewedAt: string | null
  rejectReason: KycRejectReason | null
  rejectComment: string | null
  rejectedParts: KycPart[]
  hasBack: boolean
}
export type MyKyc = { verified: boolean; verifiedAt: string | null; latest: KycSubmission | null; retentionDays: number }

const SUBMISSION_FIELDS = 'id reference docType status lastName firstNames birthDate docNumber docExpiry submittedAt reviewedAt rejectReason rejectComment rejectedParts hasBack'

export const MY_KYC_QUERY = gql`
  query MyKyc { myKyc { verified verifiedAt retentionDays latest { ${SUBMISSION_FIELDS} } } }
`
export const SUBMIT_KYC_MUTATION = gql`
  mutation SubmitKyc($input: SubmitKycInput!) { submitKyc(input: $input) { ${SUBMISSION_FIELDS} } }
`

export const KYC_DOCS: { key: KycDocType; icon: string; label: string; sub: string; text: string; back: boolean }[] = [
  { key: 'CNI', icon: 'badge', label: 'Carte Nationale d’Identité', sub: 'CNI ivoirienne', text: 'Carte ONECI en cours de validité (nouveau ou ancien format).', back: true },
  { key: 'PASSPORT', icon: 'menu_book', label: 'Passeport', sub: 'Biométrique', text: 'Passeport ivoirien ou d’un autre pays, en cours de validité (page photo).', back: false },
  { key: 'DRIVING_LICENSE', icon: 'directions_car', label: 'Permis de conduire', sub: 'Format carte', text: 'Permis de conduire ivoirien au format carte sécurisée.', back: true },
  { key: 'RESIDENT_CARD', icon: 'contact_emergency', label: 'Carte de résident', sub: 'Titre de séjour', text: 'Carte de résident en cours de validité pour les non-nationaux.', back: true },
]

export const KYC_REJECT_LABELS: Record<KycRejectReason, string> = {
  BLURRY: 'Photo floue ou illisible',
  GLARE: 'Reflet gênant sur la pièce',
  EXPIRED: 'Pièce expirée',
  NAME_MISMATCH: 'Nom différent de celui de la pièce',
  SELFIE_MISMATCH: 'Selfie ne correspondant pas à la pièce',
  INCOMPLETE: 'Pièce incomplète (coins ou informations coupés)',
  UNSUPPORTED_DOCUMENT: 'Document non accepté',
  SUSPECTED_FRAUD: 'Document suspect',
  OTHER: 'Autre motif',
}
