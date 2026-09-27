import { gql } from '@apollo/client'

// Paytic Mobile Money: wallet top-ups. Every purchase of the app is then
// paid from the wallet balance (PURCHASE_WITH_WALLET_MUTATION).
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
  kind: PaymentKind
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
export type PaymentKind = 'CREDIT_PACK' | 'BOOST_PACK' | 'SHOP_SUBSCRIPTION' | 'BADGE_SUBSCRIPTION' | 'CAMPAIGN_ENTRY' | 'WALLET_TOPUP'
export type PaymentRequest = { kind: PaymentKind; product: string; listingId?: string }

// "Payer avec mon solde".
export const PURCHASE_WITH_WALLET_MUTATION = gql`
  mutation PurchaseWithWallet($input: PurchaseInput!) { purchaseWithWallet(input: $input) }
`
export type PurchaseResult = { label: string; amount: number; balance: number; credits: number }
export const WALLET_BALANCE_QUERY = gql`
  query WalletBalance { myWallet { balance credits } walletSettings }
`
export type WalletBalance = { myWallet: { balance: number; credits: number }; walletSettings: { topupMin: number; topupMax: number } }

export const PROVIDERS: { key: PaymentProvider; method: string; label: string }[] = [
  { key: 'wave', method: 'WAVE', label: 'Wave' },
  { key: 'orange', method: 'ORANGE_MONEY', label: 'Orange' },
  { key: 'mtn', method: 'MTN_MOMO', label: 'MoMo' },
  { key: 'moov', method: 'MOOV_MONEY', label: 'Flooz' },
]

// Pending payment kept across the Wave redirect.
export const PENDING_PAYMENT_KEY = 'dilchap_pending_payment'
