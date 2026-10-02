import { CheckCircle2 } from './icons'
import type { BoostPackInfo } from '../graphql/promotions'

// What a boost formula guarantees, as the server words it from the
// back-office settings (places reserved, hour of the bump…): the page never
// adds a promise of its own.
export default function PackPromises({ info, className = '' }: { info?: BoostPackInfo, className?: string }) {
  if (!info?.promises?.length) return null
  return (
    <ul className={`m-0 flex list-none flex-col gap-1.5 p-0 text-body-sm text-on-surface ${className}`}>
      {info.promises.map(t => (
        <li key={t} className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-tertiary" /> <span>{t}</span></li>
      ))}
    </ul>
  )
}
