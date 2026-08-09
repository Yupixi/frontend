import { gql } from '@apollo/client'

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        fullName
      }
    }
  }
`

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        fullName
      }
    }
  }
`

export type AuthUser = {
  id: string
  email: string
  fullName: string
}

export type AuthPayload = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
