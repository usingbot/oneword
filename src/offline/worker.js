/* global self, caches, fetch, URL, Request, Response */
// Build-generated allowlist. This worker deliberately never opens IndexedDB.
const BUILD = __BUILD__ // eslint-disable-line no-undef
const ASSETS = __ASSETS__ // eslint-disable-line no-undef
const PREFIX = 'oneword-shell-'
const CACHE = PREFIX + BUILD
const allowed = new Set(ASSETS.map(a => a.url))
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    try {
      // An interrupted/partial deployment cannot replace the installed shell.
      await Promise.all(ASSETS.map(async asset => {
        const response = await fetch(new Request(asset.url, { cache: 'reload', integrity: asset.integrity, credentials: 'same-origin' }))
        if (!response.ok || response.type === 'opaque' || response.redirected) throw new Error('Incomplete application build')
        await cache.put(asset.url, response)
      }))
    } catch (error) { await caches.delete(CACHE); throw error }
  })())
  // No automatic skipWaiting: active study sessions keep their code.
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Keep the previous shell for old hashed lazy imports in an existing page.
    const keys = (await caches.keys()).filter(k => k.startsWith(PREFIX) && k !== CACHE)
    if ((await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).length <= 1) {
      await Promise.all(keys.slice(0, -1).map(key => caches.delete(key)))
    }
    await self.clients.claim()
  })())
})
self.addEventListener('message', event => {
  if (event.data?.type !== 'ACTIVATE_ONEWORD' || !event.source || !event.ports[0]) return
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (windows.length !== 1 || windows[0].id !== event.source.id) { event.ports[0].postMessage({ ok: false, reason: 'tabs' }); return }
    event.ports[0].postMessage({ ok: true }); await self.skipWaiting()
  })())
})
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  const navigation = request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')
  if (!navigation && !allowed.has(url.pathname) && !url.pathname.startsWith('/assets/')) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE), key = navigation ? '/index.html' : url.pathname
    const response = await cache.match(key)
    if (response) return response
    // Old hashed chunks are read only; arbitrary requests are never cached.
    if (url.pathname.startsWith('/assets/')) {
      for (const name of (await caches.keys()).filter(k => k.startsWith(PREFIX))) { const old = await (await caches.open(name)).match(key); if (old) return old }
    }
    try { return await fetch(request) } catch { return new Response('OneWord: tài nguyên chưa có ngoại tuyến. Kết nối lại rồi thử.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }) }
  })())
})
