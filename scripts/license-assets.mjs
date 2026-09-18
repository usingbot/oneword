import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'

// Deliberately limited to licenses for code/resources actually shipped to browsers.
export const licenseAssets = [
  ['LICENSE', 'licenses/ONEWORD-AGPL-3.0.txt'],
  ['COPYRIGHT', 'licenses/ONEWORD-COPYRIGHT.txt'],
  ['THIRD-PARTY-NOTICES.md', 'licenses/THIRD-PARTY-NOTICES.txt'],
  ...['react', 'react-dom', 'scheduler', 'dexie', 'ts-fsrs'].map(name => [
    `node_modules/${name}/LICENSE`, `licenses/${name}-LICENSE.txt`,
  ]),
  ['node_modules/dexie/NOTICE', 'licenses/dexie-NOTICE.txt'],
  ['node_modules/vite/LICENSE.md', 'licenses/vite-LICENSE.txt'],
  ['node_modules/rolldown/LICENSE', 'licenses/rolldown-LICENSE.txt'],
  ['node_modules/rolldown/THIRD-PARTY-LICENSE', 'licenses/rolldown-THIRD-PARTY-LICENSE.txt'],
]

export async function licenseContent(source) {
  const contents = await readFile(source)
  if (source !== 'node_modules/vite/LICENSE.md') return contents
  // Vite's core MIT notice covers its emitted preload helper. The following
  // section describes dependencies bundled in the build tool, not our web app.
  const marker = Buffer.from('# Licenses of bundled dependencies')
  const end = contents.indexOf(marker)
  assert.ok(end > 0, 'Vite license layout changed; review runtime notice extraction')
  const core = contents.subarray(0, end)
  assert.ok(core.includes('VoidZero') && core.includes('THE SOFTWARE IS PROVIDED'), 'Incomplete Vite core license')
  return core
}

export const existingPdfNotices = [
  ['node_modules/pdfjs-dist/LICENSE', 'pdf-assets/PDFJS-LICENSE'],
  ['node_modules/pdfjs-dist/cmaps/LICENSE', 'pdf-assets/cmaps/LICENSE'],
  ...['LICENSE_FOXIT', 'LICENSE_LIBERATION'].map(name => [
    `node_modules/pdfjs-dist/standard_fonts/${name}`, `pdf-assets/standard_fonts/${name}`,
  ]),
]
