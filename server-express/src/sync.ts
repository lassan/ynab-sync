import * as truelayer from "../../libs/src/api/truelayer"
import * as ynab from "../../libs/src/api/ynab"
import { connection, upsert } from "../../libs/src/db"
import { createAuthClient } from "../../libs/src/api/createAuthClient"

import { config } from "./config"

import dayjs from "dayjs"
import type { UserDocument, YnabTransaction } from "../../libs/src/types"
import { getTokenFn } from "./getTokenFn"

import { from } from "rxjs"
import {} from "rxjs/operators"

const run = async () => {
  const [trueLayerAuth, ynabAuth, db] = await Promise.all([
    createAuthClient(config.truelayer),
    createAuthClient(config.ynab),
    connection
  ])

  const collection = db.collection("data")

  const docs = await collection.find<UserDocument>(null, {}).forEach((doc: UserDocument) => {
    if (!doc.user_id) return

    console.debug(`Processing document for ${doc.user_id}`)

    const ynabApi = ynab.api(
      getTokenFn(
        `${doc.user_id}:ynab`,
        () => ynabAuth.refreshToken(doc.ynab_refresh_token),
        (refresh_token) => upsert(doc.user_id, { $set: { ynab_refresh_token: refresh_token } })
      )
    )

    doc.connections.forEach(async (connection) => {
      const truelayerApi = truelayer.api(
        config.truelayer.base_url,
        getTokenFn(
          `${doc.user_id}:truelayer:${connection.id}`,
          () => trueLayerAuth.refreshToken(connection.refresh_token),
          (refresh_token) =>
            new Promise((resolve, reject) => {
              collection.updateOne(
                { $and: [{ user_id: doc.user_id }, { "connections.id": connection.id }] },
                { $set: { "connections.$.refresh_token": refresh_token } },
                (err) => (err ? reject(err) : resolve())
              )
            })
        )
      )

      Object.entries(connection.accounts)
        .filter(([, account]) => !!account.connected_to)
        .map(([_, account]) => account)
        .forEach(async (account) => {
          const fromDate = account.synced_at ?? dayjs().subtract(3, "day").toDate()
          const toDate = dayjs().toDate()

          const transactionsApi =
            account.type == "card"
              ? truelayerApi.cards.transactions(account.id, fromDate, toDate)
              : truelayerApi.accounts.transactions(account.id, fromDate, toDate)

          const transactions = await transactionsApi.then((trs) =>
            trs.map(
              (tr) =>
                ({
                  account_id: account.connected_to,
                  amount: Math.round(tr.amount * 1000) * (account.type == "card" ? -1 : 1),
                  cleared: "cleared",
                  payee_name: tr.merchant_name ?? tr.meta?.provider_merchant_name ?? tr.description,
                  date: tr.timestamp
                } as YnabTransaction)
            )
          )

          if (transactions.length) {
            await ynabApi
              .transactions({ transactions })
              .then((r) => {
                console.log(r)
              })
              .then(() =>
                collection.updateOne(
                  { $and: [{ user_id: doc.user_id }, { "connections.id": connection.id }] },
                  { $set: { [`connections.$.accounts.${account.id}.synced_at`]: toDate } },
                  (err, result) => {
                    if (err) throw err

                    console.info(`Upserted ${result.result.n} documents into the collection`)
                  }
                )
              )
              .catch((err) => console.error(err))
          }
        })
    })
  })
}

run().then(() => console.info("Sync complete.."))
