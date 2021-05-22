import mongodb, { FilterQuery, UpdateQuery } from "mongodb"
import assert from "assert"

import type { UserDocument } from "../../libs/src/types"
import { promisify } from "util"

import { TaskEither, tryCatch } from "fp-ts/TaskEither"

const { MongoClient } = mongodb
const url = "mongodb://localhost:27017"
const dbName = "ynab-sync"
const client = new MongoClient(url, { useUnifiedTopology: true })

const connection = new Promise<mongodb.Db>((resolve, reject) => {
  client.connect((err) => {
    assert.strictEqual(err, null)

    console.log("Connected successfully to the server")

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

export { findDocument, upsert, close }
