#!/usr/bin/env node

import meow, { BooleanFlag, Flag, FlagType, NumberFlag, StringFlag } from 'meow'
import ui from './ui'

export interface Options {
  debug: boolean
  /**
   * interval in minutes
   */
  interval: number
  json: boolean
  jsonFile: string
  singleLine: boolean
  upload: boolean
}

const cli = meow(
  `
  Usage
    $ fast [options]

	Options
    --debug            Show cli options information
    --interval, -i     Bandwidth interval test (in minutes)
    --json             JSON output
    --json-file, -o    Output to json file
    --single-line, -s  Reduce spacing and output to a single line
    --upload, -u       Disable upload speed measurement

  Examples
    $ fast --upload
    93 Mbps ↓ / 13 Mbps ↑

    $ fast --upload --json

    $ fast --upload --interval 10 --json-file fast.json
`,
  {
    importMeta: import.meta,
    flags: {
      debug: {
        type: 'boolean',
        default: false,
      },
      interval: {
        type: 'number',
        alias: 'i',
      },
      json: {
        type: 'boolean',
      },
      jsonFile: {
        type: 'string',
        alias: 'o',
      },
      upload: {
        type: 'boolean',
        alias: 'u',
      },
      singleLine: {
        type: 'boolean',
        alias: 's',
      },
    },
  },
)

const main = async () => {
  await ui(cli.flags as Options)
}

main()
