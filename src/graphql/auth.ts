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

// Lets a visitor message a seller without registering first — creates (or
// reuses) a lightweight account behind the scenes so the rest of the app's
// messaging stays unchanged. See Backend AuthService.guestLogin.
export const GUEST_LOGIN_MUTATION = gql`
  mutation GuestLogin($input: GuestLoginInput!) {
    guestLogin(input: $input) {
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

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      fullName
      phone
      city
      avatarUrl
      notificationPreferences
    }
  }
`

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`

export const LOGOUT_MUTATION = gql`
  mutation Logout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`

export type AuthUser = {
  id: string
  email: string
  fullName: string
  phone?: string | null
  city?: string | null
  avatarUrl?: string | null
  notificationPreferences?: Record<string, boolean>
}

export type AuthPayload = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
