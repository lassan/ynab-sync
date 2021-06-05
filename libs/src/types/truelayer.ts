export type Account = Readonly<{
  account_id: string
  account_type:
    | "TRANSACTION"
    | "SAVINGS"
    | "BUSINESS_TRANSACTION"
    | "BUSINESS_SAVINGS"
  currency: string
  display_name: string
  update_timestamp: Date
  provider: { provider_id: string }
}>

export type Card = Readonly<{
  account_id: string
  card_network: string
  card_type: string
  currency: string
  display_name: string
  update_timestamp: Date
  provider: { provider_id: string }
}>

export type Transaction = Readonly<{
  transaction_id: string
  timestamp: Date
  description: string
  transaction_type: string
  transaction_category: string
  transaction_classification: string[]
  merchant_name: string
  amount: number
  currency: string
}>
