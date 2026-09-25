import { gql } from '@apollo/client'

// Paytic Mobile Money payment of Dilchap services (boost / credit packs).
const PAYMENT_FIELDS = 'id reference kind product listingId amount currency provider status failedReason redirectUrl simulated createdAt fulfilledAt'

export const START_PAYMENT_MUTATION = gql`
  mutation StartPayment($input: StartPaymentInput!) { startPayment(input: $input) { ${PAYMENT_FIELDS} } }
`
export const PAYMENT_QUERY = gql`
  query Payment($id: String!) { payment(id: $id) { ${PAYMENT_FIELDS} } }
`

export type PaymentProvider = 'wave' | 'orange' | 'mtn' | 'moov'
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'FULFILMENT_FAILED'
export type PaymentIntent = {
  id: string
  reference: string
  kind: 'CREDIT_PACK' | 'BOOST_PACK'
  product: string
  listingId: string | null
  amount: number
  currency: string
  provider: PaymentProvider
  status: PaymentStatus
  failedReason: string | null
  redirectUrl: string | null
  simulated: boolean
  createdAt: string
  fulfilledAt: string | null
}
export type PaymentRequest = { kind: 'CREDIT_PACK' | 'BOOST_PACK'; product: string; listingId?: string }

export const PROVIDERS: { key: PaymentProvider; method: string; label: string; hint: string }[] = [
  { key: 'wave', method: 'WAVE', label: 'Wave', hint: 'Vous confirmez dans l’application Wave' },
  { key: 'orange', method: 'ORANGE_MONEY', label: 'Orange Money', hint: 'Code de paiement via #144*82#' },
  { key: 'mtn', method: 'MTN_MOMO', label: 'MTN MoMo', hint: 'Validation sur votre téléphone' },
  { key: 'moov', method: 'MOOV_MONEY', label: 'Moov Money', hint: 'Validation sur votre téléphone' },
]

// Pending payment kept across the Wave redirect.
export const PENDING_PAYMENT_KEY = 'dilchap_pending_payment'
