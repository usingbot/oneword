import { URL } from 'node:url'

export function productionCspErrors(html) {
  const policies = [...html.matchAll(/<meta\b[^>]*>/gi)].flatMap(([tag]) => {
    const attributes = Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([, name, double, single]) => [name.toLowerCase(), double ?? single]))
    return attributes['http-equiv']?.toLowerCase() === 'content-security-policy' ? [attributes.content ?? ''] : []
  })
  if (policies.length !== 1) return ['Production HTML must contain exactly one CSP meta policy.']
  const directives = policies[0].split(';').map(value => value.trim().split(/\s+/))
  const connects = directives.filter(([name]) => name.toLowerCase() === 'connect-src')
  const errors = []
  if (/\bwss?:/i.test(policies[0])) errors.push('Production CSP must not contain an explicit WebSocket scheme/origin.')
  // No production WebSocket/API destination is part of the local-first contract.
  // An explicit self-only policy also rejects wildcard, IPv6 and alternate IP spellings.
  if (connects.length !== 1 || connects[0].length !== 2 || connects[0][1] !== "'self'") {
    errors.push("Production connect-src must be exactly 'self'; loopback/WebSocket allowances are development-only.")
  }
  return errors
}

function publicHttps(value) {
  if (typeof value !== 'string' || /TODO|CHANGEME|placeholder|your-email|yourname|REPO_URL/i.test(value)) return false
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash &&
      !/^(?:localhost|0\.0\.0\.0|127\.|\[)/.test(host) &&
      !/(?:^|\.)(?:localhost|example\.com|example\.org|example\.net)$|\.(?:test|invalid|example)$/.test(host)
  } catch { return false }
}

function privateContact(value) {
  if (typeof value !== 'string' || /TODO|CHANGEME|placeholder|your-email|yourname/i.test(value)) return false
  if (value.startsWith('mailto:')) {
    const address = value.slice(7)
    const match = /^[^\s@?]+@([^\s@?]+\.[^\s@?]+)$/.exec(address)
    return !!match && publicHttps(`https://${match[1]}`)
  }
  return publicHttps(value) && !/^https:\/\/github\.com\/[^/]+\/[^/]+\/(?:issues|discussions)(?:[/?]|$)/i.test(value)
}

export function releaseMetadataErrors(metadata) {
  const failures = []
  const missing = message => failures.push({ category: 'WAITING FOR USER INPUT', message })
  if (!metadata || metadata.schemaVersion !== 1) return [{ category: 'TECHNICAL VALIDATION FAILURE', message: 'Unsupported release-metadata schema.' }]
  if (!publicHttps(metadata.repositoryUrl)) missing('Set the real canonical repositoryUrl.')
  for (const [name, label] of [['security', 'security reporting'], ['conduct', 'Code of Conduct enforcement']]) {
    const channel = metadata[name]
    if (!privateContact(channel?.privateContact)) missing(`Configure a real private ${label} contact/channel.`)
    if (channel?.verified !== true) missing(`Verify private ${label} routing and maintainer receipt; do not merely fill a URL.`)
  }
  if (typeof metadata.conduct?.privateContact === 'string' && /github\.com\/.*\/security\/advisories/i.test(metadata.conduct.privateContact)) {
    missing('A vulnerability advisory channel is not a Code of Conduct enforcement contact.')
  }
  const source = metadata.applicationSource
  if (!publicHttps(source?.url) || !/^[0-9a-f]{40}$/.test(source?.commit ?? '') || !source.url.includes(source.commit)) {
    missing('Record the exact release source URL containing its full source commit, not only a moving repository branch.')
  }
  if (source?.verified !== true) missing('Verify public access to the exact corresponding application source.')
  if (metadata.runtimeNotices?.status !== 'complete' || !metadata.runtimeNotices?.evidence) {
    failures.push({ category: 'TECHNICAL VALIDATION FAILURE', message: 'Runtime notice review is unresolved.' })
  }
  if (metadata.liberationSource?.status !== 'complete' || !metadata.liberationSource?.reviewEvidence || !publicHttps(metadata.liberationSource?.distributionUrl)) {
    failures.push({ category: 'NEEDS EXTERNAL/LEGAL REVIEW', message: 'Liberation source-distribution review/accessible source arrangement is unresolved.' })
  }
  return failures
}
