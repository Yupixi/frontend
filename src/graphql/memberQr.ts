import { gql } from '@apollo/client'
import type { QrFile } from './shopQr'

// « Mon QR code » and « QR code de l'annonce » (Backend
// src/modules/shop-qr/member-qr.service.ts): the member's personal QR and
// their listings', made on the first download; raw files for their own
// designs and the team's ready-to-print visuals. JSON answers.

export type QrTarget = { kind: 'MEMBER' } | { kind: 'LISTING'; listingId: string }

export type MyQrCode = {
  id: string
  code: string
  codeSpaced: string
  url: string
  kind: 'MEMBER' | 'LISTING'
  // SELF: made by the member; TEAM / BATCH: given by the Dilchap team.
  origin: 'SELF' | 'TEAM' | 'BATCH'
  assignedByTeam: boolean
  activation: 'AT_LAUNCH' | 'IMMEDIATE' | 'SCHEDULED'
  activationLabel: string
  activateAt: string | null
  status: 'ACTIVE' | 'DISABLED' | 'REVOKED'
  state: string
  stateLabel: string
  scanCount: number
  prelaunchScanCount: number
  firstScanAt: string | null
  lastScanAt: string | null
  createdAt: string
}

export type MyQrOverview = {
  kind: 'MEMBER' | 'LISTING'
  eligible: boolean
  reason: string | null
  eligibility: string | null
  // One QR per member and per listing: theirs, or the one the team gave them.
  qr: MyQrCode | null
  assignedByTeam: boolean
  targetPath: string | null
  targetName: string | null
  dailyMax: number
  usedToday: number
  pngSizes: number[]
}

export type MyQrStats = MyQrCode & {
  stats: {
    days: { day: string; scans: number; prelaunch: number }[]
    countries: { country: string; scans: number }[]
    devices: { device: 'MOBILE' | 'DESKTOP'; scans: number }[]
  }
}

export type MyQrVisual = { id: string; name: string; format: string; widthMm: number; heightMm: number; sheetable: boolean }

export const MY_QR_QUERY = gql`query MyQr($target: MyQrTargetInput!) { myQr(target: $target) }`
export const MY_QR_PREVIEW_QUERY = gql`query MyQrPreview($target: MyQrTargetInput!, $color: String, $transparent: Boolean, $logo: Boolean) { myQrPreview(target: $target, color: $color, transparent: $transparent, logo: $logo) }`
export const MY_QR_DOWNLOAD = gql`mutation MyQrDownload($input: MyQrDownloadInput!) { myQrDownload(input: $input) }`
export const MY_QR_STATS_QUERY = gql`query MyQrStats($id: ID!, $days: Int) { myQrStats(id: $id, days: $days) }`
export const MY_QR_VISUALS_QUERY = gql`query MyQrVisuals($target: MyQrTargetInput!) { myQrVisuals(target: $target) }`
export const MY_QR_VISUAL_PREVIEW_QUERY = gql`query MyQrVisualPreview($target: MyQrTargetInput!, $visualId: ID!) { myQrVisualPreview(target: $target, visualId: $visualId) }`
export const MY_QR_VISUAL_DOWNLOAD = gql`mutation MyQrVisualDownload($input: MyQrVisualInput!) { myQrVisualDownload(input: $input) }`
export const MY_LISTING_QR_CODES_QUERY = gql`query MyListingQrCodes { myListingQrCodes }`
export type MyListingQr = { listingId: string; id: string; scanCount: number; status: string }

export type { QrFile }

// WCAG contrast of a colour on white: below this a phone may not read the
// code (the server refuses it too).
export const MIN_QR_CONTRAST = 3.5
export function contrastOnWhite(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 0
  const lin = [0, 2, 4].map(i => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 1.05 / (0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2] + 0.05)
}
