import { gql } from '@apollo/client'

// Languages of the storefront (BO « Langues »): the country's default and
// the ones offered. `enabled` = ["fr"] (default): French only, no switcher.
export const SITE_LOCALES_QUERY = gql`
  query SiteLocales($country: String) { siteLocales(country: $country) { default enabled } }
`

// The member's language (null: the country's). Asked apart from `me` so an
// API without the field never breaks the session query.
export const MY_LOCALE_QUERY = gql`
  query MyLocale { me { id locale } }
`

export const UPDATE_MY_LOCALE_MUTATION = gql`
  mutation UpdateMyLocale($locale: String!) { updateMyLocale(locale: $locale) { id locale } }
`
