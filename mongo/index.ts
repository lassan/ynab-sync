import mongodb, { FilterQuery, UpdateQuery } from "mongodb"
import assert from "assert"
import express from "express"
import morgan from "morgan"

import { authorize, dataApi } from "./truelayer"

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

type UserDocument = {
  readonly userId: string
  readonly accessToken: string
  readonly refreshToken: string
}

const insert = async (data: UserDocument) => {
  const db = await connection

  const collection = db.collection("data")

  return await new Promise<void>((resolve, reject) => {
    const filter: FilterQuery<UserDocument> = { userId: data.userId }
    const update: UpdateQuery<UserDocument> = {
      $set: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      }
    }
    collection.updateOne(filter, update, { upsert: true }, (err, result) => {
      assert.strictEqual(err, null)
      err != null && reject(err)
      console.info(`Upserted ${result.result.n} documents into the collection`)
      resolve()
    })
  })
}

const find = async () => {
  const db = await connection
  const collection = db.collection("data")

  const filter: FilterQuery<UserDocument> = {
    userId: "hassan"
  }
  return await collection.findOne<UserDocument>(filter)
}

const close = () => connection.then(() => client.close())

// export { close, insert }

// authorization code > token,
// save access token in cache
// save refresh token in db

const app = express()

app.use(morgan("dev"))

app.get("/truelayer/authorize", (req, res) => {
  const code = req.query["code"]

  if (!code) return res.status(400).json({ error: "Code is missing" })

  return authorize(code as string)
    .then((r) =>
      insert({
        userId: "hassan",
        accessToken: r.access_token,
        refreshToken: r.refresh_token
      })
    )
    .then(() => res.status(200).json({ status: "ok" }))
    .catch((err) => res.status(500).json(err))
})

app.get("/authorize/ynab", (req, res) => {
  const code = req.query["code"]

  if (!code) return res.status(400).json({ error: "Code is missing" })
})

const api = () =>
  find()
    .then((r) => r.accessToken)
    .then((at) => dataApi(at))

app.get("/accounts", (req, res) => {
  api()
    .then((api) => api.accounts())
    .then((acc) => res.json(acc))
    .catch((err) => res.status(500).json(err))
})

app.listen(3001)
