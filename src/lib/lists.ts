import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { useMemo } from 'react'
import type { DisputeReason } from '../graphql/sellerTools'
import { countryVars, useCountries, useCountry, useMarketCode, useMemberCountryCode } from './countries'

// Choices offered in forms, edited in the back-office (« Listes de
// référence », Backend content/reference-lists.ts). DEFAULT_LISTS mirrors
// the backend defaults so forms are complete while the query loads. The BO
// can keep one version per country: `country` picks it (none = general).
export const REFERENCE_LISTS_QUERY = gql`
  query ReferenceLists($country: String) { referenceLists(country: $country) }
`

export type ReferenceLists = {
  // Places come from the country (« Pays »), see useLists.
  cities: string[]
  communes: string[]
  meetupSpots: { name: string, sub: string }[]
  // City split into the `communes` ('' for « Tous les pays »).
  mainCity: string
  conditions: { value: string, hint: string, icon: string }[]
  rejectReasons: string[]
  reportReasons: { listing: string[], user: string[], shop: string[] }
  disputeReasons: Record<DisputeReason, { label: string, hint: string }>
  quickReplies: { buyer: string[], seller: string[] }
}

export const DEFAULT_LISTS: ReferenceLists = {
  cities: [],
  communes: [],
  meetupSpots: [],
  mainCity: '',
  conditions: [
    { value: 'Neuf', hint: 'Jamais utilisé, avec emballage d’origine', icon: 'new_releases' },
    { value: 'Très bon état', hint: 'Peu utilisé, micro-traces éventuelles', icon: 'thumb_up' },
    { value: 'Bon état', hint: 'Traces d’usage normales, fonctionnel', icon: 'check' },
    { value: 'Pour pièces', hint: 'Défaut technique ou à restaurer', icon: 'build' },
  ],
  rejectReasons: [
    'Photos non conformes ou floues', 'Suspicion de contrefaçon', 'Prix anormal / appât', 'Description insuffisante ou trompeuse',
    'Article interdit sur Dilchap', 'Mauvaise catégorie', 'Doublon d’une annonce existante', 'Coordonnées dans les photos ou le texte',
  ],
  reportReasons: {
    listing: ['Prix suspect', 'Annonce frauduleuse', 'Tentative d’arnaque', 'Contenu inapproprié', 'Article déjà vendu', 'Autre'],
    user: ['Tentative d’arnaque', 'Faux profil', 'Comportement inapproprié', 'Article non conforme', 'Autre'],
    shop: ['Contrefaçon', 'Tentative d’arnaque', 'Informations trompeuses', 'Comportement inapproprié', 'Autre'],
  },
  disputeReasons: {
    FAKE_PAYMENT: { label: 'Tentative d’arnaque faux SMS (Mobile Money)', hint: 'Capture ou SMS de paiement falsifié, aucun crédit reçu.' },
    NOT_AS_DESCRIBED: { label: 'Non-conformité présumée de l’article', hint: 'Rayures, casse non déclarée, composants défectueux au test.' },
    NO_SHOW: { label: 'Désistement sans préavis au point de remise', hint: 'L’autre partie ne s’est pas présentée au lieu convenu.' },
    LATE: { label: 'Retard excessif au lieu de rendez-vous (> 45 min)', hint: 'Attente anormalement longue sans prévenir.' },
    COUNTERFEIT: { label: 'Suspicion d’article contrefait', hint: 'Logo non authentique, matière suspecte ou numéro de série faux.' },
    PAYMENT_PRESSURE: { label: 'Pression pour un paiement hors application', hint: 'Demande d’acompte avant la remise ou hors application.' },
    OTHER: { label: 'Autre motif', hint: 'Circonstances particulières nécessitant un arbitrage.' },
  },
  quickReplies: {
    buyer: ['L’article est-il toujours disponible ?', 'Votre prix est-il négociable ?', 'Est-il possible de convenir d’un rendez-vous ?', 'Paiement par Mobile Money direct ?'],
    seller: ['Oui, toujours disponible !', 'Le prix est ferme, désolé.', 'Dites-moi vos disponibilités pour un RDV.', 'Paiement Mobile Money ou espèces à la remise.'],
  },
}

// Lists of a country (the BO's version for it, with its cities, districts
// of its main city and meet-up spots): `countryCode` (the listing's, the
// shop's…), else the visitor's market; for « Tous les pays », the general
// lists with the main city of each country and no districts.
export function useLists(countryCode?: string | null): ReferenceLists {
  const market = useMarketCode()
  const code = countryCode === undefined ? market : countryCode
  // Each country is cached apart; the previous lists stay while another
  // country's load (no flash of the defaults on a switch).
  const { data, previousData } = useQuery<{ referenceLists: ReferenceLists }>(REFERENCE_LISTS_QUERY, {
    variables: countryVars(code),
    fetchPolicy: 'cache-first',
  })
  const countries = useCountries()
  const country = useCountry(code, true)
  const lists = (data ?? previousData)?.referenceLists ?? DEFAULT_LISTS
  return useMemo(() => country
    ? { ...lists, cities: country.cities, communes: country.districts, meetupSpots: country.meetupSpots, mainCity: country.mainCity }
    : { ...lists, cities: countries.map(c => c.mainCity), communes: [], meetupSpots: [], mainCity: '' }, [lists, country, countries])
}

// Member screens (disputes, chat quick replies): the lists of the member's
// account country, where their deals happen, else the visitor's market.
export function useMemberLists(): ReferenceLists {
  return useLists(useMemberCountryCode())
}

// "Where do you live" pickers: districts of the main city, then the other towns.
export function placeOptions(l: ReferenceLists): string[] {
  return [...l.communes, ...l.cities.filter(c => c !== l.mainCity)]
}

export function useDisputeLabel(): (r: DisputeReason) => string {
  const { disputeReasons } = useMemberLists()
  return r => disputeReasons[r]?.label ?? r
}
