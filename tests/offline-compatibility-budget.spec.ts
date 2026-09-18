import { expect } from '@playwright/test'
import { test as compatibilityTest, waitForPdfPreview } from './fixtures/compatibility'
import { heldOfflineServer } from './fixtures/offline-server'
import { libraryFixture } from './fixtures/library'
import { makePdf, simplePages } from './fixtures/pdf'

const test = compatibilityTest.extend({
  compatibilityOrigin: [async ({ baseURL }, use) => {
    expect(baseURL).toBeTruthy()
    const server = await heldOfflineServer()
    let timer: ReturnType<typeof setTimeout> | undefined
    // Deliberately make real provisioning exceed this regression's 5s body
    // budget. The timer is latency injection, never the readiness oracle.
    void server.blocked.then(() => { timer = setTimeout(server.release, 6000) })
    try { await use(server.origin) }
    finally { clearTimeout(timer); await server.close() }
  }, { scope: 'test', timeout: 30000 }],
})

test('cold provisioning cannot consume the independent offline-flow budget', async ({ compatibility, context }, info) => {
  test.setTimeout(5000)
  const { page, setupMs } = compatibility
  expect(setupMs).toBeGreaterThan(info.timeout)
  // All 213 assets and an activated controller were checked by the same fixture
  // as the integration smoke. Prove the remaining user flow still executes.
  await context.setOffline(true); await page.reload()
  await expect(page.getByLabel('Nội dung văn bản')).toHaveValue(libraryFixture().documents[0].original)
  await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến')
})

test.describe('cold PDF result synchronization', () => {
  // Intercept the real module response here, not service-worker precache traffic.
  // The integration smoke separately proves the complete offline flow.
  test.use({ serviceWorkers: 'block' })
  test('a pending PDF import can outlast the default assertion budget and still complete within the test deadline', async ({ page }) => {
    let release: (() => void) | undefined, timer: ReturnType<typeof setTimeout> | undefined
    let heldMs = 0, intercepted = 0
    await page.route('**/assets/pdf-*.js', async route => {
      intercepted++
      const started = performance.now()
      // Delay only delivery of the unmodified production module. No fake result.
      await new Promise<void>(resolve => { release = resolve; timer = setTimeout(resolve, 6000) })
      heldMs = performance.now() - started
      await route.continue()
    })
    try {
      await page.goto('/')
      await expect(page.locator('main#main')).toHaveJSProperty('inert', false)
      await page.getByLabel('Mở tệp PDF', { exact: true }).setInputFiles({ name: 'delayed.pdf', mimeType: 'application/pdf', buffer: makePdf(simplePages) })
      await expect(page.getByRole('dialog', { name: 'Nhập PDF', exact: true }).getByRole('status')).toHaveText('Đang kiểm tra PDF…')
      await waitForPdfPreview(page)
      await expect(page.getByLabel('Văn bản PDF để chỉnh sửa', { exact: true })).toHaveValue(/OneWord PDF private sample/)
      expect(intercepted).toBe(1)
      expect(heldMs).toBeGreaterThan(5000)
    }
    finally { clearTimeout(timer); release?.(); await page.unrouteAll({ behavior: 'wait' }) }
  })
})
