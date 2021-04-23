import { Issuer } from "openid-client"

import type { RequestHandler } from "@sveltejs/kit"

const clientPromise = Issuer.discover("https://auth.truelayer-sandbox.com").then(
  (issuer) =>
    new issuer.Client({
      client_id: "sandbox-ynabsync-52b117",
      client_secret: "28e0911c-6a7e-4153-b7bf-7bf0a303a9d0",
      redirect_uris: ["http://localhost:3000/truelayer-redirect"],
      response_types: ["code"]
    })
)

export const get: RequestHandler = async ({ query, path, context: { userid } }) => {
  const client = await clientPromise

  console.log(query.get("code"), path, userid)

  const url = client.callbackParams(`${path}?code=${query.get("code")}`)
  console.log(url)

  const tokenSet = await client.grant({
    grant_type: "authorization_code",
    client_id: "sandbox-ynabsync-52b117",
    client_secret: "28e0911c-6a7e-4153-b7bf-7bf0a303a9d0",
    redirect_uri: "http://localhost:3000/truelayer-redirect",
    code: query.get("code")
  })

  console.log(tokenSet)

  // const r = await fetch("http://localhost:3001/insert", {
  //   method: "POST",
  //   body: JSON.stringify({
  //     userId: userid,
  //     refreshToken: tokenSet.refresh_token
  //   }),
  //   headers: { "Content-Type": "application/json" }
  // })

  // if (!r.ok) throw console.error("Failed to insert to db")

  return {
    status: 200
  }
}
