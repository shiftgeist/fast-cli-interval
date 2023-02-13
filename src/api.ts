import { isDeepStrictEqual } from 'util'

import puppeteer, { Browser, Page } from 'puppeteer'
import Observable from 'zen-observable'
import delay from 'delay'

import { Options } from './cli'
import { convertToMpbs, pad as pad, spaceRight } from './utilities'

export interface Result {
  date: string
  downloadSpeed: number
  uploadSpeed?: number
  downloadUnit?: string
  downloaded: number
  uploadUnit?: string
  uploaded?: number
  latency: number
  bufferBloat: number
  userLocation: string
  userIp: string
  isDone?: boolean
}

async function init(
  browser: Browser,
  page: Page,
  observer: ZenObservable.SubscriptionObserver<Result>,
  options: Pick<Options, 'upload'>,
) {
  let previousResult

  while (true) {
    const result = await page.evaluate(() => {
      const $ = document.querySelector.bind(document)

      return {
        date: new Date().toISOString(),
        downloadSpeed: Number($('#speed-value').textContent),
        uploadSpeed: Number($('#upload-value').textContent),
        downloadUnit: $('#speed-units').textContent.trim(),
        downloaded: Number($('#down-mb-value').textContent.trim()),
        uploadUnit: $('#upload-units').textContent.trim(),
        uploaded: Number($('#up-mb-value').textContent.trim()),
        latency: Number($('#latency-value').textContent.trim()),
        bufferBloat: Number($('#bufferbloat-value').textContent.trim()),
        userLocation: $('#user-location').textContent.trim(),
        userIp: $('#user-ip').textContent.trim(),
        isDone: Boolean(
          $('#speed-value.succeeded') && $('#upload-value.succeeded'),
        ),
      }
    })

    if (
      result.downloadSpeed > 0 &&
      !isDeepStrictEqual(result, previousResult)
    ) {
      observer.next(result)
    }

    if (result.isDone || (options && !options.upload && result.uploadSpeed)) {
      browser.close()
      observer.complete()
      return
    }

    previousResult = result

    await delay(100)
  }
}

export default (options: Options, reject) =>
  new Observable<Result>(observer => {
    // Wrapped in async IIFE as `new Observable` can't handle async function
    ;(async () => {
      const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
      const page = await browser.newPage()
      await page.goto('https://fast.com')
      await init(browser, page, observer, options)
    })().catch(() => {
      observer.error.bind(observer)
      reject(observer.error)
    })
  })
