import type { AuthDetails } from "../types"
import { Issuer, TokenSet } from "openid-client"

export type OAuthConfig = Readonly<{
  discovery?: boolean
  authorization_endpoint?: string
  token_endpoint?: string
  client_id: string
  client_secret: string
  auth_url: string
  redirect_url: string
}>

export interface AuthClient {
  authorize: (authCode: string) => Promise<AuthDetails>
  refreshToken: (refreshToken: string) => Promise<AuthDetails>
}

export type RefreshToken = AuthClient["refreshToken"]

export const createAuthClient = async (config: OAuthConfig): Promise<AuthClient> => {
  const issuer = config.discovery
    ? Issuer.discover(config.auth_url)
    : Promise.resolve(
        new Issuer({
          issuer: "issuer",
          authorization_endpoint: `${config.auth_url}${config.authorization_endpoint}}`,
          token_endpoint: `${config.auth_url}${config.token_endpoint}`
        })
      )

  const client = await issuer.then(
    (is) =>
      new is.Client({
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
        redirect_uri: config.redirect_url,
        code: authCode
      })
      .then(toMinTokenSet)
  }

  const refreshToken = (token: string) => client.refresh(token).then(toMinTokenSet)

  return { authorize, refreshToken }
}
