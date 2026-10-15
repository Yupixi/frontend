import SafeImg from './SafeImg'
import { ADULT_BLUR_CLASS, useAdultBlur } from '../lib/adult'

type Props = React.ComponentProps<typeof SafeImg> & {
  listing: { id: string; isAdult?: boolean | null } | null | undefined
}

// A listing's photo in a list (favorites, history, messages, purchases…):
// blurred when it belongs to the « Section Adultes » (lib/adult.ts).
export default function ListingThumb({ listing, className = 'h-full w-full object-cover', ...rest }: Props) {
  const blur = useAdultBlur()(listing)
  return <SafeImg {...rest} className={blur ? `${className} ${ADULT_BLUR_CLASS}` : className} />
}
