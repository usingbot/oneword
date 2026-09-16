import { test, expect, type Page } from '@playwright/test'

const words = 'Một hai ba bốn năm sáu bảy tám chín mười.'
async function load(page: Page, value = words) {
  await page.goto('/')
  await page.getByLabel('Nội dung văn bản').fill(value)
  await page.getByRole('button', { name: 'Dùng văn bản' }).click()
}

test('paste, revision, immutable original, undo and dirty-state guard', async ({ page }) => {
  const original = 'informa-\ntion well-being x-ray -4 A-B'
  await load(page, original)
  await page.getByText('Xem bản gốc · không chỉnh sửa').click()
  await expect(page.getByTestId('original-text')).toHaveText(original)
  await page.getByLabel('Nội dung văn bản').fill('information well-being x-ray -4 A-B')
  await expect(page.getByRole('button', { name: 'Đọc tiếp', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Áp dụng thay đổi' }).click()
  await expect(page.getByTestId('current-chunk')).toHaveText('information')
  await expect(page.getByTestId('original-text')).toHaveText(original)
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  await expect(page.getByLabel('Nội dung văn bản')).toHaveValue(original)
  await expect(page.getByTestId('current-chunk')).toHaveText('informa-')
})

test('TXT import, file errors and whitespace-only input', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mở tệp TXT').setInputFiles({ name: 'tieng-viet.txt', mimeType: 'text/plain', buffer: Buffer.from(words) })
  await expect(page.getByTestId('current-chunk')).toHaveText('Một')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByLabel('Mở tệp TXT').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from([255, 254]) })
  await expect(page.getByRole('alert')).toContainText('UTF-8')
  await expect(page.getByTestId('current-chunk')).toHaveText('Một')
  await page.getByLabel('Mở tệp TXT').setInputFiles({ name: 'empty.txt', mimeType: 'text/plain', buffer: Buffer.from(' \n ') })
  await expect(page.getByRole('button', { name: 'Đọc tiếp', exact: true })).toBeDisabled()
})

test('group sizes, custom count, sentence mode and text-entry keyboard isolation', async ({ page }) => {
  await load(page, words + ' Câu tiếp theo.')
  for (const count of [1, 2, 3, 4, 5]) {
    await page.getByRole('button', { name: String(count), exact: true }).click()
    await expect(page.getByTestId('current-chunk')).toHaveText(words.split(' ').slice(0, count).join(' '))
  }
  await page.getByLabel('Số từ tùy chỉnh').fill('7')
  await expect(page.getByTestId('current-chunk')).toHaveText('Một hai ba bốn năm sáu bảy')
  await page.getByRole('button', { name: 'Cả câu', exact: true }).click()
  await expect(page.getByTestId('current-chunk')).toHaveText(words)
  await page.getByRole('button', { name: 'Tiến một lượt' }).click()
  await expect(page.getByTestId('current-chunk')).toHaveText('Câu tiếp theo.')
  await page.getByLabel('Nội dung văn bản').focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('current-chunk')).toHaveText('Câu tiếp theo.')
})

test('browser clock: proportional timing, pause/resume, last word and rewind', async ({ page }) => {
  const start = new Date('2026-09-16T12:00:00Z')
  await page.clock.install({ time: start })
  await page.clock.pauseAt(start)
  await load(page, 'a b c d e f g')
  await page.getByLabel('Nghỉ thêm ở dấu câu').uncheck()
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('region', { name: 'Trình đọc', exact: true }).focus()
  await page.keyboard.press('Space')
  await page.clock.runFor(599)
  await expect(page.getByTestId('current-chunk')).toHaveText('a b c')
  await page.clock.runFor(1)
  await expect(page.getByTestId('current-chunk')).toHaveText('d e f')
  await page.keyboard.press('Space')
  await page.clock.runFor(20_000)
  await expect(page.getByTestId('current-chunk')).toHaveText('d e f')
  await page.keyboard.press('Space')
  await page.clock.runFor(600)
  await expect(page.getByTestId('current-chunk')).toHaveText('g')
  await page.clock.runFor(199)
  await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeEnabled()
  await page.clock.runFor(1)
  await expect(page.getByRole('button', { name: 'Đọc lại', exact: true })).toBeEnabled()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('current-chunk')).toHaveText('d e f')
})

