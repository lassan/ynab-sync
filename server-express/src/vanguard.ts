import playwright from "playwright"

async function scrape() {
  const browser = await playwright.chromium.launch({
    headless: false
  })

  const page = await browser.newPage()
  await page.goto("https://secure.vanguardinvestor.co.uk/Login")
  await page.fill("#__GUID_1007", "HassanMunir92")
  await page.fill("#__GUID_1008", "2Eik7g3n6zFw2f2gkGCl")

  await page.click(".submit > button[type='submit']")
  await page.waitForTimeout(5000)

  const element = await page.$("text='My ISA value'").then((el) => el.$("div > span"))
  const value = await element.innerText()
  console.log(value)
}

scrape()
