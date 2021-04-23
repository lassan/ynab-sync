import { Issuer } from "openid-client"

import axios from "axios"

const clientPromise = Issuer.discover("https://auth.truelayer-sandbox.com").then(
  (issuer) =>
    new issuer.Client({
      client_id: "sandbox-ynabsync-52b117",
      client_secret: "28e0911c-6a7e-4153-b7bf-7bf0a303a9d0",
      redirect_uris: ["http://localhost:3000/truelayer-redirect"],
      response_types: ["code"]
    })
)

const authorize = async (code: string) => {
  const client = await clientPromise

  const tokenSet = await client.grant({
    grant_type: "authorization_code",
    client_id: "sandbox-ynabsync-52b117",
    client_secret: "28e0911c-6a7e-4153-b7bf-7bf0a303a9d0",
    redirect_uri: "http://localhost:3000/truelayer-redirect",
    code
  })

  const { access_token, refresh_token } = tokenSet
  return { access_token, refresh_token }
}

type Response<T> = {
  results: T
  status: string
}

export type Account = Readonly<{
  account_id: string
  update_timestamp: string
  display_name: string
  current: string
  provider: Readonly<{
    display_name: string
    provider_id: string
    logo_uri: string
  }>
}>

const dataApi = (accessToken: string) => {
  const client = axios.create({
    baseURL: "https://api.truelayer-sandbox.com/data/v1",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  client.interceptors.request.use((request) => {
    console.debug(`axios ${request.method} /${request.url}`)
    return request
  })

  const accounts = () =>
    client
      .get<Response<Account[]>>("accounts")
      .then((r) => r.data)
      .then((r) => {
        if (r.status === "Succeeded") return r.results
        throw r
      })

  return {
    accounts
  }
}

export { authorize, dataApi }
