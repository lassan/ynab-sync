import * as truelayer from "../../../libs/src/api/truelayer"
import { connection as db_connection } from "../../../libs/src/db"
import { AuthClient, createAuthClient } from "../../../libs/src/api/createAuthClient"

import { config } from "../config"

import dayjs from "dayjs"
import type {
  TrueLayerAccount,
  GetTransactionsToSaveToYnab,
  UserDocument,
  YnabTransaction,
  TrueLayerConnection
} from "../../../libs/src/types"
import { getTokenFn } from "../getTokenFn"

import type { Collection } from "../../../libs/node_modules/@types/mongodb"
import type { Api } from "../../../libs/src/api/truelayer"

export const provider: GetTransactionsToSaveToYnab = async (
  user_id,
  connection: TrueLayerConnection,
  account: TrueLayerAccount
) => {
  const getClearedTransactions = (
    trueLayerAuth: AuthClient,
    collection: Collection<UserDocument>
  ) => {
    const truelayerApi = truelayer.api(
      config.truelayer.base_url,
      getTruelayerTokenFn(trueLayerAuth, user_id, connection, collection)
    )

    // cleared
    // const fromDate = dayjs().subtract(5, "day").toDate()
    const fromDate = account.synced_at ?? dayjs().subtract(5, "day").toDate()
    const toDate = dayjs().toDate()

    const transactions =
      account.type === "card"
        ? truelayerApi.cards.transactions(account.id, fromDate, toDate)
        : truelayerApi.accounts.transactions(account.id, fromDate, toDate)

    return transactions.then((trs) => {
      // console.log("cleared")
      // console.log(JSON.stringify(trs, null, 2))
      return {
        toDate,
        fromDate,
        transactions: trs.map((tr) => toYnabTransaction(tr, account, "cleared"))
      }
    })
  }

  const getPendingTransactions = (
    trueLayerAuth: AuthClient,
    collection: Collection<UserDocument>
  ) => {
    const truelayerApi = truelayer.api(
      config.truelayer.base_url,
      getTruelayerTokenFn(trueLayerAuth, user_id, connection, collection)
    )

    // cleared
    // const fromDate = dayjs().subtract(5, "day").toDate()
    const fromDate = account.pending_synced_at ?? dayjs().subtract(5, "day").toDate()
    const toDate = dayjs().toDate()

    const transactions =
      account.type === "card"
        ? truelayerApi.cards.transactionsPending(account.id, fromDate, toDate)
        : truelayerApi.accounts.transactionsPending(account.id, fromDate, toDate)

    return transactions
      .then((trs) => {
        // console.log("uncleared")
        // console.log(JSON.stringify(trs, null, 2))
        return {
          toDate,
          fromDate,
          transactions: trs.map((tr) => toYnabTransaction(tr, account, "uncleared"))
        }
      })
      .catch(() => {
        console.error("Failed to get pending transactions")
        return {
          toDate,
          fromDate,
          transactions: []
        }
      })
  }

  const [auth, collection_2] = await Promise.all([
    createAuthClient(config.truelayer),
    db_connection.then((db) => db.collection("data"))
  ])

  const cleared = await getClearedTransactions(auth, collection_2)
  const pending = await getPendingTransactions(auth, collection_2)

  return { type: "truelayer", cleared, pending }
}

const getTruelayerTokenFn = (
  authClient: AuthClient,
  user_id: string,
  connection: TrueLayerConnection,
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
  account: TrueLayerAccount,
  cleared: YnabTransaction["cleared"]
): YnabTransaction => ({
  import_id: id(tr),
  account_id: account.connected_to,
  amount: Math.round(tr.amount * 1000) * (account.type == "card" ? -1 : 1),
  cleared: cleared,
  payee_name: payee(tr),
  memo: tr.description,
  date: date(tr) //tr.meta?.transaction_time ?? tr.timestamp
})

const payee = (tr: truelayer.Transaction) =>
  (tr.merchant_name ?? tr.meta?.provider_merchant_name ?? tr.description ?? "").slice(0, 99)

const id = (tr: truelayer.Transaction) =>
  (
    tr.normalised_provider_transaction_id ??
    tr.meta?.provider_reference ??
    tr.transaction_id ??
    ""
  ).slice(0, 36)

const date = (tr: truelayer.Transaction) => {
  const d = tr.meta?.transaction_time ?? tr.timestamp
  const now = dayjs()
  return dayjs(d) > now ? now.toDate() : d
}
