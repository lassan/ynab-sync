import * as truelayer from "../../../libs/src/api/truelayer"
import { connection as db_connection, upsert } from "../../../libs/src/db"
import { AuthClient, createAuthClient } from "../../../libs/src/api/createAuthClient"

import chalk from "chalk"

import { config } from "../config"

import dayjs from "dayjs"
import type {
  TrueLayerAccount,
  Connection,
  GetTransactionsToSaveToYnab,
  UserDocument,
  YnabTransaction
} from "../../../libs/src/types"
import { getTokenFn } from "../getTokenFn"

import type { Collection } from "../../../libs/node_modules/@types/mongodb"

export const getTransactionsFromTruelayer: GetTransactionsToSaveToYnab = (
  user_id,
  connection,
  account: TrueLayerAccount
) => {
  const sync = (trueLayerAuth: AuthClient, collection: Collection<UserDocument>) => {
    const truelayerApi = truelayer.api(
      config.truelayer.base_url,
      getTruelayerTokenFn(trueLayerAuth, user_id, connection, collection)
    )

    const fromDate = account.synced_at ?? dayjs().subtract(5, "day").toDate()
    const toDate = dayjs().toDate()

    const transactions =
      account.type == "card"
        ? truelayerApi.cards.transactions(account.id, fromDate, toDate)
        : truelayerApi.accounts.transactions(account.id, fromDate, toDate)

    return transactions.then((trs) => ({
      toDate,
      transactions: trs.map((tr) => toYnabTransaction(tr, account))
    }))
  }

  return Promise.all([
    createAuthClient(config.truelayer),
    db_connection.then((db) => db.collection("data"))
  ]).then(([auth, collection]) => sync(auth, collection))
}

const getTruelayerTokenFn = (
  authClient: AuthClient,
  user_id: string,
  connection: Connection,
  collection: Collection<UserDocument>
) =>
  getTokenFn(
    `${user_id}:truelayer:${connection.id}`,
    () => authClient.refreshToken(connection.refresh_token),
    (refresh_token) =>
      new Promise((resolve, reject) => {
        collection.updateOne(
          { $and: [{ user_id: user_id }, { "connections.id": connection.id }] },
          { $set: { "connections.$.refresh_token": refresh_token } },
          (err) => (err ? reject(err) : resolve())
        )
      })
  )

const toYnabTransaction = (
  tr: truelayer.Transaction,
  account: TrueLayerAccount
): YnabTransaction => ({
  import_id: tr.provider_transaction_id ?? tr.version_two_id ?? tr.transaction_id,
  account_id: account.connected_to,
  amount: Math.round(tr.amount * 1000) * (account.type == "card" ? -1 : 1),
  cleared: "cleared",
  payee_name: payee(tr),
  date: tr.timestamp
})

const payee = (tr: truelayer.Transaction) =>
  (tr.merchant_name ?? tr.meta?.provider_merchant_name ?? tr.description ?? "").slice(0, 99)
