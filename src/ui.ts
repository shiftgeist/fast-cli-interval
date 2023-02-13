import { writeFileSync } from 'fs'
import { promises as dns } from 'dns'
import ora, { Ora } from 'ora'
import chalk from 'chalk'
import delay from 'delay'

import type { Options } from './cli'
import api, { type Result } from './api.js'
import { convertToMpbs } from './utilities'

const colorMap: { [key: string]: Ora['color'] } = {
  download: 'green',
  upload: 'blue',
}

const symbolMap = {
  download: '↓',
  upload: '↑',
}

export function exit(errorMessage: string) {
  console.log(errorMessage)
  return process.exit(1)
}

async function checkNetwork() {
  try {
    await dns.lookup('fast.com')
  } catch (error) {
    exit(
      error.code === 'ENOTFOUND'
        ? 'Please check your internet connection'
        : `Something happened ${JSON.stringify(error)}`,
    )
    return
  }
}

function spinnerText(
  data: Result,
  options: Options,
  date?: Date,
  allDone = false,
) {
  const downloadMbps = convertToMpbs(data.downloadSpeed, data.downloadUnit)
  const downloadDone =
    allDone ||
    (options.upload &&
      data.downloadSpeed === data.downloadSpeed &&
      data.uploadSpeed !== 0)

  const dlColor = chalk[downloadDone ? 'green' : 'cyan']
  const upColor = chalk[allDone ? 'green' : 'cyan']

  const downloadText = dlColor(
    `${chalk.bold(downloadMbps)} ${chalk.dim('Mbps')} ${chalk.bold(
      symbolMap.download,
    )}`,
  )

  const intervalText =
    options.interval && date
      ? chalk.dim(date.toTimeString().slice(0, 8)) + ' '
      : ''

  if (options.upload) {
    const uploadMbps = convertToMpbs(data.uploadSpeed, data.uploadUnit)

    const uploadText = upColor(
      `${chalk.bold(uploadMbps || '-')} ${chalk.dim('Mbps')} ${chalk.bold(
        symbolMap.upload,
      )}`,
    )
    return intervalText + downloadText + chalk.dim(' / ') + uploadText
  } else {
    return intervalText + downloadText
  }
}

const fetch = async (options: Options, date?: Date) => {
  let data: Partial<Result> = {}

  const text = 'Measuring Bandwidth'
  const spinner = ora(text).start()

  try {
    data = await new Promise((resolve, reject) => {
      let data: Result = {} as Result

      const observer = api(options, reject)

      observer.subscribe({
        next(x: Result) {
          if (!options.upload) {
            delete x.uploaded
            delete x.uploadUnit
            delete x.uploadSpeed
          }

          data = x
          spinner.text = spinnerText(data, options, date)
        },
        error(err) {
          reject(err)
        },
        complete() {
          spinner.text = spinnerText(data, options, date, true)

          delete data.isDone
          data.downloadSpeed = convertToMpbs(
            data.downloadSpeed,
            data.downloadUnit,
          )
          delete data.downloadUnit

          if (options.upload) {
            data.uploadSpeed = convertToMpbs(data.uploadSpeed, data.uploadUnit)
            delete data.uploadUnit
          }

          if (options.json) {
            spinner.stop()
            process.stdout.write(JSON.stringify(data, undefined, '\t'))
          } else {
            process.stdout.write(spinnerText(data, options, date, true))
            spinner.stopAndPersist()
          }

          resolve(data)
        },
      })
    })
  } catch (error_) {
    exit(error_.message)
  }

  return data
}

export default async (options: Options) => {
  if (options.debug) {
    console.log('CLI Options', options)
  }

  await checkNetwork()

  let data: Array<Partial<Result>> = []

  if (options.interval) {
    const ms = options.interval * 60 * 60

    while (true) {
      const date = new Date()
      const response = await fetch(options, date)
      data.push(response)

      if (options.jsonFile) {
        writeFileSync(options.jsonFile, JSON.stringify(data))
      }

      delay(ms)
    }
  } else {
    const response = await fetch(options)
    data.push(response)

    if (options.jsonFile) {
      writeFileSync(options.jsonFile, JSON.stringify(data))
    }
  }
}
