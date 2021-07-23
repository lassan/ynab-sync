import joi, { valid } from "joi"

type OAuthService = {
  discovery: boolean
  authorization_endpoint?: string
  token_endpoint?: string
  client_id: string
  client_secret: string
  auth_url: string
  base_url: string
  redirect_url: string
}

type Config = {
  ynab: OAuthService
  truelayer: OAuthService
}

enum EnvKeys {
  SANDBOX = "SANDBOX",
  TRUELAYER_CLIENT_ID = "TRUELAYER_CLIENT_ID",
  TRUELAYER_CLIENT_SECRET = "TRUELAYER_CLIENT_SECRET",
  YNAB_CLIENT_ID = "YNAB_CLIENT_ID",
  YNAB_CLIENT_SECRET = "YNAB_CLIENT_SECRET"
}

const schema = joi
  .object({
    SANDBOX: joi.boolean(),
    [EnvKeys.TRUELAYER_CLIENT_ID]: joi.string().required(),
    [EnvKeys.TRUELAYER_CLIENT_SECRET]: joi.string().required(),
    [EnvKeys.YNAB_CLIENT_ID]: joi.string().required(),
    [EnvKeys.YNAB_CLIENT_SECRET]: joi.string().required()
  })
  .unknown()

const result = schema.validate(process.env)
if (result.error) {
  throw result.error
}

const sandbox = process.env.SANDBOX === "true"
const config: Config = {
  ynab: {
    discovery: false,
    authorization_endpoint: "/authorize",
    token_endpoint: "/token",
    client_id: process.env[EnvKeys.YNAB_CLIENT_ID],
    client_secret: process.env[EnvKeys.YNAB_CLIENT_SECRET],
    auth_url: "https://app.youneedabudget.com/oauth",
    base_url: "https://api.youneedabudget.com/v1",
    redirect_url: "http://localhost:3000/ynab-redirect"
  },
  truelayer: {
    discovery: true,
    client_id: process.env[EnvKeys.TRUELAYER_CLIENT_ID],
    client_secret: process.env[EnvKeys.TRUELAYER_CLIENT_SECRET],
    auth_url: sandbox ? "https://auth.truelayer-sandbox.com" : "https://auth.truelayer.com",
    base_url: sandbox
      ? "https://api.truelayer-sandbox.com/data/v1"
      : "https://api.truelayer.com/data/v1",
    redirect_url: "http://localhost:3000/truelayer-redirect"
  }
}

export { config }
