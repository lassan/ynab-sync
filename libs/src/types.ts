type AuthDocument = Readonly<{
  refresh_token: string
}>

export type YnabToBankConnection = Readonly<{
  connection_id: string
  ynab_account_id: string
  bank_account_id: string
}>

export type TrueLayerAccount = Readonly<{
  type: "card" | "account"
  id: string
  display_name: string
  provider: string
  connected_to?: string
  synced_at?: Date
}>

export type VanguardAccount = Readonly<{
  id: string
  provider: string
  display_name: string
  connected_to?: string
  synced_at?: string
}>

export type TrueLayerConnection = Readonly<{
  type: "truelayer"
  accounts: Record<string, TrueLayerAccount>
}>

export type VanguardConnection = Readonly<{
  type: "vanguard"
  accounts: Record<string, VanguardAccount>
}>

export type Connection = { id: string; refresh_token: string; connected_at: Date } & (
  | TrueLayerConnection
  | VanguardConnection
)

export type ConnectionType = "vanguard" | "truelayer"

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
  import_id?: string
}>

export type GetTransactionsToSaveToYnab = (
  user_id: string,
  connection: Connection,
  account: Connection["accounts"][0]
) => Promise<{ toDate: Date; transactions: YnabTransaction[] }>
