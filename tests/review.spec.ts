import { expect, test, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'

const fixture = {
  type: 'oneword-study-pack', schemaVersion: 1, id: 'review-pack', title: 'Review fixture', description: 'Synthetic review content', createdAt: '2026-09-17T00:00:00.000Z', updatedAt: '2026-09-17T00:00:00.000Z',
  decks: [{ id: 'review-deck', packId: 'review-pack', title: 'Review deck', order: 0 }],
  cards: [0, 1, 2].map(i => ({ id: `review-card-${i}`, deckId: 'review-deck', front: { text: `Recall question ${i}` }, back: { text: `Recall answer ${i}` }, order: i, revision: 1 })),
}
const failures = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const list: string[] = []; failures.set(page, list)
  page.on('pageerror', error => list.push(error.message)); page.on('console', message => { if (message.type() === 'error') list.push(message.text()) })
})
test.afterEach(async ({ page }) => { expect(failures.get(page)).toEqual([]) })
async function seed(page: Page) {
  await page.goto('/'); await page.getByRole('button', { name: 'Học / Flashcards' }).click()
  await page.getByRole('button', { name: 'Nhập Study Pack', exact: true }).click()
  await page.getByLabel('JSON Study Pack', { exact: true }).fill(JSON.stringify(fixture))
  await page.getByRole('button', { name: 'Kiểm tra và xem trước' }).click(); await page.getByRole('button', { name: 'Xác nhận nhập Study Pack' }).click()
  await expect(page.getByRole('article')).toContainText('Recall question 0')
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
}
async function enter(page: Page) { await page.getByRole('button', { name: 'Ôn theo lịch', exact: true }).click(); await expect(page.getByRole('article', { name: 'Thẻ ôn hiện tại' })).toContainText('Recall question') }
const panel = (page: Page) => page.getByRole('region', { name: 'Ôn theo lịch', exact: true })
async function readReview(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('oneword-reader'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    try { return await new Promise<{ generation: number; data: { settings: { newPerDay: number; timeZone: string }; schedules: { cardId: string; revision: number; state: { due: string; reps: number } | null }[]; events: { id: string; cardId: string; contentRevision: number }[]; undos: { eventId: string }[] } }>((resolve, reject) => { const r = db.transaction('review').objectStore('review').get('review'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) }) } finally { db.close() }
  })
}
async function good(page: Page) { await panel(page).getByRole('button', { name: 'Mở đáp án', exact: true }).click(); await panel(page).getByRole('button', { name: /3 · Nhớ/ }).click(); await expect(panel(page).getByRole('status')).toContainText('Đã lưu đánh giá') }

test('front → recall → reveal → Good → next → reload persists; scheduling works offline with no upload', async ({ page, context, baseURL }, info) => {
  const unexpected: string[] = []; page.on('request', r => { if (r.method() !== 'GET' || new URL(r.url()).origin !== baseURL) unexpected.push(r.url()) })
  await seed(page); await enter(page)
  await expect(panel(page).getByText('Recall answer 0', { exact: true })).toHaveCount(0)
  await expect(panel(page).getByRole('button', { name: /3 · Nhớ/ })).toHaveCount(0)
  await panel(page).focus(); await page.keyboard.press('3'); expect((await readReview(page)).data.events).toEqual([])
  await context.setOffline(true)
  await panel(page).focus(); await page.keyboard.press('Space')
  await expect(panel(page).getByRole('article')).toContainText('Recall question 0'); await expect(panel(page).getByRole('article')).toContainText('Recall answer 0')
  await page.screenshot({ path: 'artifacts/m3b-review-reveal.png', fullPage: true })
  await panel(page).getByRole('button', { name: /3 · Nhớ/ }).click()
  await expect(panel(page).getByRole('article')).toContainText('Recall question 1')
  const before = await readReview(page); expect(before.data.events).toHaveLength(1); expect(before.data.schedules[0].state!.reps).toBe(1)
  await context.setOffline(false); await page.reload(); await page.getByRole('button', { name: 'Học / Flashcards' }).click(); await enter(page)
  await expect(panel(page).getByRole('article')).toContainText('Recall question 1')
  expect(await readReview(page)).toEqual(before); expect(unexpected).toEqual([])
  const evidence = { before, reloaded: await readReview(page), unexpected, errors: failures.get(page) }
  await writeFile('artifacts/m3b-review-privacy.json', JSON.stringify(evidence, null, 2)); await info.attach('review-reload-offline-privacy', { body: JSON.stringify(evidence), contentType: 'application/json' })
})

