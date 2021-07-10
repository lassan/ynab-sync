import axios from "axios"

import type { YnabTransaction, YnabAccount } from "../types"
import { authHeader, requestLogger } from "../axios/interceptors"

type Response<T> = Readonly<{
  data: T
}>

type UserResponse = Readonly<{
  user: { id: string }
}>

export type AccountResponse = Readonly<{
  accounts: YnabAccount[]
}>

export type TransactionsRequest = Readonly<{
  transactions: YnabTransaction[]
}>

const api = (getAccessToken: () => Promise<string>) => {
  const client = axios.create({
    baseURL: "https://api.youneedabudget.com/v1"
  })

  client.interceptors.request.use(authHeader(getAccessToken))
  client.interceptors.request.use(requestLogger)

  const user = () => client.get<Response<UserResponse>>("user").then((r) => r.data.data.user)

  const accounts = () =>
    client
      .get<Response<AccountResponse>>("budgets/default/accounts")
      .then((r) => r.data.data.accounts.filter((acc) => !acc.deleted))

  const transactions = (request: TransactionsRequest) =>
    client.post("budgets/default/transactions", request).then((r) => r.data)

  return { user, accounts, transactions }
}

export { api }
