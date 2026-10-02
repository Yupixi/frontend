import { gql } from '@apollo/client'

// Printed QR codes of the official shops (Backend src/modules/shop-qr).

// /q/<code>: what to show (the server already counted the scan).
export const QR_LANDING_QUERY = gql`query QrLanding($code: String!) { qrLanding(code: $code) }`

export type QrLanding = {
  state: 'ACTIVE' | 'PENDING' | 'UNASSIGNED' | 'SHOP_UNAVAILABLE' | 'DISABLED' | 'REVOKED' | 'UNKNOWN'
  code: string | null
  shop: { name: string; slug: string | null; logoUrl: string | null } | null
  activateAt: string | null
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
