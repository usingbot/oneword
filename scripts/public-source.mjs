import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Buffer } from 'node:buffer'
import process from 'node:process'

const exec = promisify(execFile)
const runGit = async args => (await exec('git', args, {
  timeout: 30000, maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
})).stdout.trim()

async function publicRequest(url) {
  // Deliberately no Authorization, cookies or credential helper on HTTP checks.
  const response = await globalThis.fetch(url, { signal: globalThis.AbortSignal.timeout(30000), redirect: 'error' })
  if (!response.ok) throw new Error(`Public source request failed: HTTP ${response.status} at ${url}`)
  return Buffer.from(await response.arrayBuffer())
}

export async function verifyPublicSource(repositoryUrl, { git = runGit, request = publicRequest } = {}) {
  assert.match(repositoryUrl, /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
    'Public source verification requires a canonical GitHub repository URL')
  assert.equal(await git(['status', '--porcelain', '--untracked-files=normal']), '', 'Source tree must be clean')
  const commit = await git(['rev-parse', 'HEAD'])
  assert.match(commit, /^[a-f0-9]{40}$/)
  const remote = await git(['-c', 'credential.helper=', 'ls-remote', `${repositoryUrl}.git`, 'refs/heads/main'])
  assert.equal(remote.split(/\s+/)[0], commit, 'Public main SHA differs from local HEAD')
  const repository = repositoryUrl.slice('https://github.com/'.length)
  const api = `https://api.github.com/repos/${repository}`
  const info = JSON.parse((await request(api)).toString())
  assert.equal(info.private, false, 'Source repository must be public')
  assert.equal(info.full_name.toLowerCase(), repository.toLowerCase())
  const published = JSON.parse((await request(`${api}/git/commits/${commit}`)).toString())
  assert.equal(published.sha, commit, 'Public commit object differs from local HEAD')
  assert.equal(published.tree.sha, await git(['rev-parse', 'HEAD^{tree}']), 'Public source tree differs')
  const tree = JSON.parse((await request(`${api}/git/trees/${published.tree.sha}`)).toString())
  assert.equal(tree.sha, published.tree.sha)
  assert.ok(tree.tree.some(entry => entry.path === 'src' && entry.type === 'tree'), 'Public source tree is missing src')
  for (const file of ['README.md', 'LICENSE', 'SECURITY.md', 'CONTRIBUTING.md']) {
    const bytes = await request(`https://raw.githubusercontent.com/${repository}/${commit}/${file}`)
    assert.equal(bytes.toString('utf8').trim(), await git(['show', `HEAD:${file}`]), `Public ${file} differs from Git source`)
  }
  return { commit, url: `${repositoryUrl}/tree/${commit}`, verified: true }
}
