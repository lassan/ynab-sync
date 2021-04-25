type AuthDocument = Readonly<{
  refresh_token: string
}>

export type UserDocument = Readonly<{
  userId: string
  ynabAuth?: AuthDocument
  truelayerAuth?: AuthDocument
}>

export type TokenSet = Readonly<{
  refresh_token: string
  access_token: string
  expires_in: number
}>

export type YnabAccount = Readonly<{
  id: string
  name: string
  type: string
  deleted: boolean
}>

export type BankAccount = Readonly<{
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
