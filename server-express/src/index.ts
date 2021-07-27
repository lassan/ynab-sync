import express from "express"
import morgan from "morgan"
import cors from "cors"
import cookie from "cookie"
import cookieParser from "cookie-parser"

import type { Request } from "express"
import * as ynab from "../../libs/src/api/ynab"

import type { UserDocument, YnabToBankConnection } from "../../libs/src/types"
import { upsert, findDocument, updateConnection } from "../../libs/src/db"
import { api as createTruelayerApi } from "../../libs/src/api/truelayer"

import { AuthClient, createAuthClient } from "../../libs/src/api/createAuthClient"

import { config } from "./config"
import { v4 as uuid } from "uuid"
import dayjs from "dayjs"
import { getTokenFn } from "./getTokenFn"
import { encrypt } from "./encrypt"

const truelayerAuth = createAuthClient(config.truelayer)
const ynabAuth = createAuthClient(config.ynab)

const app = express()

app.use(
  morgan("dev"),
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200
  }),
  cookieParser(),
  express.json()
)

app.get("/ynab/authorize", async (req, res) => {
  const code = req.query["code"] as string

  if (!code) return res.status(400).json({ error: "Code is missing" })
  const tokens = await (await ynabAuth).authorize(code)
  const api = ynab.api(() => Promise.resolve(tokens.access_token))
  const user = await api.user()

  console.log(user)
  upsert(user.id, {
    $set: {
      user_id: user.id,
      ynab_refresh_token: tokens.refresh_token
    }
  })
    .then(() => res.json({ userId: user.id }))
    .catch((err) => res.status(500).json({ err: err.message }))
})

app.get("/ynab/accounts", async (req, res) => {
  const userId = getUserId(req)

  console.debug(`[User] ${userId}`)

  const doc = await findDocument(userId)

  const api = ynab.api(getYnabTokenFn(await ynabAuth, doc))

  api
    .accounts()
    .then((acc) => res.json(acc))
    .catch((err) => res.status(500).json(err))
})

app.post("/connect", (req, res) => {
  const userId = getUserId(req)
  console.debug(`[User] ${userId}`)

  const body: YnabToBankConnection = req.body
  console.debug(body)

  updateConnection(userId, body)
    .then(() => res.status(200).json({ status: "ok" }))
    .catch((err) => res.status(500).json(err))
})

const getUserId = (req: Request) => {
  const { userId } = cookie.parse(req.headers.cookie ?? "")
  return userId
}

app.get("/truelayer/authorize", async (req, res) => {
  const code = req.query["code"]

  if (!code) return res.status(400).json({ error: "Code is missing" })
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: "User Id is missing" })

  console.debug(`[User] ${userId}`)
  const auth = await truelayerAuth

  const tokens = await auth.authorize(code as string)
  const api = createTruelayerApi(config.truelayer.base_url, () =>
    Promise.resolve(tokens.access_token)
  )

  const [accounts, cards] = await Promise.all([
    api.accounts
      .accounts()
      .then((acc) =>
        acc.map(
          (a) =>
            ({
              id: a.account_id,
              display_name: a.display_name,
              provider: a.provider.display_name,
              type: "account"
            } as UserDocument["connections"][0]["accounts"][1])
        )
      )
      .catch((err) => {
        console.error("Request for accounts failed.", err)
        return []
      }),

    api.cards
      .cards()
      .then((acc) =>
        acc.map(
          (a) =>
            ({
              id: a.account_id,
              display_name: a.display_name,
              provider: a.provider.display_name,
              type: "card"
            } as UserDocument["connections"][0]["accounts"][1])
        )
      )
      .catch((err) => {
        console.error("Request for cards failed", err)
        return []
      })
  ])

  const reduced = accounts.concat(cards).reduce((acc, curr) => {
    acc[curr.id] = curr
    return acc
  }, {} as Record<string, UserDocument["connections"][0]["accounts"][1]>)

  await upsert(userId, {
    $push: {
      connections: {
        id: uuid(),
        accounts: reduced,
        type: "truelayer",
        refresh_token: tokens.refresh_token,
        connected_at: dayjs().toDate()
      }
    }
  })

  return res.status(200).json({ status: "ok" })
})

app.get("/truelayer/connections", async (req, res) => {
  const userId = getUserId(req)

  console.debug(`[User] ${userId}`)

  findDocument(userId)
    .then((doc) => doc.connections)
    .then((doc) => res.json(doc))
    .catch((err) => {
      res.status(500).json({ error: err.message })
    })
})

type VanguardConnectionRequest = {
  ynab_account_id: string
  user_name: string
  password: string
}

app.post("/vanguard", (req, res) => {
  const userId = getUserId(req)
  console.debug(`[User] ${userId}`)

  const body: VanguardConnectionRequest = req.body

  const accountId = uuid()
  upsert(userId, {
    $push: {
      connections: {
        id: uuid(),
        type: "vanguard",
        user_name: body.user_name,
        password: encrypt(body.password),
        connected_at: dayjs().toDate(),
        accounts: {
          [accountId]: {
            display_name: "ISA",
            provider: "Vanguard",
            id: accountId,
            connected_to: body.ynab_account_id,
            sync_period_in_days: 30
          }
        }
      }
    }
  }).then(() => res.status(200).send())
})

const getYnabTokenFn = (authClient: AuthClient, doc: UserDocument) =>
  getTokenFn(
    `${doc.user_id}:ynab`,
    () => authClient.refreshToken(doc.ynab_refresh_token),
    (refresh_token) => upsert(doc.user_id, { $set: { ynab_refresh_token: refresh_token } })
  )

app.get("/health", (req, res) => res.status(200).end())

const PORT = 3001
app.listen(PORT, undefined, () => console.info(`Listening at http://localhost:${PORT}`))
