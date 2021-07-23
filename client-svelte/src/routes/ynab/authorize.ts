import type { RequestHandler } from "@sveltejs/kit"

import axios from "axios"

export const get: RequestHandler = async ({ query }) => {
  const code = query.get("code")

  console.log(`sending auth request`)
  const response = await axios.get(`http://localhost:3001/ynab/authorize?code=${code}`)
  console.log(`received response`, response.data)

  return {
    body: {},
    headers: {
      "set-cookie": `userId=${response.data.userId}; Path=/; HttpOnly`
    }
  }
}
