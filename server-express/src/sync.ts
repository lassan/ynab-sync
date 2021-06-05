import type { UserDocument, YnabTransaction } from "../../libs/src/types"
import * as truelayer from "./api/truelayer"
import * as ynab from "./api/ynab"
import { connection, upsert } from "./db"
import { from, firstValueFrom } from "rxjs"
import { toArray, map, mergeAll, mergeMap } from "rxjs/operators"
import dayjs from "dayjs"

const run = async () => {
  const db = await connection
  const collection = db.collection("data")
  const docs = await collection.find<UserDocument>(null, {}).forEach((doc) => {
    if (doc.userId == undefined) return

    console.log(doc)
    const truelayerApi = truelayer.api(doc.userId)
    const ynabApi = ynab.api(doc.userId)
    const connections = Object.entries(doc.connections)
    connections
      .filter(([bank_id, ynab]) => !!ynab.ynab_account_id)
      .forEach(async ([bank_id, ynab]) => {
        const fromDate = ynab.synced_at ?? dayjs().subtract(3, "day").toDate()
        const toDate = dayjs().toDate()
        // console.log(ynab.synced_at)

        const transactions = await truelayerApi
          .transactions(bank_id, fromDate, toDate)
          .then((trs) =>
            trs.map(
              (tr) =>
                ({
                  account_id: ynab.ynab_account_id,
                  amount: tr.amount * 1000,
                  cleared: "cleared",
                  payee_name: tr.merchant_name,
                  date: tr.timestamp,
                  memo: tr.description
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
              upsert(doc.userId, {
                $set: { [`connections.${bank_id}.synced_at`]: toDate }
              })
            )
            .catch((err) => {
              console.log(err)
              throw err
            })
        }
      })
  })
}

run().then(() => console.info("Sync complete.."))
