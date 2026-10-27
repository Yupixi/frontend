import { gql } from '@apollo/client'
import kyc from '../i18n/ns/kyc'

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

// Labels read at each use (getters): in the page's language.
const kycDoc = (key: KycDocType, icon: string, back: boolean) => ({
  key, icon, back,
  get label() { return kyc.t(`doc.${key}.label`) },
  get sub() { return kyc.t(`doc.${key}.sub`) },
  get text() { return kyc.t(`doc.${key}.text`) },
})
export const KYC_DOCS: { key: KycDocType; icon: string; label: string; sub: string; text: string; back: boolean }[] = [
  kycDoc('CNI', 'badge', true),
  kycDoc('PASSPORT', 'menu_book', false),
  kycDoc('DRIVING_LICENSE', 'directions_car', true),
  kycDoc('RESIDENT_CARD', 'contact_emergency', true),
]

export const KYC_REJECT_LABELS: Record<KycRejectReason, string> = {
  get BLURRY() { return kyc.t('reject.BLURRY') },
  get GLARE() { return kyc.t('reject.GLARE') },
  get EXPIRED() { return kyc.t('reject.EXPIRED') },
  get NAME_MISMATCH() { return kyc.t('reject.NAME_MISMATCH') },
  get SELFIE_MISMATCH() { return kyc.t('reject.SELFIE_MISMATCH') },
  get INCOMPLETE() { return kyc.t('reject.INCOMPLETE') },
  get UNSUPPORTED_DOCUMENT() { return kyc.t('reject.UNSUPPORTED_DOCUMENT') },
  get SUSPECTED_FRAUD() { return kyc.t('reject.SUSPECTED_FRAUD') },
  get OTHER() { return kyc.t('reject.OTHER') },
}
