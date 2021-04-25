import mongodb, { FilterQuery, UpdateQuery } from "mongodb"
import assert from "assert"
import type { UserDocument } from "./types"

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
  const db = await connection

  const collection = db.collection("data")

  return await new Promise<void>((resolve, reject) => {
    const filter: FilterQuery<UserDocument> = { userId }

    collection.updateOne(filter, update, { upsert: true }, (err, result) => {
      assert.strictEqual(err, null)
      err != null && reject(err)
      console.info(`Upserted ${result.result.n} documents into the collection`)
      resolve()
    })
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
