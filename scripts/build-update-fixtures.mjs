// Two genuine production outputs, isolated from dist and never deployed.
import { build } from 'vite'
import process from 'node:process'
for (const label of ['old', 'next']) {
  process.env.ONEWORD_BUILD_LABEL = `update-fixture-${label}`
  await build({ build: { outDir: `.tools/m4a-update-${label}` }, logLevel: 'warn' })
}
