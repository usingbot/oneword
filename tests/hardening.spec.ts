import { expect, test } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { libraryFixture } from './fixtures/library'
import { databaseSnapshot, seedDatabase } from './fixtures/browser-library'
import { exportBackup } from '../src/application/backup'
import { emptyLibrary } from '../src/application/library'

test.use({ hasTouch: true })

test('manifest, installed shell, offline Reader/PDF text, review, quiz and local backup; no uploads', async ({ page, context }, info) => {
  const data = libraryFixture(), original = data.documents[0]
  data.documents = [{ ...original, source: 'pdf', pdf: { pageCount: 1, extractor: 'synthetic-fixture', extractedAt: original.createdAt, pages: [{ number: 1, start: 0, end: original.original.length, warnings: [] }] } }]
  const requests: { method: string; url: string }[] = [], errors: string[] = []
  context.on('request', r => requests.push({ method: r.method(), url: r.url() })); page.on('pageerror', e => errors.push(e.message))
  await seedDatabase(page, data); await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến', { timeout: 30000 })
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json())
  expect(manifest).toMatchObject({ name: 'OneWord — Đọc và học trên thiết bị', short_name: 'OneWord', start_url: '/', display: 'standalone' })
  for (const icon of manifest.icons) { const response = await context.request.get(icon.src); expect(response.ok()).toBe(true); const bytes = await response.body(); expect(bytes.readUInt32BE(16)).toBe(Number(icon.sizes.split('x')[0])) }
  const installability = await context.newCDPSession(page); await installability.send('Page.enable'); const installErrors = await installability.send('Page.getInstallabilityErrors'); expect(installErrors.installabilityErrors).toEqual([])
  await context.setOffline(true); await page.close(); const offline = await context.newPage(); offline.on('pageerror', e => errors.push(e.message)); await offline.goto('/')
  await expect(offline.getByLabel('Nội dung văn bản')).toHaveValue(original.original)
  await expect(offline.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  await offline.getByRole('button', { name: 'Đọc tiếp', exact: true }).click(); await offline.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
  await offline.getByRole('button', { name: 'Học / Flashcards' }).click(); await offline.getByRole('button', { name: 'Ôn theo lịch', exact: true }).click(); await offline.getByRole('button', { name: 'Mở đáp án', exact: true }).click(); await offline.getByRole('button', { name: /3 · Nhớ/ }).click(); await expect(offline.getByRole('status').filter({ hasText: 'Đã lưu đánh giá.' })).toBeVisible()
  await offline.getByRole('button', { name: 'Trở về nội dung' }).click(); await offline.getByRole('button', { name: 'Quiz', exact: true }).click(); await expect(offline.getByRole('article', { name: 'Câu quiz', exact: true })).toBeVisible()
  const beforeQuiz = await databaseSnapshot(offline); await offline.getByRole('radio', { name: 'First answer', exact: true }).click(); await expect(offline.getByRole('radio', { name: 'First answer', exact: true })).toBeChecked()
  const afterQuiz = await databaseSnapshot(offline); expect(afterQuiz.records.review).toEqual(beforeQuiz.records.review)
  await offline.getByRole('button', { name: 'Đọc', exact: true }).click(); const download = offline.waitForEvent('download'); await offline.getByRole('button', { name: 'Xuất sao lưu', exact: true }).click(); const path = info.outputPath('offline-backup.json'); await (await download).saveAs(path); const backup = JSON.parse(await readFile(path, 'utf8')); expect(backup.data.quizAttempts).toHaveLength(2); expect(backup.data.review.events).toHaveLength(2)
  const caches = await offline.evaluate(async () => { const result = []; for (const name of await window.caches.keys()) result.push({ name, urls: (await (await window.caches.open(name)).keys()).map(r => r.url) }); return result })
  expect(caches.flatMap(c => c.urls).every(u => new URL(u).origin === new URL(offline.url()).origin)).toBe(true)
  expect(caches.flatMap(c => c.urls).some(u => /backup|Synthetic|attempt-|\.pdf$/.test(u))).toBe(false)
  expect(requests.every(r => r.method === 'GET' && new URL(r.url).origin === new URL(offline.url()).origin)).toBe(true); expect(errors).toEqual([])
  await writeFile('artifacts/m4a-offline-privacy.json', JSON.stringify({ installErrors, requests, caches, beforeQuiz, afterQuiz, errors }, null, 2))
})

