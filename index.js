const webdriver = require('selenium-webdriver')
const dotenv = require('dotenv')
const axios = require('axios')
const fs = require('node:fs')
const chrome = require('selenium-webdriver/chrome')
require('chromedriver')

dotenv.config()

async function openCrawlerWeb() {
  const driver = await new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments('--headless'))
    .build()
  const web =
    'https://www.facebook.com/login/?next=https%3A%2F%2Fwww.facebook.com%2Fprofile.php%3Fid%3D100076362780585%26sk%3Dphotos_albums'
  driver.get(web)

  console.log('login start')
  const email = await driver.wait(webdriver.until.elementLocated(webdriver.By.id(`email`)))
  email.sendKeys(process.env.EMAIL)

  const pass = await driver.wait(webdriver.until.elementLocated(webdriver.By.id(`pass`)))
  pass.sendKeys(process.env.PWD)

  const loginbutton = await driver.wait(webdriver.until.elementLocated(webdriver.By.id(`loginbutton`)))
  loginbutton.click()
  console.log('login finish')

  console.log('enter album start')
  // nth-child 可選擇第幾個相簿
  const parentDiv = `div.x9f619.x1r8uery.x1iyjqo2.x6ikm8r.x10wlt62.x1n2onr6:nth-child(2)`
  const lengthContainer = await driver.wait(
    webdriver.until.elementLocated(webdriver.By.css(`${parentDiv} div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs`))
  )
  const length = parseInt(await lengthContainer.getAttribute('innerText'))

  const titleContainer = await driver.wait(
    webdriver.until.elementLocated(
      webdriver.By.css(
        `${parentDiv} span.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.xudqn12.x3x7a5m.x6prxxf.xvq8zen.x1s688f.xzsf02u.x1yc453h`
      )
    )
  )
  const title = await titleContainer.getAttribute('innerText')

  const album = await driver.wait(webdriver.until.elementLocated(webdriver.By.css(`${parentDiv} a[role="link"]`)))

  album.click()
  console.log('enter album finish')

  console.log('get links start')
  await driver.wait(
    webdriver.until.elementLocated(webdriver.By.className(`x78zum5 x1a02dak xwib8y2 x1sxyh0 x1swvt13 xyamay9`))
  )

  let links = []
  await new Promise((resolve) => {
    const scrollToEnd = () => {
      driver.executeScript('window.scrollTo(0, document.body.scrollHeight)')
    }

    const interval = setInterval(async () => {
      links = await driver.findElements(
        webdriver.By.css(`div[class="x78zum5 x1a02dak xwib8y2 x1sxyh0 x1swvt13 xyamay9"] a[role="link"]`)
      )

      if (links.length >= length) {
        clearInterval(interval)
        resolve()
      } else {
        scrollToEnd()
      }
    }, 3000)
    scrollToEnd()
  })
  console.log('get links finish')

  console.log('get src and text start')

  const imageDatas = []
  for (let i = 0; i < links.length; i++) {
    const link = links[i]

    const href = await link.getAttribute('href')

    const driver2 = await new webdriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(new chrome.Options().addArguments('--headless'))
      .build()
    driver2.get(href)

    const image = await driver2.wait(
      webdriver.until.elementLocated(webdriver.By.className(`x193iq5w x4fas0m x19kjcj4`))
    )

    const textContainer = await driver2.wait(
      webdriver.until.elementLocated(webdriver.By.className(`xyinxu5 x4uap5 x1g2khh7 xkhd6sd`))
    )
    const text = await textContainer.getAttribute('innerText')

    const src = await image.getAttribute('src')
    imageDatas.push({ src, text })

    await driver2.close()

    console.log(`get src and text ${i} finish`)
  }
  // console.log(`get src and text finish ${JSON.stringify(imageDatas)}`)
  console.log(imageDatas.length, links.length)
  driver.close()

  console.log('write files start')
  const folder = `/downloads/${title}`
  await new Promise((resolve, reject) => {
    fs.mkdir(process.cwd() + folder, (err) => {
      if (err && err.code !== 'EEXIST') reject(err)
      else resolve()
    })
  })

  for (let i = 0; i < imageDatas.length; i++) {
    const imageData = imageDatas[i]
    const { data } = await axios.get(imageData.src, {
      responseType: 'arraybuffer',
    })

    const name = imageData.text.replace(/\s|\n|\#|\%|\&|\{|\}|\\|\<|\>|\*|\?|\/|\\|\$\!|\'|\"|\@|\+|\`|\||\=/g, '')
    const match = name.match(/名稱[:：](.*)尺寸[:：].*價格[:：](.*)數量/)
    const resultName = match ? `${match[1]}_${match[2]}` : name

    await new Promise((resolve) => {
      fs.writeFile(process.cwd() + `${folder}/${resultName}.jpg`, data, (err) => {
        if (err) console.log(err)
        resolve()
      })
    })

    console.log(`write file ${i} finish`)
  }
  console.log('write files finish')

  return
}
openCrawlerWeb()
