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
  TransactionFetchResult,
  TrueLayerTransactionsToSaveToYnab,
  UserDocument,
  VanguardTransactionsToSaveToYnab
} from "../../libs/src/types"
import { getTokenFn } from "./getTokenFn"

import { combineLatest, from, of, forkJoin, iif, Observable, concat } from "rxjs"

import { filter, map, mergeMap, tap, concatMap, skip } from "rxjs/operators"
import type { Collection } from "../../libs/node_modules/@types/mongodb"

import { provider as truelayerProvider } from "./ynab_transaction_providers/truelayer"
import { provider as vanguardProvider } from "./ynab_transaction_providers/vanguard"
import type { FilterQuery, UpdateQuery } from "mongodb"

type Account = Connection["accounts"][0]

const error = chalk.red
const info = chalk.green

const logTransactions = (type: string, result: TransactionFetchResult, account: Account) =>
  console.info(
    info(`%d %s transactions for %s / %s. since %s`),
    result.transactions.length,
    type,
    account.provider,
    account.display_name.trim(),
    dayjs(result.fromDate).format("DD/MM/YYYY HH:mm:ss")
  )

const transactionProviders: Partial<Record<ConnectionType, GetTransactionsToSaveToYnab>> = {
  truelayer: truelayerProvider,
  vanguard: vanguardProvider
}

const sync = (ynabAuth: AuthClient, collection: Collection<UserDocument>) => {
  const updateDoc = (
    account: Account,
    f: FilterQuery<UserDocument>,
    update: UpdateQuery<UserDocument>
  ): Promise<Account> => {
    return new Promise<Account>((resolve, reject) => {
      collection.updateOne(f as any, update as any, (err) => {
        if (err) reject(err)
        else resolve(account)
      })
    })
  }

  const createYnabTransactions$ = (
    ynab: ynab.Api,
    part: TransactionFetchResult
  ): Observable<void> =>
    of(part).pipe(
      filter((p) => p.transactions.length > 0),
      mergeMap(({ transactions }) => ynab.transactions({ transactions }))
    )

  const truelayer$ = (
    result: TrueLayerTransactionsToSaveToYnab,
    ynab: ynab.Api,
    account: Account,
    connection: Connection,
    userId: string
  ) => {
    return of(result).pipe(
      tap((r) => {
        logTransactions("cleared", r.cleared, account)
        logTransactions("pending", r.pending, account)
      }),
      mergeMap((result) => {
        const a = createYnabTransactions$(ynab, result.cleared).pipe(
          mergeMap(() =>
            updateDoc(
              account,
              { $and: [{ user_id: userId }, { "connections.id": connection.id }] },
              {
                $set: {
                  [`connections.$.accounts.${account.id}.synced_at`]: result.cleared.toDate
                }
              }
            )
          )
        )
        const b = createYnabTransactions$(ynab, result.pending).pipe(
          mergeMap(() =>
            updateDoc(
              account,
              { $and: [{ user_id: userId }, { "connections.id": connection.id }] },
              {
                $set: {
                  [`connections.$.accounts.${account.id}.pending_synced_at`]: result.pending.toDate
                }
              }
            )
          )
        )
        return concat(a, b).pipe(map(() => account))
      })
    )
  }

  const vanguard$ = (
    result: VanguardTransactionsToSaveToYnab,
    ynab: ynab.Api,
    account: Account,
    connection: Connection,
    userId: string
  ) => {
    return of(result).pipe(
      tap((r) => logTransactions("vanguard", r, account)),
      mergeMap(() =>
        createYnabTransactions$(ynab, result).pipe(
          mergeMap(() =>
            updateDoc(
              account,
              { $and: [{ user_id: userId }, { "connections.id": connection.id }] },
              {
                $set: {
                  [`connections.$.accounts.${account.id}.synced_at`]: result.toDate
                }
              }
            )
          ),
          map(() => account)
        )
      )
    )
  }

  return from(collection.find<UserDocument>(null, {})).pipe(
    // skip(1),
    filter((doc) => doc.user_id !== null),
    map((doc) => ({ doc, ynab: ynab.api(getYnabTokenFn(ynabAuth, doc)) })),
    mergeMap(({ doc, ynab }) =>
      from(doc.connections).pipe(
        mergeMap(
          (connection) =>
            from(
              Object.entries(connection.accounts)
                .filter(([, account]) => !!account.connected_to)
                .map(([, account]) => account)
            ).pipe(
              mergeMap((account: Connection["accounts"][0]) => {
                console.info(
                  `Processing user '${doc.user_id}', connection '${
                    connection.id
                  }', account ${account.display_name.trim()}`,
                  account.provider
                )

                const provider = transactionProviders[connection.type]
                if (!provider)
                  throw Error(`No provider for connection of type '${connection.type}'`)

                const transactions = provider(doc.user_id, connection, account, { ynab })

                return combineLatest([transactions, of(account)])
              }, 1),
              concatMap(([transactions, account]) =>
                iif(
                  () => transactions.type === "truelayer",
                  truelayer$(
                    transactions as TrueLayerTransactionsToSaveToYnab,
                    ynab,
                    account,
                    connection,
                    doc.user_id
                  ),
                  vanguard$(
                    transactions as VanguardTransactionsToSaveToYnab,
                    ynab,
                    account,
                    connection,
                    doc.user_id
                  )
                )
              )
            ),
          1
        )
      )
    )
  )
}

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
  next: (account) =>
    console.log(error(`Completed ${account.provider} / ${account.display_name.trim()}`)),
  error: (err) => {
    console.error(err)
    process.exit(1)
  },
  complete: () => {
    console.log(info("Processing complete for all documents"))
    process.exit(0)
  }
})
