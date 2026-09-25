import AnimatedIcon from './AnimatedIcon'

type Props = {
  /** Lottie file in src/assets/lottie (Iconsax), e.g. "heart", "empty-search". */
  icon: string
  /** Material Symbol shown until the animation is available / with reduced motion. */
  fallback: string
  title: string
  text?: React.ReactNode
  action?: { label: string, onClick: () => void }
  tone?: 'primary' | 'neutral' | 'tertiary'
  className?: string
}

const TONES = {
  primary: 'bg-primary-fixed text-primary',
  neutral: 'bg-surface-container-high text-on-surface-variant',
  tertiary: 'bg-tertiary-soft text-tertiary',
}

// Shared empty state: an animated Iconsax icon in a soft disc that plays
// when it scrolls into view, then idles with a gentle replay every few
// seconds (and on tap), a title, an optional hint and one action.
export default function EmptyState({ icon, fallback, title, text, action, tone = 'primary', className = '' }: Props) {
  return (
    <div className={`rounded-2xl bg-surface-container-low px-6 py-8 text-center ${className}`}>
      <button type="button" aria-hidden tabIndex={-1} className={`empty-state-disc mx-auto flex h-20 w-20 cursor-default items-center justify-center rounded-full border-none ${TONES[tone]}`}>
        <AnimatedIcon name={icon} fallback={fallback} size={40} playOnView={150} playOnInteract replayEvery={4500} />
      </button>
      <p className="m-0 mt-4 text-headline-sm text-on-surface">{title}</p>
      {text && <p className="m-0 mx-auto mt-1 max-w-sm text-body-sm text-on-surface-variant">{text}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-5 cursor-pointer rounded-xl border-none bg-primary px-5 py-2.5 text-label-md text-white">{action.label}</button>
      )}
    </div>
  )
}
