import type { AuthDetails } from "../types"
import { Issuer, TokenSet } from "openid-client"

export type OAuthConfig = {
  readonly client_id: string
  readonly client_secret: string
  readonly auth_url: string
  readonly redirect_url: string
}

export interface AuthClient {
  authorize: (authCode: string) => Promise<AuthDetails>
  refreshToken: (refreshToken: string) => Promise<AuthDetails>
}

export type RefreshToken = AuthClient["refreshToken"]

export const createAuthClient = async (config: OAuthConfig): Promise<AuthClient> => {
  const client = await Issuer.discover(config.auth_url).then(
    (issuer) =>
      new issuer.Client({
        client_id: config.client_id,
        client_secret: config.client_secret,
        redirect_uris: [config.redirect_url],
        response_types: ["code"]
      })
  )

  const toMinTokenSet = (ts: TokenSet) => ({
    access_token: ts.access_token!,
    refresh_token: ts.refresh_token!,
    expires_in: ts.expires_in
  })

  const authorize = (authCode: string) => {
    return client
      .grant({
        grant_type: "authorization_code",
        client_id: config.client_id,
        client_secret: config.client_secret,
        redirect_uri: "http://localhost:3000/truelayer-redirect",
        code: authCode
      })
      .then(toMinTokenSet)
  }

  const refreshToken = (token: string) => client.refresh(token).then(toMinTokenSet)

  return { authorize, refreshToken }
}
