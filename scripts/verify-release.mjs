import assert from 'node:assert/strict'
import process from 'node:process'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { licenseAssets, existingPdfNotices, licenseContent } from './license-assets.mjs'
import { productionCspErrors } from './release-validation.mjs'

const json = async path => JSON.parse(await readFile(path, 'utf8'))
const pkg = await json('package.json')
const lock = await json('package-lock.json')
assert.deepEqual(productionCspErrors(await readFile('dist/index.html', 'utf8')), [], 'Production CSP validation failed')
assert.equal(pkg.license, 'AGPL-3.0-only')
assert.equal(lock.packages[''].license, pkg.license)
assert.equal(lock.packages[''].version, pkg.version)
assert.equal(lock.version, pkg.version)
assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies)
assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies)

const worker = await readFile('dist/sw.js', 'utf8')
for (const [source, target] of [...licenseAssets, ...existingPdfNotices]) {
  const expected = await licenseContent(source)
  assert.deepEqual(await readFile(`dist/${target}`), expected, `Notice changed or missing: ${target}`)
  const integrity = 'sha256-' + createHash('sha256').update(expected).digest('base64')
  assert.ok(worker.includes(JSON.stringify({ url: `/${target}`, integrity })), `Notice not precached: ${target}`)
}
for (const name of ['react', 'react-dom', 'scheduler', 'dexie', 'pdfjs-dist', 'ts-fsrs', 'vite', 'rolldown']) {
  const installed = await json(`node_modules/${name}/package.json`)
  assert.equal(installed.version, lock.packages[`node_modules/${name}`].version)
  assert.ok((await readFile('THIRD-PARTY-NOTICES.md', 'utf8')).includes(installed.version), `Inventory missing ${name} version`)
}
process.stdout.write(`Package metadata, production CSP and ${licenseAssets.length + existingPdfNotices.length} exact license/notice assets verified.\n`)
