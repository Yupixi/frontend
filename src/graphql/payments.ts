import { gql } from '@apollo/client'

// Paytic Mobile Money only buys credits (a pack, or a free number of
// credits); every purchase of the app is then paid in credits
// (PURCHASE_WITH_WALLET_MUTATION).
const PAYMENT_FIELDS = 'id reference kind product listingId amount credits currency provider status failedReason redirectUrl simulated createdAt fulfilledAt'

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
  // Credits bought.
  credits: number | null
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

// "Payer en crédits": `cost` taken, `credits` = balance left.
export const PURCHASE_WITH_WALLET_MUTATION = gql`
  mutation PurchaseWithWallet($input: PurchaseInput!) { purchaseWithWallet(input: $input) }
`
export type PurchaseResult = { label: string; cost: number; credits: number }
export const WALLET_BALANCE_QUERY = gql`
  query WalletBalance { myWallet { credits } walletSettings }
`
// creditValue: F CFA price of one credit; topupMin/Max: bounds of a free
// purchase, in credits (all set in the back-office).
export type WalletSettings = { creditValue: number; topupMin: number; topupMax: number }
export type WalletBalance = { myWallet: { credits: number }; walletSettings: WalletSettings }

export const PROVIDERS: { key: PaymentProvider; method: string; label: string }[] = [
  { key: 'wave', method: 'WAVE', label: 'Wave' },
  { key: 'orange', method: 'ORANGE_MONEY', label: 'Orange' },
  { key: 'mtn', method: 'MTN_MOMO', label: 'MoMo' },
  { key: 'moov', method: 'MOOV_MONEY', label: 'Flooz' },
]

// Pending payment kept across the Wave redirect.
export const PENDING_PAYMENT_KEY = 'dilchap_pending_payment'
