import type { RequestHandler } from "@sveltejs/kit"
// import json from "./_accounts.json"
import axios from "axios"

export const get: RequestHandler = async ({ headers }) => {
  const response = await Promise.all([
    axios.get(`http://localhost:3001/ynab/accounts`, { headers: { cookie: headers.cookie } }),
    axios.get(`http://localhost:3001/truelayer/connections`, {
      headers: { cookie: headers.cookie }
    })
  ]).then((values) => ({
    ynab: values[0].data,
    connections: values[1].data
  }))

  return {
    body: response
  }
}
