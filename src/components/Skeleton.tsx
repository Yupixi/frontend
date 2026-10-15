// Grey placeholders the size of what is loading: a section that is still
// on its way takes its room at once, so nothing below it jumps when it
// lands (CLS). Static (no shimmer animation running on a phone).

const block = 'rounded-lg bg-surface-container'

// A listing card (ListingCard): photo, price, title, place, button.
export function CardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div aria-hidden className="flex flex-col overflow-hidden rounded-[12px] bg-surface-lowest shadow-sm md:rounded-2xl">
      <div className={`w-full bg-surface-container-low ${featured ? 'aspect-[260/192] md:aspect-square' : 'aspect-square'}`} />
      <div className="flex flex-col gap-1.5 p-2.5 md:p-4">
        <span className={`${block} h-5 w-1/2`} />
        <span className={`${block} h-4 w-4/5`} />
        <span className={`${block} h-3 w-2/3`} />
      </div>
      <div className="px-2.5 pb-2.5 md:px-4 md:pb-4">
        <span className={`block ${block} ${featured ? 'h-10' : 'h-7'} w-full`} />
      </div>
    </div>
  )
}

// A horizontal rail of cards (home « Pépites à la Une », campaign deals).
export function RailSkeleton({ width = 260, featured = false, title = true }: { width?: number, featured?: boolean, title?: boolean }) {
  return (
    <section aria-hidden className="mb-8">
      {title && <div className="mb-4 h-7 w-48 rounded-lg bg-surface-container" />}
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-3 pt-1 md:-mx-8 md:px-8">
        {[0, 1].map(i => <div key={i} className="shrink-0" style={{ width }}><CardSkeleton featured={featured} /></div>)}
      </div>
    </section>
  )
}

// A grid of cards (search results, home feed).
export function GridSkeleton({ count = 6, className = 'grid grid-cols-2 items-start gap-3 sm:grid-cols-3' }: { count?: number, className?: string }) {
  return (
    <div aria-hidden className={className}>
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}

// The home's « Explorer par rayon » tiles.
export function CategoryRailSkeleton() {
  return (
    <section aria-hidden className="mb-8">
      <div className="mb-4 h-7 w-44 rounded-lg bg-surface-container" />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2 pt-1 md:-mx-8 md:px-8">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
            <span className="h-16 w-16 rounded-2xl bg-surface-container" />
            <span className="h-3 w-12 rounded bg-surface-container" />
          </div>
        ))}
      </div>
    </section>
  )
}