test('uncached essential HTTPS image fails gracefully offline without caching or scoring wrong', async ({ page, context }) => {
  const data = libraryFixture(); data.quizActiveAttemptId = null
  const pack = structuredClone(data.packs[0]); pack.questions![0].image = { url: 'https://media.example.test/offline-required.png', alt: 'Uncached required image', essential: true }; data.packs = [pack]
  await seedDatabase(page, data); await page.goto('/'); await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến')
  await page.getByRole('button', { name: 'Học / Flashcards' }).click(); await page.getByRole('button', { name: 'Quiz', exact: true }).click(); await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click()
  await context.setOffline(true); await page.getByRole('button', { name: 'Tải ảnh câu hỏi' }).click(); await expect(page.getByRole('status').filter({ hasText: 'Không tải được ảnh' })).toBeVisible()
  await page.getByRole('button', { name: 'Đánh dấu ảnh không khả dụng' }).click(); await page.getByRole('button', { name: 'Nộp toàn bài', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận nộp bài' }).click(); await expect(page.getByRole('region', { name: 'Kết quả quiz', exact: true })).toContainText('0 / 1')
  expect(await page.evaluate(async () => !!await caches.match('https://media.example.test/offline-required.png'))).toBe(false)
})

for (const era of [1, 2, 3, 4, 5]) test(`historical native database era ${era} migrates with reader, content and personal state intact`, async ({ page }) => {
  const data = libraryFixture(); data.draft = { documentId: data.activeDocumentId, text: 'Historical draft preserved' }
  if (era === 3 || era === 4) data.packs = data.packs.map(({ quizzes: _q, questions: _questions, ...pack }) => { void _q; void _questions; return { ...pack, schemaVersion: 1 } })
  await seedDatabase(page, data, era); await page.goto('/'); await expect(page.getByLabel('Nội dung văn bản')).toHaveValue('Historical draft preserved'); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  const after = await databaseSnapshot(page); expect(after.version).toBe(50); expect(after.records.documents).toEqual(data.documents)
  expect(after.records.packs).toEqual(era >= 3 ? data.packs : [])
  if (era >= 4) expect(after.records.review[0]).toMatchObject({ data: data.review })
  if (era >= 5) expect(after.records.quiz[0]).toMatchObject({ attempts: data.quizAttempts, activeAttemptId: data.quizActiveAttemptId })
  await writeFile(`artifacts/m4a-migration-v${era}.json`, JSON.stringify(after, null, 2))
})

for (const corruption of ['reference', 'record', 'future', 'interrupted']) test(`failed startup (${corruption}) preserves the real database and gives recovery guidance`, async ({ page }) => {
  const data = libraryFixture()
  if (corruption === 'reference') data.positions = [{ ...data.positions[0], revisionId: '00000000-0000-4000-8000-000000000099' }]
  if (corruption === 'record') data.review = { ...data.review, events: [{ ...data.review.events[0], sequence: -1 }] }
  await seedDatabase(page, data, corruption === 'future' ? 6 : 4); const before = await databaseSnapshot(page)
  if (corruption === 'interrupted') await page.addInitScript(() => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(value, ...args) { if (this.name === 'meta' && value.schemaVersion === 5) throw new DOMException('Synthetic migration interruption', 'AbortError'); return put.call(this, value, ...args) } })
  await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('Chưa lưu được'); await expect(page.getByRole('alert')).toContainText('Không tự xóa hoặc ghi đè kho')
  const after = await databaseSnapshot(page); expect(after).toEqual(before); await writeFile(`artifacts/m4a-migration-failure-${corruption}.json`, JSON.stringify({ before, after }, null, 2))
})

test('narrow touch and keyboard flows, reduced motion, modal focus and truthful quota failure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await seedDatabase(page, libraryFixture()); await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  await page.getByRole('region', { name: 'Trình đọc', exact: true }).focus(); await page.keyboard.press('Space'); await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeVisible(); await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).tap(); await page.getByRole('button', { name: 'Tạm dừng', exact: true }).tap(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'artifacts/m4a-mobile-reader.png', fullPage: true })
  const source = page.getByLabel('Nội dung văn bản'); await source.focus(); await page.keyboard.press('End'); await page.keyboard.type(' draft'); await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toHaveCount(0); await page.getByRole('button', { name: 'Áp dụng thay đổi' }).click()
  await page.getByRole('button', { name: 'Mở toàn màn hình' }).click(); await expect(page.getByRole('button', { name: 'Thoát toàn màn hình' })).toBeInViewport(); await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Học / Flashcards' }).click(); await page.getByRole('button', { name: 'Ôn theo lịch', exact: true }).click(); const review = page.getByRole('region', { name: 'Ôn theo lịch', exact: true }); await review.focus(); await page.keyboard.press('Space')
  for (const button of await review.locator('.review-ratings button').all()) { const box = await button.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44) }
  await page.screenshot({ path: 'artifacts/m4a-mobile-review.png', fullPage: true }); await page.keyboard.press('3'); await expect(review.getByRole('status')).toContainText('Đã lưu đánh giá')
  await page.getByRole('button', { name: 'Trở về nội dung' }).click(); await page.getByRole('button', { name: 'Quiz', exact: true }).click(); await page.getByRole('radio', { name: 'First answer', exact: true }).focus(); await page.keyboard.press('Space'); await expect(page.getByRole('radio', { name: 'First answer', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Nộp toàn bài', exact: true }).focus(); await page.keyboard.press('Enter'); await page.getByRole('button', { name: 'Quay lại làm bài' }).press('Enter'); await expect(page.getByRole('button', { name: 'Nộp toàn bài', exact: true })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'artifacts/m4a-mobile-quiz.png', fullPage: true })
  await page.setViewportSize({ width: 320, height: 640 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Đọc', exact: true }).click(); await page.getByLabel('Chọn tệp sao lưu').setInputFiles({ name: 'empty.json', mimeType: 'application/json', buffer: Buffer.from(exportBackup(emptyLibrary())) })
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Shift+Tab'); await expect(page.getByRole('button', { name: 'Hủy khôi phục' })).toBeFocused(); await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Xác nhận khôi phục' })).toBeFocused(); await page.keyboard.press('Escape'); await expect(page.getByLabel('Chọn tệp sao lưu')).toBeFocused()
  expect(await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).evaluate(e => getComputedStyle(e).transitionDuration)).toBe('0s')
  await page.evaluate(() => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(...args) { if (this.name === 'documents') { IDBObjectStore.prototype.put = put; throw new DOMException('Synthetic quota', 'QuotaExceededError') }; return put.apply(this, args) } })
  await source.fill('Recoverable memory after failed write'); await page.getByRole('button', { name: 'Áp dụng thay đổi' }).click(); await expect(page.getByTestId('save-status')).toHaveText('Chưa lưu được'); await expect(source).toHaveValue('Recoverable memory after failed write'); await expect(page.getByRole('alert')).toContainText('Xuất sao lưu')
  await page.screenshot({ path: 'artifacts/m4a-mobile-recovery.png', fullPage: true })
})

for (const outcome of ['denied', 'rejected']) test(`persistent storage ${outcome} is optional and never claims permanence`, async ({ page }) => {
  await page.addInitScript(outcome => { Object.assign(window, { persistRequests: 0 }); navigator.storage.persist = async () => { const state = window as unknown as { persistRequests: number }; state.persistRequests++; if (outcome === 'rejected') throw new Error('Synthetic unavailable API'); return false } }, outcome)
  await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị'); expect(await page.evaluate(() => (window as unknown as { persistRequests: number }).persistRequests)).toBe(0)
  await page.getByText('Ngoại tuyến, cài đặt và sao lưu', { exact: true }).click(); await page.getByRole('button', { name: 'Ưu tiên giữ dữ liệu trên thiết bị' }).click(); await expect(page.getByRole('status').filter({ hasText: outcome === 'denied' ? 'Trình duyệt chưa cấp' : 'Không yêu cầu được' })).toBeVisible()
  await page.getByLabel('Nội dung văn bản').fill('Still usable without persistence grant'); await page.getByRole('button', { name: 'Dùng văn bản', exact: false }).click(); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
})
