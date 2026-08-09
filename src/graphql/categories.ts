import { gql } from '@apollo/client'

export const CATEGORIES_QUERY = gql`
  query Categories {
    categories {
      id
      slug
      name
      icon
      color
      subcategories {
        id
        slug
        name
      }
    }
  }
`

export type CategorySubcategory = {
  id: string
  slug: string
  name: string
}

export type RemoteCategory = {
  id: string
  slug: string
  name: string
  icon: string
  color: string
  subcategories: CategorySubcategory[]
}
