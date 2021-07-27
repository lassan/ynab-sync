import * as ynab from "../../libs/src/api/ynab"
import { connection, upsert } from "../../libs/src/db"
import { AuthClient, createAuthClient } from "../../libs/src/api/createAuthClient"

import chalk from "chalk"

import { config } from "./config"

import dayjs from "dayjs"
import type {
  Connection,
  ConnectionType,
  GetTransactionsToSaveToYnab,
  UserDocument
} from "../../libs/src/types"
import { getTokenFn } from "./getTokenFn"

import { combineLatest, from, of, forkJoin } from "rxjs"

import { filter, map, mergeMap, tap } from "rxjs/operators"
import type { Collection } from "../../libs/node_modules/@types/mongodb"

import { provider as truelayerProvider } from "./ynab_transaction_providers/truelayer"
import { provider as vanguardProvider } from "./ynab_transaction_providers/vanguard"

type Account = Connection["accounts"][0]

const error = chalk.red
const info = chalk.green

const transactionProviders: Partial<Record<ConnectionType, GetTransactionsToSaveToYnab>> = {
  truelayer: truelayerProvider,
  vanguard: vanguardProvider
}

const sync = (ynabAuth: AuthClient, collection: Collection<UserDocument>) =>
  from(collection.find<UserDocument>(null, {})).pipe(
    filter((doc) => doc.user_id !== null),
    map((doc) => ({ doc, ynab: ynab.api(getYnabTokenFn(ynabAuth, doc)) })),
    mergeMap(({ doc, ynab }) =>
      from(doc.connections).pipe(
        mergeMap((connection) =>
          from(
            Object.entries(connection.accounts)
              .filter(([, account]) => !!account.connected_to)
              .map(([, account]) => account)
          ).pipe(
            mergeMap((account: Connection["accounts"][0]) => {
              console.info(`Processing user '${doc.user_id}', connection '${connection.id}'`)

              const provider = transactionProviders[connection.type]
              if (!provider) throw Error(`No provider for connection of type '${connection.type}'`)

              const transactions = provider(doc.user_id, connection, account, { ynab })

              return combineLatest([transactions, of(account)])
            }, 1),
            tap(([{ transactions }, account]) =>
              console.info(
                info(`Received %d transactions for %s / %s. ` + `Account was last synced at %s`),
                transactions.length,
                account.provider,
                account.display_name.trim(),
                account.synced_at ? dayjs(account.synced_at).format("DD/MM/YYYY HH:mm:ss") : "NEVER"
              )
            ),
            filter(([{ transactions }]) => transactions.length > 0),
            mergeMap(
              ([{ toDate, transactions }, account]) =>
                ynab.transactions({ transactions }).then(
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

const getYnabTokenFn = (authClient: AuthClient, doc: UserDocument) =>
  getTokenFn(
    `${doc.user_id}:ynab`,
    () => authClient.refreshToken(doc.ynab_refresh_token),
    (refresh_token) => upsert(doc.user_id, { $set: { ynab_refresh_token: refresh_token } })
  )

const sync$ = forkJoin([
  createAuthClient(config.ynab),
  connection.then((db) => db.collection("data"))
]).pipe(mergeMap(([ynab, collection]) => sync(ynab, collection)))

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