test('native fullscreen, one exit control, context and exit preserving position', async ({ page }) => {
  await load(page)
  await page.getByRole('button', { name: 'Tiến một lượt' }).click()
  await page.getByRole('button', { name: 'Mở toàn màn hình' }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await expect(page.getByRole('button', { name: 'Thoát toàn màn hình' })).toHaveCount(1)
  await expect(page.locator('.reader-stage')).toHaveClass(/is-focus/)
  await page.getByRole('button', { name: 'Ngữ cảnh', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(words)
  await page.getByRole('button', { name: 'Đóng ngữ cảnh' }).click()
  await page.screenshot({ path: 'artifacts/fullscreen.png' })
  await page.getByRole('button', { name: 'Thoát toàn màn hình' }).click()
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true)
  await expect(page.getByTestId('current-chunk')).toHaveText('hai')
})

test('fullscreen rejection falls back to focus view; Escape exits', async ({ page }) => {
  await page.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.reject(new Error('Denied for test')) })
  await load(page)
  await page.getByRole('button', { name: 'Mở toàn màn hình' }).click()
  await expect(page.locator('.reader-stage')).toHaveClass(/is-focus/)
  await page.keyboard.press('Escape')
  await expect(page.locator('.reader-stage')).not.toHaveClass(/is-focus/)
  await expect(page.getByRole('button', { name: 'Mở toàn màn hình' })).toBeFocused()
})

test('context pauses playback and offers accessible static text', async ({ page }) => {
  await page.clock.install()
  await load(page)
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
  await page.getByRole('button', { name: 'Ngữ cảnh', exact: true }).click()
  await page.clock.runFor(20_000)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByTestId('current-chunk')).toHaveText('Một')
  await expect(page.getByRole('button', { name: 'Đóng ngữ cảnh' })).toBeFocused()
})

test('no text uploads, no storage writes, no runtime errors', async ({ page }) => {
  const failures: string[] = []
  const requests: string[] = []
  page.on('pageerror', (e) => failures.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') failures.push(m.text()) })
  page.on('request', (r) => { if (r.method() !== 'GET' || !r.url().startsWith('http://127.0.0.1:4173/')) requests.push(r.url()) })
  await load(page, '<script>alert("hello")</script> PRIVATE_LOCAL_TEXT')
  await page.getByRole('button', { name: 'Tiến một lượt' }).click()
  await expect(page.getByTestId('current-chunk')).toHaveText('PRIVATE_LOCAL_TEXT')
  expect(await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, databases: (await indexedDB.databases()).length }))).toEqual({ local: 0, session: 0, databases: 0 })
  expect(requests).toEqual([])
  expect(failures).toEqual([])
})

test('narrow viewport, long content, reduced motion and screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await load(page, 'a'.repeat(180))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Mở toàn màn hình' }).click()
  const overflows = await page.getByTestId('current-chunk').evaluate((element) => element.scrollWidth > element.clientWidth)
  expect(overflows).toBe(false)
  await page.screenshot({ path: 'artifacts/mobile-focus.png' })
})

test('workspace screenshot', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Thử một đoạn ngắn/ }).click()
  await page.screenshot({ path: 'artifacts/workspace.png', fullPage: true })
})

test('visibility adapter: simulated hidden event pauses without catch-up', async ({ page }) => {
  const start = new Date('2026-09-16T12:00:00Z')
  await page.clock.install({ time: start })
  await page.clock.pauseAt(start)
  await load(page)
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
  // An event without hidden state is not evidence of backgrounding and must not pause.
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeEnabled()
  await page.clock.runFor(75)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(60_000)
  await expect(page.getByTestId('current-chunk')).toHaveText('Một')
  await expect(page.getByRole('button', { name: 'Đọc tiếp', exact: true })).toBeEnabled()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(60_000)
  await expect(page.getByTestId('current-chunk')).toHaveText('Một')
  await expect(page.getByRole('button', { name: 'Đọc tiếp', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
  await page.clock.runFor(124)
  await expect(page.getByTestId('current-chunk')).toHaveText('Một')
  await page.clock.runFor(1)
  await expect(page.getByTestId('current-chunk')).toHaveText('hai')
})
