import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

// Test-only switching of two complete Vite outputs; never shipped in dist.
export async function productionServer() {
  for (const build of ['old', 'next']) {
    try { await readFile(`.tools/m4a-update-${build}/sw.js`) }
    catch { throw new Error('Missing production update fixtures. Run npm run test:prepare-updates on Windows after the current build.') }
  }
  const state = { root: resolve('.tools/m4a-update-old'), failIcon: false }
  const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' }
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url!, 'http://localhost').pathname, file = resolve(state.root, '.' + (path === '/' ? '/index.html' : path))
      if (!file.startsWith(state.root + sep)) { res.writeHead(403).end(); return }
      if (state.failIcon && path === '/icons/icon-512.png') { res.writeHead(404).end(); return }
      const body = await readFile(file)
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(body)
    } catch { res.writeHead(404).end() }
  })
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No test server')
  return { state, origin: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done())) }
}
