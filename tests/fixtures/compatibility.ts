import { expect, test as base, type Page, type Request } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { offlineBuild, offlineSnapshot, observeOfflineLifecycle, lifecycleEvents, waitForOfflineShell } from './offline'
import { libraryFixture } from './library'
import { seedDatabase } from './browser-library'

interface CompatibilitySession {
  page: Page
  setupMs: number
  errors: string[]
  requests: { url: string; method: string }[]
}

export async function waitForPdfPreview(page: Page) {
  // Cold PDF module/worker startup is asynchronous. Wait for the real result
  // within the existing test deadline, then let callers assert its contents.
  await page.getByLabel('Văn bản PDF để chỉnh sửa', { exact: true }).waitFor({ state: 'visible' })
}

export const test = base.extend<{ compatibilityOrigin: string; compatibility: CompatibilitySession }>({
  compatibilityOrigin: ['', { option: true }],
  // Cold provisioning has its own bounded budget. The offline user flow keeps
  // the default 30s test timeout and all of its original UI assertions.
  compatibility: [async ({ context, compatibilityOrigin }, use, info) => {
    const started = performance.now(), pending = new Map<Request, { url: string; method: string }>()
    const page = await context.newPage(), requests: { url: string; method: string }[] = []
    const consoleMessages: { type: string; text: string }[] = [], errors: string[] = [], navigations: string[] = []
    context.on('request', request => { const entry = { url: request.url(), method: request.method() }; pending.set(request, entry); requests.push(entry) })
    context.on('requestfinished', request => pending.delete(request))
    context.on('requestfailed', request => pending.delete(request))
    context.on('console', message => consoleMessages.push({ type: message.type(), text: message.text() }))
    page.on('pageerror', error => errors.push(error.message))
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push(frame.url()) })
    await observeOfflineLifecycle(page)
    let initial: Awaited<ReturnType<typeof compatibilityState>> | undefined, installed: typeof initial, setupMs = 0, installLifecycle: unknown[] = []
    try {
      await test.step('prove empty origin before seeding synthetic library', async () => {
        await page.goto(`${compatibilityOrigin}/favicon.svg`)
        initial = await compatibilityState(page)
        expect(initial.registrations).toBe(0); expect(initial.offline.caches).toEqual([])
        expect(initial.databases).toEqual([])
        expect(initial.localStorageKeys).toEqual([]); expect(initial.sessionStorageKeys).toEqual([])
        await seedDatabase(page, libraryFixture(), 5, compatibilityOrigin)
      })
      await test.step('install real shell and verify complete precache plus activated controller', async () => {
        await page.goto(compatibilityOrigin || '/')
        // The old smoke already allowed 30s for readiness. This fixture bounds
        // ALL provisioning and checks real cache/control, not only the label.
        await waitForOfflineShell(page, undefined, 30000)
        await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến')
        installed = await compatibilityState(page)
        expect(installed.offline.waiting).toBeNull()
        installLifecycle = await lifecycleEvents(page)
      })
      setupMs = performance.now() - started
      await use({ page, setupMs, errors, requests })
    }
    finally {
      const state = await compatibilityState(page).catch(error => ({ unavailable: String(error) }))
      const evidence = { status: info.status, setupMs, elapsed: performance.now() - started, initial, installed, installLifecycle, state, pending: [...pending.values()], consoleMessages, errors, navigations, lifecycle: await lifecycleEvents(page).catch(() => []) }
      const body = JSON.stringify(evidence, null, 2)
      await writeFile(`artifacts/rc0-compatibility-${info.project.name}-${info.testId}.json`, body)
      await info.attach('compatibility-state', { body, contentType: 'application/json' })
      await page.close()
    }
  }, { timeout: 30000 }],
})

export async function compatibilityState(page: Page) {
  const offline = await offlineSnapshot(page, await offlineBuild())
  const document = await page.evaluate(async () => ({
    url: location.href, readyState: window.document.readyState,
    headings: [...window.document.querySelectorAll('h1,h2,h3,h4')].map(node => node.textContent),
    dialogs: [...window.document.querySelectorAll('dialog[open],[role="dialog"]')].map(node => node.getAttribute('aria-label') ?? node.getAttribute('aria-labelledby')),
    focus: { tag: window.document.activeElement?.tagName, label: window.document.activeElement?.getAttribute('aria-label') },
    busy: [...window.document.querySelectorAll('[aria-busy="true"],[role="progressbar"]')].map(node => ({ role: node.getAttribute('role'), label: node.getAttribute('aria-label'), busy: node.getAttribute('aria-busy') })),
    checkedChoices: [...window.document.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked')].map(node => node.closest('label')?.textContent),
    databases: await indexedDB.databases(), localStorageKeys: Object.keys(localStorage), sessionStorageKeys: Object.keys(sessionStorage),
    registrations: (await navigator.serviceWorker.getRegistrations()).length,
    permission: await navigator.permissions.query({ name: 'geolocation' }).then(result => result.state).catch(() => 'unavailable'),
  }))
  return { ...document, offline }
}
