import Icon from './Icon'
import { useMethods } from '../lib/countries'

// Official Mobile Money brand marks (public/payments): Orange Money and MTN
// from Wikimedia Commons (orange-money-mark.svg = the two arrows of the
// official logo, for small tiles), Wave and Moov Africa from their websites.
// Methods without a logo file show their initials (`mark`).
export const PAYMENT_BRANDS: Record<string, { label: string; src?: string; mark?: string; tile: string; fit: string }> = {
  WAVE: { label: 'Wave', src: '/payments/wave.png', tile: 'bg-[#1DC8FF]', fit: 'h-full w-full object-cover' },
  ORANGE_MONEY: { label: 'Orange Money', src: '/payments/orange-money-mark.svg', tile: 'bg-white', fit: 'h-[74%] w-[74%] object-contain' },
  MTN_MOMO: { label: 'MTN MoMo', src: '/payments/mtn.svg', tile: 'bg-[#FFCB05]', fit: 'h-[80%] w-[80%] object-contain' },
  MOOV_MONEY: { label: 'Moov Money', src: '/payments/moov.png', tile: 'bg-white', fit: 'h-[72%] w-[72%] object-contain' },
  FREE_MONEY: { label: 'Free Money', mark: 'FM', tile: 'bg-surface-container text-on-surface', fit: '' },
  T_MONEY: { label: 'T-Money', mark: 'T', tile: 'bg-surface-container text-on-surface', fit: '' },
  AIRTEL_MONEY: { label: 'Airtel Money', mark: 'AM', tile: 'bg-surface-container text-on-surface', fit: '' },
  CASH: { label: 'Espèces', tile: 'bg-tertiary-soft text-tertiary', fit: '' },
}

export const paymentLabel = (method: string) => PAYMENT_BRANDS[method]?.label ?? method

export default function PaymentLogo({ method, size = 32, className = '' }: { method: string; size?: number; className?: string }) {
  const brand = PAYMENT_BRANDS[method]
  if (!brand) return <span className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant ${className}`} style={{ width: size, height: size }}><Icon name="account_balance_wallet" size={size * 0.6} /></span>
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-solid border-outline-variant/60 ${brand.tile} ${className}`}
      style={{ width: size, height: size }}
      title={brand.label}
    >
      {brand.src ? <img src={brand.src} alt={brand.label} className={brand.fit} loading="lazy" />
        : brand.mark ? <span aria-label={brand.label} className="font-extrabold leading-none" style={{ fontSize: Math.round(size * (brand.mark.length > 1 ? 0.36 : 0.5)) }}>{brand.mark}</span>
        : <Icon name="payments" size={size * 0.6} />}
    </span>
  )
}

// Row of accepted Mobile Money logos (+ optional cash).
export function PaymentLogos({ methods = ['WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'MOOV_MONEY'], size = 24, className = '' }: { methods?: string[]; size?: number; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {methods.map((m) => <PaymentLogo key={m} method={m} size={size} />)}
    </span>
  )
}

// Mobile wallets of the visitor's country (a few of every country for « Tous les pays »).
export function useMobileMethods(max = 2): string[] {
  return useMethods().filter(m => m !== 'CASH').slice(0, max)
}
