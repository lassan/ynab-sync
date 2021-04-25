import express from "express"
import morgan, { token } from "morgan"
import cookie from "cookie"

import type { Request } from "express"
import * as truelayer from "./truelayer"

import * as ynab from "./ynab"
import { upsert, findDocument } from "./db"

const app = express()

app.use(morgan("dev"))

app.get("/ynab/authorize", async (req, res) => {
  const code = req.query["code"] as string

  if (!code) return res.status(400).json({ error: "Code is missing" })

  const tokens = await ynab.authorize(code)
  const user = await ynab.user(tokens.access_token)

  await upsert(user.id, {
    $set: {
      userId: user.id,
      ynabAuth: { refresh_token: tokens.refresh_token }
    }
  })

  return res.status(200).json({ userId: user.id })
})

const getUserId = (req: Request) => {
  const { userId } = cookie.parse(req.headers.cookie ?? "")
  return userId
}

app.get("/truelayer/authorize", (req, res) => {
  const code = req.query["code"]

  if (!code) return res.status(400).json({ error: "Code is missing" })
  const userId = getUserId(req)

  console.debug(`[User] ${userId}`)

  return truelayer
    .authorize(code as string)
    .then((r) =>
      upsert(userId, {
        $set: {
          truelayerAuth: { refresh_token: r.refresh_token }
        }
      })
    )
    .then(() => res.status(200).json({ status: "ok" }))
    .catch((err) => res.status(500).json(err))
})

app.get("/truelayer/accounts", (req, res) => {
  const userId = getUserId(req)

  console.debug(`[User] ${userId}`)

  truelayer
    .api(userId)
    .accounts()
    .then((acc) => res.json(acc))
    .catch((err) => res.status(500).json(err))
})

app.get("/ynab/accounts", (req, res) => {
  const userId = getUserId(req)

  console.debug(`[User] ${userId}`)

  ynab
    .api(userId)
    .accounts()
    .then((acc) => res.json(acc))
    .catch((err) => res.status(500).json(err))
})

app.listen(3001)
