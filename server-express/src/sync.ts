import * as truelayer from "../../libs/src/api/truelayer"
import * as ynab from "../../libs/src/api/ynab"
import { connection, upsert } from "../../libs/src/db"
import { AuthClient, createAuthClient } from "../../libs/src/api/createAuthClient"

import chalk from "chalk"

import { config } from "./config"

import dayjs from "dayjs"
import type { Account, Connection, UserDocument, YnabTransaction } from "../../libs/src/types"
import { getTokenFn } from "./getTokenFn"

import { combineLatest, from, of, forkJoin } from "rxjs"

import { filter, map, mergeMap, tap } from "rxjs/operators"
import type { Collection } from "../../libs/node_modules/@types/mongodb"

const error = chalk.red
const info = chalk.green

const sync = (
  trueLayerAuth: AuthClient,
  ynabAuth: AuthClient,
  collection: Collection<UserDocument>
) => {
  const truelayerApi = (doc: UserDocument, connection: Connection) =>
    truelayer.api(
      config.truelayer.base_url,
      getTruelayerTokenFn(trueLayerAuth, doc, connection, collection)
    )

  return from(collection.find<UserDocument>(null, {})).pipe(
    filter((doc) => doc.user_id !== null),
    map((doc) => ({ doc, ynab: ynab.api(getYnabTokenFn(ynabAuth, doc)) })),
    mergeMap(({ doc, ynab }) =>
      from(doc.connections).pipe(
        map((connection) => ({ connection, truelayer: truelayerApi(doc, connection) })),
        mergeMap(({ connection, truelayer }) =>
          from(
            Object.entries(connection.accounts)
              .filter(([, account]) => !!account.connected_to)
              .map(([, account]) => account)
          ).pipe(
            mergeMap((account) => {
              console.info(`Processing user '${doc.user_id}', connection '${connection.id}'`)
              const fromDate = account.synced_at ?? dayjs().subtract(3, "day").toDate()
              const toDate = dayjs().toDate()

              const transactions =
                account.type == "card"
                  ? truelayer.cards.transactions(account.id, fromDate, toDate)
                  : truelayer.accounts.transactions(account.id, fromDate, toDate)

              return combineLatest([transactions, of(account), of(toDate)])
            }, 1),
            tap(([transactions, account]) =>
              console.info(
                info(`Received %d transactions for %s / %s. ` + `Account was last synced at %s`),
                transactions.length,
                account.provider,
                account.display_name.trim(),
                dayjs(account.synced_at).format("DD/MM/YYYY HH:mm:ss")
              )
            ),
            filter(([transactions]) => transactions.length > 0),
            mergeMap(
              ([transactions, account, toDate]) =>
                (transactions.length > 0
                  ? ynab.transactions({
                      transactions: transactions.map((tr) => toYnabTransaction(tr, account))
                    })
                  : Promise.resolve()
                ).then(
                  () =>
                    new Promise<Account>((resolve, reject) => {
                      collection.updateOne(
                        { $and: [{ user_id: doc.user_id }, { "connections.id": connection.id }] },
                        { $set: { [`connections.$.accounts.${account.id}.synced_at`]: toDate } },
                        (err) => {
                          if (err) reject(err)
                          else resolve(account)
                        }
                      )
                    })
                ),
              1
            )
          )
        )
      )
    )
  )
}

const payee = (tr: truelayer.Transaction) =>
  (tr.merchant_name ?? tr.meta?.provider_merchant_name ?? tr.description ?? "").slice(0, 99)

const toYnabTransaction = (tr: truelayer.Transaction, account: Account): YnabTransaction => ({
  account_id: account.connected_to,
  amount: Math.round(tr.amount * 1000) * (account.type == "card" ? -1 : 1),
  cleared: "cleared",
  payee_name: payee(tr),
  date: tr.timestamp
})

const getYnabTokenFn = (authClient: AuthClient, doc: UserDocument) =>
  getTokenFn(
    `${doc.user_id}:ynab`,
    () => authClient.refreshToken(doc.ynab_refresh_token),
    (refresh_token) => upsert(doc.user_id, { $set: { ynab_refresh_token: refresh_token } })
  )

const getTruelayerTokenFn = (
  authClient: AuthClient,
  doc: UserDocument,
  connection: Connection,
  collection: Collection<UserDocument>
) =>
  getTokenFn(
    `${doc.user_id}:truelayer:${connection.id}`,
    () => authClient.refreshToken(connection.refresh_token),
    (refresh_token) =>
      new Promise((resolve, reject) => {
        collection.updateOne(
          { $and: [{ user_id: doc.user_id }, { "connections.id": connection.id }] },
          { $set: { "connections.$.refresh_token": refresh_token } },
          (err) => (err ? reject(err) : resolve())
        )
      })
  )

const sync$ = forkJoin([
  createAuthClient(config.truelayer),
  createAuthClient(config.ynab),
  connection.then((db) => db.collection("data"))
]).pipe(mergeMap(([truelayer, ynab, collection]) => sync(truelayer, ynab, collection)))

sync$.subscribe({
  next: (account) => console.log(`Completed ${account.provider} / ${account.display_name.trim()}`),
  error: (err) => {
    console.error(err)
    process.exit(1)
  },
  complete: () => {
    console.log(info("Processing complete for all documents"))
    process.exit(0)
  }
})
