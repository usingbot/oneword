import { expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

export interface OfflineBuild { cache: string; urls: string[] }
export async function offlineBuild(directory = 'dist'): Promise<OfflineBuild> {
  const worker = await readFile(`${directory}/sw.js`, 'utf8')
  const build = JSON.parse(worker.match(/^const BUILD = ("[^"]+")/m)![1]) as string
  const assets = JSON.parse(worker.match(/^const ASSETS = (\[.+\])/m)![1]) as { url: string }[]
  return { cache: `oneword-shell-${build}`, urls: assets.map(asset => asset.url) }
}

export async function offlineSnapshot(page: Page, build: OfflineBuild) {
  return page.evaluate(async expected => {
    const reg = await navigator.serviceWorker.getRegistration()
    const describe = (worker: ServiceWorker | null | undefined) => worker ? { url: worker.scriptURL, state: worker.state } : null
    const names = await caches.keys()
    // Never create a cache while observing whether installation has completed.
    const cached = names.includes(expected.cache) ? (await (await caches.open(expected.cache)).keys()).map(request => new URL(request.url).pathname) : []
    const missing = expected.urls.filter(url => !cached.includes(url))
    return {
      at: performance.now(), controller: describe(navigator.serviceWorker.controller),
      installing: describe(reg?.installing), waiting: describe(reg?.waiting), active: describe(reg?.active),
      controlledByActive: !!reg?.active && navigator.serviceWorker.controller === reg.active,
      caches: names, cached, missing, complete: names.includes(expected.cache) && missing.length === 0,
      label: document.querySelector('[data-testid="offline-status"]')?.textContent ?? null,
    }
  }, build)
}

// This is an installation budget, not a delay before the assertion. Every poll
// reads the real controller/activation state and this build's complete allowlist.
export async function waitForOfflineShell(page: Page, build?: OfflineBuild, budget = 15000) {
  const expected = build ?? await offlineBuild()
  let last: Awaited<ReturnType<typeof offlineSnapshot>> | undefined
  try {
    await expect.poll(async () => {
      last = await offlineSnapshot(page, expected)
      return last.complete && last.controlledByActive && last.active?.state === 'activated'
    }, { timeout: budget, message: 'Complete production precache and activated controlling worker', intervals: [100, 250, 500] }).toBe(true)
  } catch (error) {
    throw new Error(`Offline installation budget exhausted: ${JSON.stringify(last)}`, { cause: error })
  }
  return last!
}

export async function observeOfflineLifecycle(page: Page, deliverRegistrationAfterActivation = false) {
  await page.addInitScript(lateRegistration => {
    if (!('serviceWorker' in navigator)) return
    const events: unknown[] = []
    const target = window as Window & { offlineLifecycle?: unknown[] }
    target.offlineLifecycle = events
    const describe = (worker: ServiceWorker | null | undefined) => worker ? { url: worker.scriptURL, state: worker.state } : null
    let registration: ServiceWorkerRegistration | undefined
    const record = (event: string) => {
      const entry = { event, at: performance.now(), controller: describe(navigator.serviceWorker.controller),
        installing: describe(registration?.installing), waiting: describe(registration?.waiting), active: describe(registration?.active),
        label: document.querySelector('[data-testid="offline-status"]')?.textContent ?? null,
      }
      events.push(entry)
    }
    const seen = new Set<ServiceWorker>()
    const watch = (worker: ServiceWorker | null) => {
      if (!worker || seen.has(worker)) return
      seen.add(worker); record(`observed:${worker.state}`)
      worker.addEventListener('statechange', () => record(`state:${worker.state}`))
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => record('controllerchange'))
    const register = navigator.serviceWorker.register.bind(navigator.serviceWorker)
    navigator.serviceWorker.register = async (...args) => {
      record('register:start')
      const reg = await register(...args)
      registration = reg
      record('register:resolved')
      watch(reg.installing); watch(reg.waiting); watch(reg.active)
      reg.addEventListener('updatefound', () => { record('updatefound'); watch(reg.installing) })
      if (lateRegistration) {
        // Test a genuine completed installation whose events precede the app's
        // register() continuation; do not synthesize readiness or worker events.
        await navigator.serviceWorker.ready
        await new Promise<void>(resolve => {
          const active = reg.active!
          const check = () => {
            if (active.state !== 'activated' || navigator.serviceWorker.controller !== active) return
            active.removeEventListener('statechange', check)
            navigator.serviceWorker.removeEventListener('controllerchange', check)
            resolve()
          }
          active.addEventListener('statechange', check)
          navigator.serviceWorker.addEventListener('controllerchange', check)
          check()
        })
      }
      record('register:delivered')
      return reg
    }
    void navigator.serviceWorker.ready.then(reg => { registration = reg; record('ready-promise') })
    let label: string | null = null
    new MutationObserver(() => {
      const current = document.querySelector('[data-testid="offline-status"]')?.textContent ?? null
      if (current !== label) { label = current; record('label') }
    }).observe(document, { subtree: true, childList: true, characterData: true })
  }, deliverRegistrationAfterActivation)
}

export async function lifecycleEvents(page: Page) {
  return page.evaluate(() => (window as Window & { offlineLifecycle?: unknown[] }).offlineLifecycle ?? [])
}
