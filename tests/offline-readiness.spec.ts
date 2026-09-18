import { expect, test, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { libraryFixture } from './fixtures/library'
import { seedDatabase } from './fixtures/browser-library'
import { lifecycleEvents, observeOfflineLifecycle, offlineBuild, offlineSnapshot, waitForOfflineShell } from './fixtures/offline'
import { heldOfflineServer } from './fixtures/offline-server'

async function expectFresh(page: Page) {
  expect(await page.evaluate(async () => ({ registrations: (await navigator.serviceWorker.getRegistrations()).length, caches: await caches.keys() }))).toEqual({ registrations: 0, caches: [] })
}
async function evidence(page: Page, name: string, extra: object = {}) {
  const events = await lifecycleEvents(page) as { event: string; label: string | null; active: { state: string; url: string } | null; controller: { state: string; url: string } | null }[]
  const ready = events.filter(event => event.event === 'label' && event.label?.includes('sẵn sàng ngoại tuyến'))
  expect(ready.length).toBeGreaterThan(0)
  for (const event of ready) {
    expect(event.active?.state).toBe('activated')
    expect(event.controller).toEqual(event.active)
  }
  await writeFile(`artifacts/rc0-offline-${name}.json`, JSON.stringify({ events, ...extra }, null, 2))
}

test('fresh install stays preparing until every precache asset exists, then controls and reloads offline', async ({ page, context }) => {
  const server = await heldOfflineServer(), build = await offlineBuild(), errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  context.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  try {
    await observeOfflineLifecycle(page)
    await seedDatabase(page, libraryFixture(), 5, server.origin); await expectFresh(page)
    await page.goto(server.origin); await server.blocked
    // An explicit response gate creates a partial real cache, without sleeping.
    await expect.poll(async () => (await offlineSnapshot(page, build)).missing, { timeout: 15000 }).toEqual([server.heldPath])
    const incomplete = await offlineSnapshot(page, build)
    expect(incomplete.installing?.state).toBe('installing')
    expect(incomplete.active).toBeNull(); expect(incomplete.controller).toBeNull()
    expect(incomplete.label).toContain('Đang chuẩn bị')
    const beforeRelease = await lifecycleEvents(page)
    server.release()
    const complete = await waitForOfflineShell(page, build)
    await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến')
    const firstEvents = await lifecycleEvents(page)
    await evidence(page, 'fresh-install-ready', { incomplete, beforeRelease, complete, errors })
    await context.setOffline(true); await page.reload()
    await expect(page.getByLabel('Nội dung văn bản')).toHaveValue(libraryFixture().documents[0].original)
    await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến')
    expect(errors).toEqual([])
    await evidence(page, 'fresh-held-asset', { incomplete, beforeRelease, complete, firstEvents, offline: await offlineSnapshot(page, build), errors })
  } finally { await page.goto('about:blank'); await server.close() }
})

test('an existing active install reports ready on reload and a new offline page preserves saved content', async ({ page, context }) => {
  const build = await offlineBuild()
  await observeOfflineLifecycle(page)
  await seedDatabase(page, libraryFixture()); await expectFresh(page); await page.goto('/')
  await waitForOfflineShell(page, build)
  await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến')
  const first = await offlineSnapshot(page, build)
  await page.reload(); await waitForOfflineShell(page, build)
  await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến')
  const existing = await offlineSnapshot(page, build)
  expect(existing.caches).toEqual(first.caches)
  expect(existing.installing).toBeNull(); expect(existing.waiting).toBeNull()
  await evidence(page, 'existing-install', { first, existing })
  await context.setOffline(true); await page.close()
  const offline = await context.newPage(); await offline.goto('/')
  await expect(offline.getByLabel('Nội dung văn bản')).toHaveValue(libraryFixture().documents[0].original)
  await expect(offline.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến')
  expect((await offlineSnapshot(offline, build)).complete).toBe(true)
  await offline.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
  await expect(offline.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeVisible()
})

test('activation before the app observes registration cannot leave preparing stuck', async ({ page, context }) => {
  await observeOfflineLifecycle(page, true)
  await seedDatabase(page, libraryFixture()); await expectFresh(page); await page.goto('/')
  const complete = await waitForOfflineShell(page)
  await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến')
  const events = await lifecycleEvents(page) as { event: string; at: number }[]
  expect(events.find(event => event.event === 'register:delivered')!.at).toBeGreaterThanOrEqual(events.find(event => ['state:activated', 'observed:activated'].includes(event.event))!.at)
  await evidence(page, 'late-registration', { complete })
  await context.setOffline(true); await page.reload()
  await expect(page.getByLabel('Nội dung văn bản')).toHaveValue(libraryFixture().documents[0].original)
  await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến')
})
