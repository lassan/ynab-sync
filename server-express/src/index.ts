import express from "express"
import morgan, { token } from "morgan"
import cors from "cors"
import cookie from "cookie"

import type { Request } from "express"
import * as truelayer from "./api/truelayer"

import * as ynab from "./api/ynab"
import { upsert } from "./db"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"

import type { TokenSet, YnabToBankConnection } from "../../libs/src/types"

const app = express()

app.use(
  morgan("dev"),
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200
  }),
  express.json()
)

const toError = (err: any) => new Error(String(err))

app.get("/ynab/authorize", (req, res) => {
  const code = req.query["code"] as string

  if (!code) return res.status(400).json({ error: "Code is missing" })

  const tokens = TE.tryCatch(() => ynab.authorize(code), toError)
  const user = (tokens: TokenSet) => TE.tryCatch(() => ynab.user(tokens.access_token), toError)

  return pipe(
    tokens,
    TE.bind("user", (tokens) => user(tokens)),
    TE.match(
      (err) => res.status(500).send({ message: err.message }),
      ({ user }) => res.json({ userId: user.id })
    )
  )()
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

app.post("/connect", (req, res) => {
  const userId = getUserId(req)
  console.debug(`[User] ${userId}`)

  const body: YnabToBankConnection = req.body
  console.log(body)

  return pipe(
    upsert(userId, {
      $set: { [`connections.${body.bank_account_id}`]: { ynab_account_id: body.ynab_account_id } }
    })
      .then(() => res.status(200).json({ status: "ok" }))
      .catch((err) => res.status(500).json(err))
  )
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

app.get("/health", (req, res) => res.status(200).end())

const PORT = 3001
app.listen(PORT, undefined, () => console.info(`Listening at http://localhost:${PORT}`))
