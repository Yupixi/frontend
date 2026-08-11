import { gql } from '@apollo/client'

export const CATEGORIES_QUERY = gql`
  query Categories {
    categories {
      id
      slug
      name
      icon
      color
      requiresPrice
      subcategories {
        id
        slug
        name
      }
      attributes {
        key
        label
        type
        options
        required
      }
    }
  }
`

export type CategorySubcategory = {
  id: string
  slug: string
  name: string
}

export type CategoryAttribute = {
  key: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'SELECT'
  options: string[]
  required: boolean
}

export type RemoteCategory = {
  id: string
  slug: string
  name: string
  icon: string
  color: string
  requiresPrice: boolean
  subcategories: CategorySubcategory[]
  attributes: CategoryAttribute[]
}
