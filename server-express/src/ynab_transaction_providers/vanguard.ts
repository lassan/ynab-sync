import joi from "joi"
import playwright from "playwright"
import { config } from "dotenv"
import type {
  GetTransactionsToSaveToYnab,
  VanguardAccount,
  VanguardConnection
} from "../../../libs/src/types"
import dayjs from "dayjs"
import { decrypt } from "../encrypt"
import currency from "currency.js"

const scrapePortfolioValue = async (username: string, password: string) => {
  const browser = await playwright.chromium.launch({
    headless: true
  })

  try {
    const page = await browser.newPage()

    await page.goto("https://secure.vanguardinvestor.co.uk/Login")
    await page.fill("#__GUID_1007", username)
    await page.fill("#__GUID_1008", password)

    await page.click(".submit > button[type='submit']")
    await page.waitForTimeout(5000)

    const element = await page.$("text='My ISA value'").then((el) => el.$("div > span"))
    const value = await element.innerText()

    return value
  } finally {
    await browser.close()
  }
}

export const provider: GetTransactionsToSaveToYnab = async (
  _user_id,
  connection: VanguardConnection,
  account: VanguardAccount,
  { ynab }
) => {
  const shouldSync = !account.synced_at
    ? true
    : dayjs().diff(dayjs(account.synced_at), "days") > account.sync_period_in_days

  const toDate = dayjs().toDate()

  if (!shouldSync) return { toDate, transactions: [] }

  const [ynabValue, vanguardValue] = await Promise.all([
    ynab.account(account.connected_to).then((x) => x.cleared_balance + x.uncleared_balance),
    scrapePortfolioValue(connection.user_name, decrypt(connection.password)).then(
      (v) => currency(v).multiply(10).intValue
    )
  ])

  return {
    toDate,
    transactions: [
      {
        account_id: account.connected_to,
        amount: vanguardValue - ynabValue,
        cleared: "cleared",
        date: toDate,
        payee_name: "Balance Adjustment",
        memo: "🤖"
      }
    ]
  }
}
