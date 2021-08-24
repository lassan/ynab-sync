import axios from "axios"

import type { YnabTransaction, YnabAccount } from "../types"
import { authHeader, errorLogger, requestLogger } from "../axios/interceptors"

type Response<T> = Readonly<{
  data: T
}>

type UserResponse = Readonly<{
  user: { id: string }
}>

export type AccountsResponse = Readonly<{
  accounts: YnabAccount[]
}>

export type AccountResponse = Readonly<{
  account: YnabAccount
}>

export type TransactionsRequest = Readonly<{
  transactions: YnabTransaction[]
}>

const api = (getAccessToken: () => Promise<string>) => {
  const client = axios.create({
    baseURL: "https://api.youneedabudget.com/v1"
  })

  client.interceptors.request.use(authHeader(getAccessToken))
  client.interceptors.request.use(requestLogger, errorLogger)

  const user = () => client.get<Response<UserResponse>>("user").then((r) => r.data.data.user)

  const accounts = () =>
    client
      .get<Response<AccountsResponse>>("budgets/default/accounts")
      .then((r) => r.data.data.accounts.filter((acc) => !acc.deleted))

  const account = (id: string) =>
    client
      .get<Response<AccountResponse>>(`budgets/default/accounts/${id}`)
      .then((r) => r.data.data.account)

  const transactions = (request: TransactionsRequest) =>
    client
      .post("budgets/default/transactions", request)
      .then((r) => r.data)
      .catch((error) => {
        console.error(error.response.data)
        throw error
      })

  return { user, accounts, transactions, account }
}

type Api = ReturnType<typeof api>

const mockApi: typeof api = (t: () => Promise<string>) => {
  return {
    user: () => Promise.resolve({ id: "" }),
    account: () => Promise.resolve({} as any),
    accounts: () => Promise.resolve([]),
    transactions: () => Promise.resolve([])
  }
}

export type { Api }
export { api }
// export { mockApi as api }
