import { Issuer } from 'openid-client'

import axios from 'axios'

import * as db from '../db'
import * as redis from '../redis'
import type { YnabAccount } from '../types'

const client = new new Issuer({
  issuer: 'ynab',
  authorization_endpoint: 'https://app.youneedabudget.com/oauth/authorize',
  token_endpoint: 'https://app.youneedabudget.com/oauth/token',
}).Client({
  client_id: 'ef29f60b98d8f2af56bfc52091b9ab066932368ee1098bfa58b48ac33664a454',
  client_secret:
    'c0c0d2a8b694c8384cedbf706605fc65ed8298a85276fb1f7e0e4eaa07a13f72',
  redirect_uris: ['http://localhost:3000/ynab-redirect'],
  response_types: ['code'],
})

type TokenSet = Readonly<{
  refresh_token: string
  access_token: string
  expires_in: number
}>

const authorize = async (code: string): Promise<TokenSet> => {
  console.log('[ynab] Authorizing with code')

  const tokenSet = await client.grant({
    grant_type: 'authorization_code',
    client_id:
      'ef29f60b98d8f2af56bfc52091b9ab066932368ee1098bfa58b48ac33664a454',
    client_secret:
      'c0c0d2a8b694c8384cedbf706605fc65ed8298a85276fb1f7e0e4eaa07a13f72',
    redirect_uri: 'http://localhost:3000/ynab-redirect',
    code,
  })

  const { access_token, refresh_token, expires_in } = tokenSet
  return { access_token, refresh_token, expires_in }
}

const refreshToken = async (token: string): Promise<TokenSet> => {
  console.log('[ynab] Refreshing token')

  const tokenSet = await client.refresh(token)
  const { access_token, refresh_token, expires_in } = tokenSet
  return { access_token, refresh_token, expires_in }
}

type Response<T> = Readonly<{
  data: T
}>

type Error = Readonly<{
  id: string
  name: string
  defailt: string
}>

type UserResponse = Readonly<{
  user: { id: string }
}>

export type AccountResponse = Readonly<{
  accounts: YnabAccount[]
}>

const getUpdatedToken = async (userId: string, service: string) => {
  const key = `${userId}:${service}`

  const token = await redis.get(key)
  if (token) return token
  else {
    console.log('[ynab] Updating access token')
    const token = await db
      .findDocument(userId)
      .then((doc) => doc.ynabAuth.refresh_token)
    const { access_token, refresh_token, expires_in } = await refreshToken(
      token
    )

    redis.set(key, access_token, expires_in)
    db.upsert(userId, {
      $set: { ynabAuth: { refresh_token } },
    })

    return access_token
  }
}

const user = (accessToken: string) =>
  axios
    .get<Response<UserResponse>>('https://api.youneedabudget.com/v1/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    .then((r) => r.data.data.user)

const api = (userId: string) => {
  const client = axios.create({
    baseURL: 'https://api.youneedabudget.com/v1',
  })

  client.interceptors.request.use((request) => {
    console.log(`axios ${request.method} /${request.url}`)
    return request
  })

  client.interceptors.request.use(async (config) => {
    const accessToken = await getUpdatedToken(userId, 'ynab')
    config.headers['Authorization'] = `Bearer ${accessToken}`
    return config
  })

  const user = () =>
    client.get<Response<UserResponse>>('user').then((r) => r.data.data.user)

  const accounts = () =>
    client
      .get<Response<AccountResponse>>('budgets/default/accounts')
      .then((r) => r.data.data.accounts.filter((acc) => !acc.deleted))

  return { user, accounts }
}

export { authorize, api, user }
