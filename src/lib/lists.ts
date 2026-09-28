import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import type { DisputeReason } from '../graphql/sellerTools'

// Choices offered in forms, edited in the back-office (« Listes de
// référence », Backend content/reference-lists.ts). DEFAULT_LISTS mirrors
// the backend defaults so forms are complete while the query loads.
export const REFERENCE_LISTS_QUERY = gql`
  query ReferenceLists { referenceLists }
`

export type ReferenceLists = {
  cities: string[]
  communes: string[]
  meetupSpots: { name: string, sub: string }[]
  conditions: { value: string, hint: string, icon: string }[]
  rejectReasons: string[]
  reportReasons: { listing: string[], user: string[], shop: string[] }
  disputeReasons: Record<DisputeReason, { label: string, hint: string }>
  quickReplies: { buyer: string[], seller: string[] }
}

export const DEFAULT_LISTS: ReferenceLists = {
  cities: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo', 'Man', 'Gagnoa'],
  communes: ['Cocody', 'Marcory', 'Plateau', 'Yopougon', 'Treichville', 'Koumassi', 'Adjamé', 'Abobo', 'Port-Bouët', 'Attécoubé', 'Bingerville', 'Songon', 'Anyama'],
  meetupSpots: [
    { name: 'Playce Marcory • Carrefour Duncan', sub: 'Zone commerciale ultra-fréquentée, parking gardé' },
    { name: 'Cap Sud Marcory • Entrée Principale', sub: 'Boulevard VGE, caméras & cafés à disposition' },
    { name: 'Playce Cocody Riviera • Espace Food', sub: 'Idéal pour les rendez-vous en journée' },
    { name: 'Sococé Deux-Plateaux • Galerie', sub: 'Galerie marchande, sécurité renforcée' },
    { name: 'Cosmos Yopougon • Hall principal', sub: 'Centre commercial éclairé et surveillé' },
  ],
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
    FAKE_PAYMENT: { label: 'Tentative d’arnaque faux SMS (Wave / Orange Money)', hint: 'Capture ou SMS de paiement falsifié, aucun crédit reçu.' },
    NOT_AS_DESCRIBED: { label: 'Non-conformité présumée de l’article', hint: 'Rayures, casse non déclarée, composants défectueux au test.' },
    NO_SHOW: { label: 'Désistement sans préavis au point de remise', hint: 'L’autre partie ne s’est pas présentée au lieu convenu.' },
    LATE: { label: 'Retard excessif au lieu de rendez-vous (> 45 min)', hint: 'Attente anormalement longue sans prévenir.' },
    COUNTERFEIT: { label: 'Suspicion d’article contrefait', hint: 'Logo non authentique, matière suspecte ou numéro de série faux.' },
    PAYMENT_PRESSURE: { label: 'Pression pour un paiement hors application', hint: 'Demande d’acompte avant la remise ou hors application.' },
    OTHER: { label: 'Autre motif', hint: 'Circonstances particulières nécessitant un arbitrage.' },
  },
  quickReplies: {
    buyer: ['L’article est-il toujours disponible ?', 'Votre prix est-il négociable ?', 'Est-il possible de convenir d’un rendez-vous ?', 'Paiement par Wave direct ?'],
    seller: ['Oui, toujours disponible !', 'Le prix est ferme, désolé.', 'Dites-moi vos disponibilités pour un RDV.', 'Paiement Wave ou espèces à la remise.'],
  },
}

// The city split into the communes of the list.
export const COMMUNES_CITY = 'Abidjan'

export function useLists(): ReferenceLists {
  const { data } = useQuery<{ referenceLists: ReferenceLists }>(REFERENCE_LISTS_QUERY, { fetchPolicy: 'cache-first' })
  return data?.referenceLists ?? DEFAULT_LISTS
}

// "Where do you live" pickers: Abidjan communes, then the other towns.
export function placeOptions(l: ReferenceLists): string[] {
  return [...l.communes, ...l.cities.filter(c => c !== COMMUNES_CITY)]
}

export function useDisputeLabel(): (r: DisputeReason) => string {
  const { disputeReasons } = useLists()
  return r => disputeReasons[r]?.label ?? r
}
