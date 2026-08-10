import { gql } from '@apollo/client'

export const MY_FAVORITE_IDS_QUERY = gql`
  query MyFavoriteIds {
    myFavoriteIds
  }
`

export const TOGGLE_FAVORITE_MUTATION = gql`
  mutation ToggleFavorite($listingId: String!) {
    toggleFavorite(listingId: $listingId)
  }
`

export const MY_FAVORITES_QUERY = gql`
  query MyFavorites($page: Float, $pageSize: Float) {
    myFavorites(page: $page, pageSize: $pageSize) {
      totalCount
      page
      pageSize
      totalPages
      items {
        id
        title
        price
        currency
        city
        coverImageUrl
      }
    }
  }
`
