import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

// Serve unchanged production bytes. Hold exactly one required precache response
// until the test releases it; the worker/install/cache implementations stay real.
export async function heldOfflineServer() {
  const root = resolve('dist'), heldPath = '/icons/icon-512.png'
  let release!: () => void, reached!: () => void
  const gate = new Promise<void>(done => { release = done }), blocked = new Promise<void>(done => { reached = done })
  const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url!, 'http://localhost').pathname
      const file = resolve(root, '.' + (path === '/' ? '/index.html' : path))
      if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return }
      if (path === heldPath) { reached(); await gate }
      const bytes = await readFile(file)
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes)
    } catch { res.writeHead(404).end() }
  })
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No offline test server')
  return { heldPath, blocked, release, origin: `http://127.0.0.1:${address.port}`,
    close: () => { release(); return new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done())) },
  }
}
