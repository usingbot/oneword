// Deliberately separate from build/dev: publication requires real owner metadata.
import './verify-release.mjs'
import { readFile, access } from 'node:fs/promises'
import process from 'node:process'
import { releaseMetadataErrors } from './release-validation.mjs'
import { verifyPublicSource } from './public-source.mjs'

const metadata = JSON.parse(await readFile('release-metadata.json', 'utf8'))
const sourceFailures = []
if (metadata.applicationSource?.mode === 'public-head') {
  try {
    metadata.applicationSource = await verifyPublicSource(metadata.repositoryUrl)
    process.stdout.write(`Public source verified without authentication: ${metadata.applicationSource.url}\n`)
  } catch (error) {
    // Never fall back to stored verification flags when the live check fails.
    metadata.applicationSource = { verified: false }
    sourceFailures.push({ category: 'PUBLIC SOURCE VERIFICATION FAILURE', message: error.message })
  }
}
const failures = releaseMetadataErrors(metadata)
failures.push(...sourceFailures)
for (const path of [metadata.runtimeNotices?.evidence, metadata.liberationSource?.reviewEvidence].filter(Boolean)) {
  try { await access(path) }
  catch { failures.push({ category: 'TECHNICAL VALIDATION FAILURE', message: `Missing review evidence: ${path}` }) }
}
if (failures.length) {
  process.stderr.write('NOT READY for public release:\n' + failures.map(item => `- ${item.category}: ${item.message}`).join('\n') + '\n')
  process.exitCode = 1
} else {
  process.stdout.write('Release metadata and artifact checks passed. Channel/source verification fields are maintainer attestations, not live network verification. Publication still requires explicit approval.\n')
}
