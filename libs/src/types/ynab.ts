export type Transaction = Readonly<{
  account_id: string
  date: Date
  amount: number
  payee_name: string
  cleared: "cleared" | "uncleared" | "reconciled"
  memo: string
}>