test('rapid double rating and keyboard repeat accept exactly one event; form controls ignore shortcuts', async ({ page }) => {
  await seed(page); await enter(page)
  await panel(page).getByRole('button', { name: 'Mở đáp án' }).click()
  await panel(page).dispatchEvent('keydown', { key: '3', code: 'Digit3', repeat: true, bubbles: true })
  expect((await readReview(page)).data.events).toHaveLength(0)
  await panel(page).getByText('Thiết lập ôn', { exact: true }).click(); await panel(page).getByLabel('Thẻ mới mỗi ngày').focus(); await page.keyboard.press('3')
  expect((await readReview(page)).data.events).toHaveLength(0)
  await panel(page).getByRole('button', { name: /3 · Nhớ/ }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click() })
  await expect(panel(page).getByRole('article')).toContainText('Recall question 1')
  const double = await readReview(page); expect(double.data.events).toHaveLength(1); expect(double.data.schedules[0].revision).toBe(1)
  await panel(page).dispatchEvent('keydown', { key: '3', code: 'Digit3', repeat: true, bubbles: true })
  expect(await readReview(page)).toEqual(double)
  await writeFile('artifacts/m3b-double-submit.json', JSON.stringify(double, null, 2))
})

test('Undo restores scheduler snapshot and new-card allowance, retaining immutable audit', async ({ page }) => {
  await seed(page); await enter(page); const initial = await readReview(page)
  await good(page); const rated = await readReview(page)
  await panel(page).getByRole('button', { name: 'Hoàn tác lượt ôn' }).click()
  await expect(panel(page).getByRole('article')).toContainText('Recall question 0')
  await expect(panel(page).getByRole('button', { name: /3 · Nhớ/ })).toHaveCount(0)
  const undo = await readReview(page)
  expect(undo.data.events).toEqual(rated.data.events); expect(undo.data.undos).toMatchObject([{ eventId: rated.data.events[0].id }])
  expect(undo.data.schedules[0]).toMatchObject({ state: null, revision: 2 })
  await expect(panel(page).getByTestId('review-counts')).toContainText('hôm nay: 20')
  await page.reload(); expect(await readReview(page)).toEqual(undo)
  await writeFile('artifacts/m3b-undo.json', JSON.stringify({ initial, rated, undo }, null, 2))
})

test('two real tabs reject a stale schedule without overwriting the accepted review', async ({ page, context }) => {
  await seed(page); await enter(page); await panel(page).getByRole('button', { name: 'Mở đáp án' }).click()
  const other = await context.newPage(), errors: string[] = []; other.on('pageerror', e => errors.push(e.message)); other.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await other.goto('/'); await other.getByRole('button', { name: 'Học / Flashcards' }).click(); await enter(other); await good(other)
  const accepted = await readReview(other)
  await panel(page).getByRole('button', { name: /3 · Nhớ/ }).click()
  await expect(panel(page).getByRole('status')).toContainText('đã đổi ở tab khác')
  await expect(panel(page).getByRole('article')).toContainText('Recall question 1')
  expect(await readReview(page)).toEqual(accepted); expect(errors).toEqual([])
  await writeFile('artifacts/m3b-two-tabs.json', JSON.stringify({ accepted, afterStale: await readReview(page), errors }, null, 2)); await other.close()
})

test('transaction failure leaves no partial event/schedule and supports retry', async ({ page }) => {
  await seed(page); await enter(page); const before = await readReview(page)
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) { if (this.name === 'review') { IDBObjectStore.prototype.put = original; throw new DOMException('Synthetic quota failure', 'QuotaExceededError') }; return original.apply(this, args) }
  })
  await goodAttempt(page)
  await expect(panel(page).getByRole('status')).toContainText('Chưa lưu được thao tác')
  expect(await readReview(page)).toEqual(before)
  await panel(page).getByRole('button', { name: 'Thử lại thao tác' }).click()
  await expect(panel(page).getByRole('status')).toContainText('Đã lưu đánh giá')
  expect((await readReview(page)).data.events).toHaveLength(1)
})
async function goodAttempt(page: Page) { await panel(page).getByRole('button', { name: 'Mở đáp án' }).click(); await panel(page).getByRole('button', { name: /3 · Nhớ/ }).click() }

