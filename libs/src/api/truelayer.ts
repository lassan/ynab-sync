import { Issuer } from "openid-client"

import axios, { AxiosInstance } from "axios"

import * as db from "../db"
import * as redis from "../redis"
import type { BankAccount } from "../types"
import { authHeader, requestLogger } from "../axios/interceptors"
import type { AuthClient, RefreshToken } from "./createAuthClient"

//git  "https://auth.truelayer.com/?response_type=code&client_id=ynabsync-52b117&scope=info%20accounts%20balance%20cards%20transactions%20direct_debits%20standing_orders%20offline_access&redirect_uri=https://console.truelayer.com/redirect-page&providers=uk-ob-all%20uk-oauth-all"
// "https://auth.truelayer-sandbox.com"

type Response<T> = {
  results: T
  status: string
}

const getKey = (userId: string, service: string) => `${userId}:${service}`
const getCachedToken = (key: string) => redis.get(key)

// const getUpdatedToken = async (userId: string, service: string, getNewTokens: RefreshToken) => {
//   const key = getKey(userId, service)

//   console.log("Getting token")

//   const token = await getCachedToken(key)
//   if (token) return token
//   else {
//     console.log("[truelayer] Updating access token")
//     const token = await db.findDocument(userId).then((doc) => doc.truelayerAuth.refresh_token)
//     const { access_token, refresh_token, expires_in } = await getNewTokens(token)

//     redis.set(key, access_token, expires_in)
//     db.upsert(userId, {
//       $set: { truelayerAuth: { refresh_token } }
//     })

//     return access_token
//   }
// }

type Transaction = Readonly<{
  timestamp: Date
  description: string
  transaction_type: string
  transaction_category: string
  transaction_classification: string[]
  merchant_name: string
  meta: { provider_merchant_name: string }
  amount: number
  currency: string
}>

type Resource<T> = T

type AccountResource = {
  accounts: () => Promise<BankAccount[]>
  transactions: (accountId: string, from?: Date, to?: Date) => Promise<Transaction[]>
}

type CardsResource = {
  cards: () => Promise<BankAccount[]>
  transactions: (cardId: string, from?: Date, to?: Date) => Promise<Transaction[]>
}

type CreateResource<T> = (client: AxiosInstance) => Resource<T>

export const accountsResource: CreateResource<AccountResource> = (client) => {
  const accounts = () =>
    client
      .get<Response<BankAccount[]>>("accounts")
      .then((r) => r.data)
      .then((r) => {
        if (r.status === "Succeeded") return r.results
        throw r
      })

  const transactions = (accountId: string, from?: Date, to?: Date) =>
    client
      .get<Response<Transaction[]>>(`accounts/${accountId}/transactions`, {
        params: { from, to }
      })
      .then((r) => r.data)
      .then((r) => {
        if (r.status === "Succeeded") return r.results
        throw r
      })

  return { accounts, transactions }
}

export const cardsResource: CreateResource<CardsResource> = (client) => {
  const cards = () =>
    client
      .get<Response<BankAccount[]>>("cards")
      .then((r) => r.data)
      .then((r) => {
        if (r.status === "Succeeded") return r.results
        throw r
      })

  const transactions = (cardId: string, from?: Date, to?: Date) =>
    client
      .get<Response<Transaction[]>>(`cards/${cardId}/transactions`, {
        params: { from, to }
      })
      .then((r) => r.data)
      .then((r) => {
        if (r.status === "Succeeded") return r.results
        throw r
      })

  return { cards, transactions }
}

type Api = {
  accounts: AccountResource
  cards: CardsResource
}

const api = (base_url: string, getAccessToken: () => Promise<string>): Api => {
  const client = axios.create({ baseURL: base_url })

  client.interceptors.request.use(authHeader(getAccessToken))
  client.interceptors.request.use(requestLogger)

  return {
    accounts: accountsResource(client),
    cards: cardsResource(client)
  }
}

export { api }
