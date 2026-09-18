import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { productionCspErrors } from './release-validation.mjs'

assert.deepEqual(productionCspErrors(await readFile('dist/index.html', 'utf8')), [])
process.stdout.write("PASS: built production CSP has explicit connect-src 'self'; no loopback WebSocket allowance.\n")