test('Personal Backup5 clear/restore preserves exact schedule/history/settings; Study Pack stays content-only', async ({ page, context, baseURL }, info) => {
  await seed(page); await enter(page)
  await panel(page).getByText('Thiết lập ôn', { exact: true }).click(); await panel(page).getByLabel('Thẻ mới mỗi ngày').fill('7'); await panel(page).getByRole('button', { name: 'Lưu giới hạn' }).click()
  await expect(panel(page).getByRole('status')).toContainText('Đã lưu giới hạn'); await good(page)
  const before = await readReview(page)
  await page.getByRole('button', { name: 'Đọc', exact: true }).click()
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Xuất sao lưu', exact: true }).click()
  const path = info.outputPath('review-backup.json'); await (await download).saveAs(path)
  const backup = JSON.parse(await readFile(path, 'utf8')); expect(backup.schemaVersion).toBe(5); expect(backup.data.review).toEqual(before.data)
  await page.goto('about:blank'); const cdp = await context.newCDPSession(page); await cdp.send('Storage.clearDataForOrigin', { origin: baseURL!, storageTypes: 'indexeddb' })
  await page.goto('/'); await page.getByLabel('Chọn tệp sao lưu').setInputFiles(path); await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click(); await expect(page.getByText('Đã khôi phục bằng một transaction. Dữ liệu có sẵn được giữ nguyên.', { exact: true })).toBeVisible()
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  expect((await readReview(page)).data).toEqual(before.data)
  await page.getByRole('button', { name: 'Học / Flashcards' }).click()
  const packDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Xuất Study Pack', exact: true }).click()
  const packPath = info.outputPath('content.json'); await (await packDownload).saveAs(packPath)
  expect(JSON.parse(await readFile(packPath, 'utf8'))).toEqual(fixture)
  await writeFile('artifacts/m3b-backup-restore.json', JSON.stringify({ before: before.data, restored: (await readReview(page)).data, backupVersion: backup.schemaVersion }, null, 2))
})

test('daily limit persists and narrow keyboard review ignores held keys', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await seed(page); await enter(page)
  await panel(page).getByText('Thiết lập ôn', { exact: true }).click(); await panel(page).getByLabel('Thẻ mới mỗi ngày').fill('1'); await panel(page).getByRole('button', { name: 'Lưu giới hạn' }).click()
  await expect(panel(page).getByRole('status')).toContainText('Đã lưu giới hạn')
  await panel(page).focus(); await page.keyboard.press('Space'); await page.screenshot({ path: 'artifacts/m3b-review-mobile.png', fullPage: true }); await page.keyboard.press('3')
  await expect(panel(page)).toContainText('Chưa có thẻ có thể ôn lúc này')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const before = await readReview(page); await page.reload(); await page.getByRole('button', { name: 'Học / Flashcards' }).click(); await page.getByRole('button', { name: 'Ôn theo lịch', exact: true }).click()
  await expect(panel(page)).toContainText('Chưa có thẻ có thể ôn lúc này'); expect((await readReview(page)).data).toEqual(before.data)
})

test('study-day rollover uses persisted timezone even after the device timezone changes', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Ho_Chi_Minh' })
  await page.clock.setFixedTime(new Date('2026-09-17T16:59:00.000Z'))
  await seed(page); await enter(page)
  await panel(page).getByText('Thiết lập ôn', { exact: true }).click(); await panel(page).getByLabel('Thẻ mới mỗi ngày').fill('1'); await panel(page).getByRole('button', { name: 'Lưu giới hạn' }).click()
  await expect(panel(page).getByRole('status')).toContainText('Đã lưu giới hạn'); await good(page)
  const before = await readReview(page)
  await expect(panel(page)).toContainText('Chưa có thẻ có thể ôn lúc này')
  await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'UTC' })
  await page.clock.setFixedTime(new Date('2026-09-17T17:00:00.000Z'))
  await panel(page).getByRole('button', { name: 'Cập nhật hàng đợi' }).click()
  await expect(panel(page).getByRole('article')).toContainText('Recall question 1')
  expect((await readReview(page)).data.settings.timeZone).toBe(before.data.settings.timeZone)
  await good(page); expect((await readReview(page)).data.events).toHaveLength(2)
  await writeFile('artifacts/m3b-timezone.json', JSON.stringify({ before, after: await readReview(page) }, null, 2))
})
