import childProcess from 'child_process'
import pEvent from 'p-event'
import ava from 'ava'

ava('default', async test => {
  const subprocess = childProcess.spawn('./cli.js', { stdio: 'inherit' })
  test.is(await pEvent(subprocess, 'close'), 0)
})
