import { Issuer } from 'openid-client'

import axios from 'axios'

import * as db from '../db'
import * as redis from '../redis'
import type { TokenSet, BankAccount } from '../types'

const clientPromise = Issuer.discover(
  'https://auth.truelayer-sandbox.com'
).then(
  (issuer) =>
    new issuer.Client({
      client_id: 'sandbox-ynabsync-52b117',
      client_secret: '28e0911c-6a7e-4153-b7bf-7bf0a303a9d0',
      redirect_uris: ['http://localhost:3000/truelayer-redirect'],
      response_types: ['code'],
    })
)

const authorize = async (code: string) => {
  console.log('[truelayer] Authorizing with code')

  const client = await clientPromise

  const tokenSet = await client.grant({
    grant_type: 'authorization_code',
    client_id: 'sandbox-ynabsync-52b117',
    client_secret: '28e0911c-6a7e-4153-b7bf-7bf0a303a9d0',
    redirect_uri: 'http://localhost:3000/truelayer-redirect',
    code,
  })

  const { access_token, refresh_token, expires_in } = tokenSet
  return { access_token, refresh_token, expires_in }
}

const refreshToken = async (token: string): Promise<TokenSet> => {
  console.log('[truelayer] Refreshing token')

  const client = await clientPromise

  const tokenSet = await client.refresh(token)
  const { access_token, refresh_token, expires_in } = tokenSet
  return { access_token, refresh_token, expires_in }
}

type Response<T> = {
  results: T
  status: string
}

const getUpdatedToken = async (userId: string, service: string) => {
  const key = `${userId}:${service}`

  const token = await redis.get(key)
  if (token) return token
  else {
    console.log('[truelayer] Updating access token')
    const token = await db
      .findDocument(userId)
      .then((doc) => doc.truelayerAuth.refresh_token)
    const { access_token, refresh_token, expires_in } = await refreshToken(
      token
    )

    redis.set(key, access_token, expires_in)
    db.upsert(userId, {
      $set: { truelayerAuth: { refresh_token } },
    })

    return access_token
  }
}

const api = (userId: string) => {
  const client = axios.create({
    baseURL: 'https://api.truelayer-sandbox.com/data/v1',
    headers: { Authorization: `Bearer ${userId}` },
  })

  client.interceptors.request.use((request) => {
    console.debug(`axios ${request.method} /${request.url}`)
    return request
  })

  client.interceptors.request.use(async (config) => {
    const accessToken = await getUpdatedToken(userId, 'truelayer')
    config.headers['Authorization'] = `Bearer ${accessToken}`
    return config
  })

  const accounts = () =>
    client
      .get<Response<BankAccount[]>>('accounts')
      .then((r) => r.data)
      .then((r) => {
        if (r.status === 'Succeeded') return r.results
        throw r
      })

  return { accounts }
}

export { authorize, api }
