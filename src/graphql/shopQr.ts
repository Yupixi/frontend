import { gql } from '@apollo/client'

// Printed QR codes of the official shops, members and listings (Backend
// src/modules/shop-qr).

// /q/<code>: what to show (the server already counted the scan).
export const QR_LANDING_QUERY = gql`query QrLanding($code: String!) { qrLanding(code: $code) }`

export type QrLanding = {
  state: 'ACTIVE' | 'PENDING' | 'UNASSIGNED' | 'SHOP_UNAVAILABLE' | 'MEMBER_UNAVAILABLE' | 'LISTING_UNAVAILABLE' | 'DISABLED' | 'REVOKED' | 'UNKNOWN'
  kind: 'SHOP' | 'MEMBER' | 'LISTING' | null
  code: string | null
  // Where an active QR leads (/boutique/…, /@pseudo, /annonce/…).
  path: string | null
  shop: { name: string; slug: string | null; logoUrl: string | null } | null
  member: { name: string; avatarUrl: string | null } | null
  listing: { title: string; photo: string | null; sellerName: string | null } | null
  // A listing no longer there: its seller's page (other listings).
  seller: { name: string; path: string } | null
  activateAt: string | null
  // Only while the QR's country is still behind its launch page.
  launch: { active: boolean; launchAt: string | null; title: string; text: string; image: string } | null
}

// « Ma boutique › QR codes »: the owner's active QR codes.
export const MY_SHOP_QR_CODES_QUERY = gql`query MyShopQrCodes { myShopQrCodes }`
export const MY_SHOP_QR_DOWNLOAD_QUERY = gql`query MyShopQrDownload($format: String!, $id: ID) { myShopQrDownload(format: $format, id: $id) }`

export type MyShopQr = {
  id: string
  code: string
  codeSpaced: string
  url: string
  label: string
  activation: 'AT_LAUNCH' | 'IMMEDIATE' | 'SCHEDULED'
  activationLabel: string
  activateAt: string | null
  // The shop's country is still behind its launch page.
  launchActive?: boolean
  state: 'ACTIVE' | 'PENDING' | 'SHOP_UNAVAILABLE'
  stateLabel: string
  scanCount: number
  lastScanAt: string | null
}
export type QrFile = { filename: string; mimeType: string; base64: string }

export function saveQrFile(f: QrFile) {
  const bytes = Uint8Array.from(atob(f.base64), c => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: f.mimeType }))
  const a = document.createElement('a')
  a.href = url
  a.download = f.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
