import { expect, test, type Page } from '@playwright/test'
import { makePdf, simplePages } from './fixtures/pdf'
import { writeFile } from 'node:fs/promises'

const runtimeErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
})
test.afterEach(async ({ page }) => { expect(runtimeErrors.get(page)).toEqual([]) })

async function open(page: Page, buffer: Buffer, name = 'synthetic.pdf') {
  await page.getByLabel('Mở tệp PDF', { exact: true }).setInputFiles({ name, mimeType: 'application/pdf', buffer })
  await expect(page.getByRole('dialog', { name: 'Nhập PDF', exact: true })).toBeVisible()
}
async function documents(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('oneword-reader'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    try { return await new Promise<{ source: string; original: string; pdf?: { pageCount: number }; revisions: { text: string }[] }[]>((resolve, reject) => { const r = db.transaction('documents').objectStore('documents').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) }) } finally { db.close() }
  })
}
test('PDF preview → edit → save → RSVP → reload → resume; raw preserved and no data leaves origin', async ({ page, context, baseURL }, info) => {
  const errors: string[] = [], requests: { url: string; method: string; body: string | null }[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  context.on('request', r => requests.push({ url: r.url(), method: r.method(), body: r.postData() }))
  await page.goto('/')
  const started = Date.now()
  await open(page, makePdf(simplePages, { actions: true }))
  const preview = page.getByLabel('Văn bản PDF để chỉnh sửa', { exact: true })
  await expect(preview).toHaveValue(/OneWord PDF private sample/)
  expect((await preview.inputValue())).toContain('well-being state-of-the-art x-ray A-B -4')
  expect(await page.evaluate(() => 'PDF_SCRIPT_EXECUTED' in globalThis)).toBe(false)
  expect(await documents(page)).toHaveLength(0)
  await preview.fill('edited one two three four five six seven eight nine')
  await page.screenshot({ path: 'artifacts/m2-pdf-preview.png', fullPage: true })
  await page.getByRole('button', { name: 'Lưu và tiếp tục đến trình đọc' }).click()
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  await expect(page.getByTestId('current-chunk')).toHaveText('edited')
  await page.getByLabel('Tốc độ', { exact: true }).fill('300')
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
  await expect(page.getByTestId('current-chunk')).not.toHaveText('edited')
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  const before = await page.getByTestId('current-chunk').textContent()
  const saved = await documents(page)
  expect(saved).toHaveLength(1); expect(saved[0].source).toBe('pdf')
  expect(saved[0].original).toContain('OneWord PDF private sample')
  expect(saved[0].original).toContain('informa-\ntion')
  expect(saved[0].revisions[0].text).toBe(saved[0].original)
  await page.reload()
  await expect(page.getByTestId('current-chunk')).toHaveText(before!)
  await page.waitForTimeout(500)
  await expect(page.getByTestId('current-chunk')).toHaveText(before!)
  await expect(page.getByLabel('Nội dung văn bản')).toHaveValue('edited one two three four five six seven eight nine')
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
  await expect(page.getByTestId('current-chunk')).not.toHaveText(before!)
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
  await page.screenshot({ path: 'artifacts/m2-pdf-reload.png', fullPage: true })
  expect(await page.evaluate(() => 'PDF_SCRIPT_EXECUTED' in globalThis)).toBe(false)
  expect(errors).toEqual([])
  expect(requests.every(r => r.method === 'GET' && r.body === null && new URL(r.url).origin === baseURL && !new URL(r.url).search)).toBe(true)
  expect(requests.some(r => r.url.includes('pdf.worker'))).toBe(true)
  const evidence = JSON.stringify({ before, after: await page.getByTestId('current-chunk').textContent(), saved, errors, requests, elapsedMs: Date.now() - started }, null, 2)
  await writeFile('artifacts/m2-pdf-privacy.json', evidence)
  await info.attach('pdf-reader-reload-privacy', { body: evidence, contentType: 'application/json' })
})

test('scanned image-only PDF warns without creating an empty document', async ({ page }, info) => {
  await page.goto('/')
  await open(page, makePdf([{ image: true }]), 'scan.pdf')
  await expect(page.getByRole('alert')).toContainText('OCR không có')
  expect(await documents(page)).toHaveLength(0)
  await expect(page.getByRole('button', { name: 'Lưu và tiếp tục đến trình đọc' })).toHaveCount(0)
  await page.screenshot({ path: 'artifacts/m2-scan-warning.png', fullPage: true })
  await info.attach('scanned-pdf-no-document', { body: JSON.stringify({ message: await page.getByRole('alert').textContent(), documents: await documents(page) }), contentType: 'application/json' })
})

test('multiple pages, mixed scan, two-column warning and Unicode retain page evidence', async ({ page }) => {
  await page.goto('/')
  await open(page, makePdf([
    { lines: [{ text: 'Tiếng Việt e\u0301 Ω 中文 😀' }] },
    { image: true },
    { lines: [{ text: 'Left column first', x: 40, y: 760 }, { text: 'Right column first', x: 340, y: 760 }, { text: 'Left column second', x: 40, y: 740 }, { text: 'Right column second', x: 340, y: 740 }] },
  ]))
  await expect(page.getByLabel('Văn bản PDF để chỉnh sửa')).toHaveValue(/Tiếng Việt e\u0301 Ω 中文 😀/)
  await expect(page.getByRole('dialog')).toContainText('Đã trích xuất 3 trang')
  await expect(page.getByRole('dialog')).toContainText('Trang 2: Không có chữ')
  await expect(page.getByRole('dialog')).toContainText('nhiều cột hoặc thứ tự bất thường')
  await page.getByRole('button', { name: 'Lưu và tiếp tục đến trình đọc' }).click()
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  expect((await documents(page))[0].pdf?.pageCount).toBe(3)
})

test('progress and cancellation preserve existing document without partial import', async ({ page }, info) => {
  await page.goto('/')
  await page.getByLabel('Nội dung văn bản').fill('existing original')
  await page.getByRole('button', { name: 'Dùng văn bản' }).click()
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  await open(page, makePdf(Array.from({ length: 400 }, () => simplePages[0])))
  const progress = page.getByRole('progressbar', { name: 'Tiến độ trích xuất PDF' })
  await expect(progress).toHaveAttribute('max', '400')
  await expect.poll(async () => Number(await progress.getAttribute('value'))).toBeGreaterThan(0)
  const extractedPages = await progress.getAttribute('value')
  const start = Date.now()
  await page.getByRole('button', { name: 'Hủy nhập PDF' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('Mở tệp PDF')).toBeFocused()
  await page.waitForTimeout(500)
  expect(await documents(page)).toHaveLength(1)
  await expect(page.getByLabel('Nội dung văn bản')).toHaveValue('existing original')
  await info.attach('pdf-cancel-progress', { body: JSON.stringify({ extractedPages, total: 400, elapsedMs: Date.now() - start, documents: await documents(page) }), contentType: 'application/json' })
  // A new real import after cancellation also proves the destroyed task is isolated.
  await open(page, makePdf(simplePages))
  await expect(page.getByLabel('Văn bản PDF để chỉnh sửa')).toHaveValue(/OneWord PDF/)
})

for (const [name, buffer, message] of [
  ['corrupt', Buffer.from('%PDF-1.7\nnot a PDF'), 'PDF hỏng'],
  ['empty', Buffer.alloc(0), 'PDF rỗng'],
  ['no-pages', makePdf([]), 'PDF'],
  ['password', makePdf(simplePages, { password: true }), 'mật khẩu'],
  ['too-many-pages', makePdf(Array.from({ length: 501 }, () => ({}))), '500 trang'],
] as const) test(`${name} PDF reports a clear error and writes no document`, async ({ page }) => {
  await page.goto('/')
  await open(page, buffer, `${name}.pdf`)
  await expect(page.getByRole('alert')).toContainText(message)
  expect(await documents(page)).toHaveLength(0)
})

test('narrow PDF preview supports keyboard, undo and cancel without changing original library', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/')
  await open(page, makePdf(simplePages))
  const preview = page.getByLabel('Văn bản PDF để chỉnh sửa')
  await expect(preview).toHaveValue(/OneWord PDF/)
  const initial = await preview.inputValue()
  await preview.fill('changed')
  await page.getByRole('button', { name: 'Hoàn tác về bản chuẩn hóa' }).click()
  await expect(preview).toHaveValue(initial)
  await page.screenshot({ path: 'artifacts/m2-pdf-mobile.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.keyboard.press('Escape')
  expect(await documents(page)).toHaveLength(0)
})

test('representative 100-page extraction reports measured latency and UI responsiveness', async ({ page }, info) => {
  test.setTimeout(60_000)
  await page.goto('/')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  const before = await cdp.send('Performance.getMetrics')
  await page.evaluate(() => {
    const observations = { beats: 0, longTasks: [] as number[] }
    Object.assign(window, { pdfPerformance: observations })
    const timer = setInterval(() => observations.beats++, 50)
    const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) observations.longTasks.push(entry.duration) })
    observer.observe({ type: 'longtask' })
    Object.assign(window, { stopPdfPerformance: () => { clearInterval(timer); observer.disconnect(); return observations } })
  })
  const buffer = makePdf(Array.from({ length: 100 }, (_, pageIndex) => ({ lines: Array.from({ length: 30 }, (_, line) => ({ text: `Page ${pageIndex + 1} line ${line + 1} synthetic local reading sample.`, y: 760 - line * 20 })) })))
  const start = Date.now()
  await open(page, buffer)
  await expect(page.getByLabel('Văn bản PDF để chỉnh sửa')).toBeVisible({ timeout: 45_000 })
  await expect(page.getByRole('dialog')).toContainText('Đã trích xuất 100 trang')
  const elapsedMs = Date.now() - start
  const observation = await page.evaluate(() => (window as unknown as { stopPdfPerformance: () => { beats: number; longTasks: number[] } }).stopPdfPerformance())
  const after = await cdp.send('Performance.getMetrics')
  const heap = (metrics: typeof before) => metrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value
  const evidence = { pages: 100, inputBytes: buffer.length, textLength: (await page.getByLabel('Văn bản PDF để chỉnh sửa').inputValue()).length, elapsedMs, ...observation, mainThreadHeapBefore: heap(before), mainThreadHeapAfter: heap(after), note: 'Synthetic text pages; heap excludes worker/native memory. Not a maximum-size PDF benchmark.' }
  expect(observation.beats).toBeGreaterThan(0)
  expect(await page.locator('canvas').count()).toBe(0)
  await writeFile('artifacts/m2-pdf-performance.json', JSON.stringify(evidence, null, 2))
  await info.attach('pdf-performance', { body: JSON.stringify(evidence), contentType: 'application/json' })
})

test('PDF Personal Backup restores original, page metadata and edited text into a fresh browser store', async ({ page, context, baseURL }, info) => {
  await page.goto('/')
  await open(page, makePdf(simplePages))
  await page.getByLabel('Văn bản PDF để chỉnh sửa').fill('backup edited reading text')
  await page.getByRole('button', { name: 'Lưu và tiếp tục đến trình đọc' }).click()
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  const original = await documents(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất sao lưu', exact: true }).click()
  const path = info.outputPath('pdf-backup.json')
  await (await download).saveAs(path)
  await page.goto('about:blank')
  const cdp = await context.newCDPSession(page)
  await cdp.send('Storage.clearDataForOrigin', { origin: baseURL!, storageTypes: 'indexeddb' })
  await page.goto('/')
  await page.getByLabel('Chọn tệp sao lưu').setInputFiles(path)
  await expect(page.getByRole('dialog', { name: 'Xem trước khôi phục' })).toContainText('1 tài liệu mới')
  expect(await documents(page)).toHaveLength(0)
  await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click()
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  expect(await documents(page)).toEqual(original)
  await page.reload()
  await expect(page.getByLabel('Nội dung văn bản')).toHaveValue('backup edited reading text')
})
