type AuthDocument = Readonly<{
  refresh_token: string
}>

export type YnabToBankConnection = Readonly<{
  connection_id: string
  ynab_account_id: string
  bank_account_id: string
}>

export type Account = Readonly<{
  type: "card" | "account"
  id: string
  display_name: string
  provider: string
  connected_to?: string
  synced_at?: Date
}>

export type Connection = Readonly<{
  id: string
  refresh_token: string
  connected_at: Date
  accounts: Record<string, Account>
}>

export type UserDocument = Readonly<{
  user_id: string
  ynab_refresh_token?: string
  connections: Connection[]
}>

export type AuthDetails = Readonly<{
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

export type YnabTransaction = Readonly<{
  account_id: string
  date: Date
  amount: number
  payee_name: string
  cleared: "cleared" | "uncleared" | "reconciled"
  memo?: string
}>
