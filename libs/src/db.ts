import mongodb, { FilterQuery, UpdateQuery } from "mongodb"
import assert from "assert"

import type { UserDocument, YnabToBankConnection } from "./types"
import { promisify } from "util"

const { MongoClient } = mongodb
const url = "mongodb://localhost:27017"
const dbName = "ynab-sync"
const client = new MongoClient(url, { useUnifiedTopology: true })

const connection = new Promise<mongodb.Db>((resolve, reject) => {
  client.connect((err) => {
    assert.strictEqual(err, null)

    console.log("Connected successfully to the database server")

    resolve(client.db(dbName))
  })
})

const upsert = async (userId: string, update: UpdateQuery<UserDocument>) => {
  console.debug("[mongodb] Updating document")

  const updateOne = (collection: mongodb.Collection<any>) =>
    promisify<
      mongodb.FilterQuery<UserDocument>,
      mongodb.UpdateQuery<any> | Partial<any>,
      mongodb.UpdateOneOptions,
      mongodb.UpdateWriteOpResult
    >(collection.updateOne)

  const db = await connection
  const collection = db.collection("data")

  collection.updateOne({ userId }, update, { upsert: true }, (err, result) => {
    if (err) throw err

    console.info(`Upserted ${result.result.n} documents into the collection`)
  })
}

const updateConnection = async (userId: string, update: YnabToBankConnection) => {
  const db = await connection
  const collection = db.collection<UserDocument>("data")

  collection.updateOne(
    {
      $and: [{ userId }, { "connections.id": update.connection_id }]
    },
    {
      $set: {
        [`connections.$.accounts.${update.bank_account_id}.connected_at`]: new Date(),
        [`connections.$.accounts.${update.bank_account_id}.connected_to`]: update.ynab_account_id
      }
    },
    (err, result) => {
      if (err) throw err

      console.info(`Upserted ${result.result.n} documents into the collection`)
    }
  )
}

const findDocument = async (userId: string) => {
  console.debug("[mongodb] Fetching document")
  const db = await connection
  const collection = db.collection("data")

  const filter: FilterQuery<UserDocument> = {
    userId: userId
  }

  return await collection.findOne<UserDocument>(filter)
}

const close = () => connection.then(() => client.close())

export { findDocument, upsert, close, connection, updateConnection }
