import joi from "joi"
import playwright from "playwright"
import { config } from "dotenv"

config()

const schema = joi
  .object({
    VANGUARD_USERNAME: joi.string().required(),
    VANGUARD_PASSWORD: joi.string().required()
  })
  .unknown()

const result = schema.validate(process.env)
if (result.error) throw result.error

async function scrape() {
  const browser = await playwright.chromium.launch({
    headless: true
  })

  const page = await browser.newPage()
  await page.goto("https://secure.vanguardinvestor.co.uk/Login")
  await page.fill("#__GUID_1007", process.env.VANGUARD_USERNAME)
  await page.fill("#__GUID_1008", process.env.VANGUARD_PASSWORD)

  await page.click(".submit > button[type='submit']")
  await page.waitForTimeout(5000)

  const element = await page.$("text='My ISA value'").then((el) => el.$("div > span"))
  const value = await element.innerText()
  console.log(value)

  await browser.close()
}

scrape()
