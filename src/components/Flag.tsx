import { isCountryCode } from '../data/markets'

// A UEMOA flag (public/flags/*.svg): emoji flags show as letters on
// Windows. Height in px, 3:2.
export default function Flag({ code, size = 14, className = '' }: { code: string | null | undefined; size?: number; className?: string }) {
  if (!isCountryCode(code)) return null
  const w = Math.round(size * 1.5)
  return <img src={`/flags/${code.toLowerCase()}.svg`} alt="" aria-hidden width={w} height={size} className={`inline-block shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)] ${className}`} style={{ width: w, height: size }} />
}
