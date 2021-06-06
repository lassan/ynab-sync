import * as redis from "./redis"
import type { AuthDetails } from "../../libs/src/types"

export const getTokenFn =
  (
    key: string,
    refreshTokens: () => Promise<AuthDetails>,
    saveRefreshToken: (token: string) => Promise<void>
  ) =>
  async () => {
    const token = await redis.get(key)
    if (token) return token
    else {
      console.log(`Updating access token for ${key}`)
      const newTokens = await refreshTokens()
      await saveRefreshToken(newTokens.refresh_token)
      redis.set(key, newTokens.access_token, newTokens.expires_in)
      return newTokens.access_token
    }
  }
