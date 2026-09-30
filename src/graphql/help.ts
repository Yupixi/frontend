import { gql } from '@apollo/client'

// Centre d’aide (BO « Aide & visites »): the member articles published for
// the visitor's country (its own version, else the general one). Each step
// is a text (HTML) and an optional screenshot, a desktop and a phone one,
// both static files of this app (public/aide/<image>).
export const HELP_ARTICLES_QUERY = gql`
  query HelpArticles($country: String) { helpArticles(country: $country) }
`

export const HELP_ARTICLE_QUERY = gql`
  query HelpArticle($key: String!, $country: String) { helpArticle(key: $key, country: $country) }
`

export type HelpStep = { title: string, body: string, image?: string | null, imageMobile?: string | null }

export type HelpArticle = {
  key: string
  section: string
  title: string
  summary: string
  order: number
  steps: HelpStep[]
}

// Keys read « member/vendre-un-article »; the address shows the last part
// (/aide/vendre-un-article).
export const helpSlugOf = (key: string) => key.replace(/^member\//, '')
export const helpKeyOf = (slug: string) => (slug.startsWith('member/') ? slug : `member/${slug}`)

// Screenshot file name → its address (public/aide); full URLs are kept.
export const helpImageUrl = (name: string) => (/^(https?:)?\//.test(name) ? name : `/aide/${name}`)

// Guided tours and « Nouveau » announcements of a signed-in member (already
// narrowed to their country): what they have seen, what's new.
export const MY_ONBOARDING_QUERY = gql`
  query MyOnboarding { myOnboarding }
`

export type Announcement = {
  id: string
  title: string
  body: string
  tourId: string | null
  imageUrl: string | null
  publishedAt: string
}

export type Onboarding = { toursSeen: string[], announcements: Announcement[] }

// A tour played (or skipped) / an announcement seen: never shown again.
export const MARK_TOUR_SEEN_MUTATION = gql`
  mutation MarkTourSeen($id: String!) { markTourSeen(id: $id) }
`

// « Revoir la visite guidée »: every tour becomes new again.
export const RESET_MY_TOURS_MUTATION = gql`
  mutation ResetMyTours { resetMyTours }
`
