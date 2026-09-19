import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { productionCspErrors, releaseMetadataErrors } from './release-validation.mjs'
import { licenseContent } from './license-assets.mjs'
import { verifyPublicSource } from './public-source.mjs'
import { Buffer } from 'node:buffer'

function publicSourceFixture({ dirty = false, remoteMismatch = false, privateRepo = false, treeMismatch = false, fileMismatch = false, unavailable = false } = {}) {
  const commit = 'a'.repeat(40), tree = 'b'.repeat(40)
  return {
    git: async args => {
      if (args[0] === 'status') return dirty ? ' M README.md' : ''
      if (args[0] === 'rev-parse') return args[1] === 'HEAD' ? commit : tree
      if (args.includes('ls-remote')) return `${remoteMismatch ? 'c'.repeat(40) : commit}\trefs/heads/main`
      if (args[0] === 'show') return 'fixture source'
      throw new Error('Unexpected Git call')
    },
    request: async url => {
      if (unavailable) throw new Error('HTTP 404')
      if (url.includes('raw.githubusercontent.com')) return Buffer.from(fileMismatch ? 'different' : 'fixture source\n')
      if (url.includes('/git/commits/')) return Buffer.from(JSON.stringify({ sha: commit, tree: { sha: treeMismatch ? 'c'.repeat(40) : tree } }))
      if (url.includes('/git/trees/')) return Buffer.from(JSON.stringify({ sha: tree, tree: [{ path: 'src', type: 'tree' }] }))
      return Buffer.from(JSON.stringify({ private: privateRepo, full_name: 'usingbot/oneword' }))
    },
  }
}

test('live source mapping resolves HEAD without a tracked self-referential SHA', async () => {
  const source = await verifyPublicSource('https://github.com/usingbot/oneword', publicSourceFixture())
  assert.equal(source.commit, 'a'.repeat(40))
  assert.equal(source.url, `https://github.com/usingbot/oneword/tree/${source.commit}`)
  assert.equal(source.verified, true)
})
for (const failure of ['dirty', 'remoteMismatch', 'privateRepo', 'treeMismatch', 'fileMismatch', 'unavailable']) {
  test(`live source verification rejects ${failure}`, async () => {
    await assert.rejects(verifyPublicSource('https://github.com/usingbot/oneword', publicSourceFixture({ [failure]: true })))
  })
}

const html = policy => `<meta http-equiv="Content-Security-Policy" content="${policy}">`
test('accepts the self-only production connection policy', () => {
  assert.deepEqual(productionCspErrors(html("default-src 'self'; connect-src 'self'; img-src 'self' https:")), [])
})
for (const origin of ['ws://127.0.0.1:*', 'wss://localhost:4173', 'ws://[::1]:*', 'ws://127.1:80', '*', 'ws:']) {
  test(`rejects production connection allowance ${origin}`, () => {
    assert.notDeepEqual(productionCspErrors(html(`connect-src 'self' ${origin}`)), [])
  })
}
test('missing, duplicate or absent-connect CSP cannot bypass the build gate', () => {
  for (const document of ['', html("default-src 'self'"), html("connect-src 'self'").repeat(2), html("connect-src 'self'; connect-src *")]) {
    assert.notDeepEqual(productionCspErrors(document), [])
  }
})
test('missing owner metadata and legal review remain release blockers', async () => {
  const metadata = JSON.parse(await readFile('release-metadata.json', 'utf8'))
  // Deliberately unset a fixture copy; filling real metadata must not break dev tests.
  metadata.security = { privateContact: null, verified: false }
  metadata.conduct = { privateContact: null, verified: false }
  metadata.applicationSource = { commit: null, url: null, verified: false }
  metadata.liberationSource = { status: 'needs-external-review', distributionUrl: null, reviewEvidence: null }
  const failures = releaseMetadataErrors(metadata)
  assert.ok(failures.some(item => item.message.includes('security reporting')))
  assert.ok(failures.some(item => item.message.includes('Code of Conduct')))
  assert.ok(failures.some(item => item.message.includes('exact release source')))
  assert.ok(failures.some(item => item.category === 'NEEDS EXTERNAL/LEGAL REVIEW'))
  assert.ok(!failures.some(item => item.message.includes('canonical repositoryUrl')))
})
test('public issues, fictional URLs and unresolved notice markers cannot pass release metadata checks', () => {
  const failures = releaseMetadataErrors({ schemaVersion: 1, repositoryUrl: 'https://example.com/TODO',
    security: { privateContact: 'https://github.com/usingbot/oneword/issues', verified: true },
    conduct: { privateContact: 'https://github.com/usingbot/oneword/security/advisories/new', verified: true },
    runtimeNotices: { status: 'pending', evidence: null },
  })
  for (const fragment of ['canonical repositoryUrl', 'private security', 'not a Code of Conduct', 'notice review']) {
    assert.ok(failures.some(item => item.message.includes(fragment)), fragment)
  }
})
test('a repository URL alone is not an exact-source offer or configured private channel', () => {
  const failures = releaseMetadataErrors({ schemaVersion: 1, repositoryUrl: 'https://github.com/usingbot/oneword',
    applicationSource: { url: 'https://github.com/usingbot/oneword', commit: 'a'.repeat(40), verified: false },
    security: { privateContact: 'https://github.com/usingbot/oneword/security/advisories/new', verified: false },
  })
  assert.ok(failures.some(item => item.message.startsWith('Verify private security')))
  assert.ok(failures.some(item => item.message.includes('full source commit')))
})
test('Vite core MIT notice is retained verbatim without the dev dependency catalog', async () => {
  const original = await readFile('node_modules/vite/LICENSE.md')
  const core = await licenseContent('node_modules/vite/LICENSE.md')
  assert.ok(core.includes('Copyright (c) 2019-present, VoidZero'))
  assert.ok(core.includes('copies or substantial portions'))
  assert.ok(core.includes('IN NO EVENT SHALL THE'))
  assert.ok(!core.includes('# Licenses of bundled dependencies'))
  assert.ok(original.subarray(0, core.length).equals(core))
})
