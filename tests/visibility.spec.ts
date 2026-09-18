import { expect, test } from '@playwright/test'

// These checks intentionally use a real headed browser under WSLg. A mocked
// visibilityState would not establish the actual tab-switch acceptance gate.
test.use({ headless: false, trace: 'off', screenshot: 'off', launchOptions: {
  chromiumSandbox: true,
  ignoreDefaultArgs: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
} })

test('real tab blur pauses without catch-up', async ({ page, context }) => {
  await page.goto('/')
  await page.getByLabel('Nội dung văn bản').fill(Array.from({ length: 120 }, (_, i) => `từ${i}`).join(' '))
  await page.getByRole('button', { name: 'Dùng văn bản' }).click()
  await page.getByLabel('Tốc độ', { exact: true }).fill('30')
  // Disable focus emulation to obtain real blur/focus events. This alone does
  // not establish a hidden document; hidden.spec.ts checks that independently.
  const firstSession = await context.newCDPSession(page)
  await firstSession.send('Emulation.setFocusEmulationEnabled', { enabled: false })
  await page.bringToFront()
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
  const other = await context.newPage()
  const secondSession = await context.newCDPSession(other)
  await secondSession.send('Emulation.setFocusEmulationEnabled', { enabled: false })
  await other.goto('about:blank')
  await other.bringToFront()
  await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(false)
  const pausedWord = await page.getByTestId('current-chunk').textContent()
  await expect(page.getByRole('button', { name: 'Đọc tiếp', exact: true })).toBeEnabled()
  await page.waitForTimeout(2200)
  await page.bringToFront()
  await expect(page.getByTestId('current-chunk')).toHaveText(pausedWord!)
  await expect(page.getByRole('button', { name: 'Đọc tiếp', exact: true })).toBeEnabled()
  await other.close()
})

test('native fullscreen exits on Escape and keyboard reaches the controls', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Nội dung văn bản').fill(Array.from({ length: 120 }, (_, i) => `từ${i}`).join(' '))
  await page.getByRole('button', { name: 'Dùng văn bản' }).click()
  await page.getByRole('button', { name: 'Mở toàn màn hình' }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  // The shared WSLg desktop can deliver real pointer moves while a headed
  // assertion is waiting. Inactivity/fade is checked in toolbar.spec.ts with
  // real fullscreen/timers in headless Chromium, isolated from desktop input.
  await expect(page.locator('.reader-stage')).toBeFocused()
  await page.locator('.reader-stage').press('Tab')
  await expect(page.getByRole('button', { name: 'Thoát toàn màn hình' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Lùi một lượt' })).toBeFocused()
  await expect(page.locator('.stage-toolbar')).toHaveCSS('opacity', '1')
  await page.keyboard.press('Escape')
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true)
  await expect(page.locator('.reader-stage')).not.toHaveClass(/is-focus/)
})
