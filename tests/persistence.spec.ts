import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const text = Array.from({ length: 120 }, (_, i) => `từ${i}`).join(' ')
async function load(page: Page, value = text) {
  await page.goto('/')
  await page.getByLabel('Nội dung văn bản').fill(value)
  await page.getByRole('button', { name: 'Dùng văn bản' }).click()
  await saved(page)
}
async function saved(page: Page) { await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị') }
async function exportFile(page: Page, path: string) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất sao lưu', exact: true }).click()
  await (await download).saveAs(path)
  return JSON.parse(await readFile(path, 'utf8'))
}
async function inspect(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('oneword-reader'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    try {
      const tx = db.transaction(['documents', 'positions', 'meta', 'settings'], 'readonly')
      const rows = await Promise.all(['documents', 'positions', 'meta', 'settings'].map(name => new Promise<unknown[]>((resolve, reject) => { const request = tx.objectStore(name).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })))
      return { documents: rows[0], positions: rows[1], meta: rows[2], settings: rows[3] }
    } finally { db.close() }
  })
}

test('real IndexedDB: read, checkpoint, reload, resume correct position and settings', async ({ page }, info) => {
  await load(page)
  await page.getByLabel('Tốc độ', { exact: true }).fill('600')
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
  await expect(page.getByTestId('current-chunk')).not.toHaveText('từ0 từ1 từ2')
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
  await saved(page)
  const before = await page.getByTestId('current-chunk').textContent()
  const dbBefore = await inspect(page)
  await page.reload()
  await expect(page.getByTestId('current-chunk')).toHaveText(before!)
  await expect(page.getByRole('button', { name: 'Đọc tiếp', exact: true })).toBeEnabled()
  await expect(page.getByLabel('Tốc độ', { exact: true })).toHaveValue('600')
  await expect(page.getByRole('button', { name: '3', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(700)
  await expect(page.getByTestId('current-chunk')).toHaveText(before!)
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
  await expect(page.getByTestId('current-chunk')).not.toHaveText(before!)
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
  await saved(page)
  await info.attach('reload-resume', { body: JSON.stringify({ before, after: await page.getByTestId('current-chunk').textContent(), dbBefore, dbAfter: await inspect(page) }, null, 2), contentType: 'application/json' })
  await page.screenshot({ path: 'artifacts/m1b-reload.png', fullPage: true })
})

test('export, clear real test storage, preview and restore original/revisions/position/preferences/draft', async ({ page, baseURL }, info) => {
  const errors: string[] = [], requests: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('request', r => { if (r.method() !== 'GET' || !r.url().startsWith(baseURL! + '/')) requests.push(`${r.method()} ${r.url()}`) })
  await load(page, 'gốc\nwell-being -4')
  await page.getByLabel('Nội dung văn bản').fill(text)
  await page.getByRole('button', { name: 'Áp dụng thay đổi' }).click()
  await page.getByLabel('Tốc độ', { exact: true }).fill('420')
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: 'Tiến một lượt' }).click()
  await page.getByText('Hiển thị & phím tắt', { exact: true }).click()
  await page.getByLabel('Ánh sáng nhẹ').uncheck()
  await page.getByLabel('Cỡ chữ').fill('60')
  await page.getByLabel('Nội dung văn bản').fill('nháp chưa áp dụng')
  await saved(page)
  const backup = await exportFile(page, info.outputPath('personal-backup.json'))
  expect(backup.data.documents[0].original).toBe('gốc\nwell-being -4')
  expect(backup.data.documents[0].revisions).toHaveLength(2)
  await page.goto('about:blank')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Storage.clearDataForOrigin', { origin: baseURL!, storageTypes: 'indexeddb' })
  await page.goto('/')
  await expect(page.getByTestId('current-chunk')).toHaveText('Bắt đầu từ đây.')
  await page.getByLabel('Chọn tệp sao lưu').setInputFiles(info.outputPath('personal-backup.json'))
  await expect(page.getByRole('dialog', { name: 'Xem trước khôi phục' })).toContainText('1 tài liệu mới')
  expect((await inspect(page)).documents).toHaveLength(0)
  await page.screenshot({ path: 'artifacts/m1b-restore-preview.png', fullPage: true })
  await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click()
  await expect(page.getByText('Đã khôi phục bằng một transaction. Dữ liệu có sẵn được giữ nguyên.', { exact: true })).toBeVisible(); await saved(page)
  await expect(page.getByTestId('current-chunk')).toHaveText('từ3 từ4 từ5')
  await expect(page.getByLabel('Nội dung văn bản')).toHaveValue('nháp chưa áp dụng')
  await expect(page.getByLabel('Tốc độ', { exact: true })).toHaveValue('420')
  await expect(page.getByLabel('Ánh sáng nhẹ')).not.toBeChecked()
  await expect(page.getByLabel('Cỡ chữ')).toHaveValue('60')
  await page.getByText('Xem bản gốc · không chỉnh sửa').click()
  await expect(page.getByTestId('original-text')).toHaveText('gốc\nwell-being -4')
  await page.reload()
  await expect(page.getByLabel('Nội dung văn bản')).toHaveValue('nháp chưa áp dụng')
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  await expect(page.getByLabel('Nội dung văn bản')).toHaveValue(text)
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  await expect(page.getByLabel('Nội dung văn bản')).toHaveValue('gốc\nwell-being -4')
  await saved(page)
  expect(errors).toEqual([]); expect(requests).toEqual([])
  await info.attach('backup-restore-privacy', { body: JSON.stringify({ backup, restored: await inspect(page), errors, unexpectedRequests: requests }, null, 2), contentType: 'application/json' })
})

test('restore rejects malformed, future version, invalid references and ID conflicts without writes', async ({ page }, info) => {
  await load(page, 'keep original')
  const backup = await exportFile(page, info.outputPath('backup.json'))
  const originalRows = await inspect(page)
  const future = structuredClone(backup); future.schemaVersion = 99
  const reference = structuredClone(backup); reference.data.activeDocumentId = crypto.randomUUID()
  const conflict = structuredClone(backup); conflict.data.documents[0].name = 'same ID different metadata'
  for (const value of ['{', JSON.stringify(future), JSON.stringify(reference), JSON.stringify(conflict)]) {
    await page.getByLabel('Chọn tệp sao lưu').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(value) })
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(await inspect(page)).toEqual(originalRows)
  }
  await page.getByLabel('Chọn tệp sao lưu').setInputFiles(info.outputPath('backup.json'))
  await expect(page.getByRole('dialog')).toContainText('1 tài liệu trùng hoàn toàn')
  await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click()
  await expect(page.getByText('Đã khôi phục bằng một transaction. Dữ liệu có sẵn được giữ nguyên.', { exact: true })).toBeVisible(); await saved(page)
  expect((await inspect(page)).documents).toEqual(originalRows.documents)
})

test('real IndexedDB restore transaction rollback on injected final-write quota failure', async ({ page }, info) => {
  await load(page, 'keep original')
  const backup = await exportFile(page, info.outputPath('backup.json'))
  const doc = backup.data.documents[0], newId = crypto.randomUUID()
  doc.id = newId; doc.revisions[0].id = crypto.randomUUID(); doc.revisions[0].documentId = newId
  backup.data.activeDocumentId = newId; backup.data.positions = []
  const before = await inspect(page)
  await page.getByLabel('Chọn tệp sao lưu').setInputFiles({ name: 'incoming.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await expect(page.getByRole('dialog')).toContainText('1 tài liệu mới')
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'meta') throw new DOMException('Injected failure', 'QuotaExceededError')
      return original.apply(this, args)
    }
  })
  await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Khôi phục thất bại' })).toBeVisible()
  expect(await inspect(page)).toEqual(before)
  await expect(page.getByTestId('current-chunk')).toHaveText('keep')
})

test('unavailable IndexedDB preserves memory reader and downloadable backup without false saved status', async ({ page }, info) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }))
  await page.goto('/')
  await expect(page.getByTestId('save-status')).toHaveText('Chưa lưu được')
  await page.getByLabel('Nội dung văn bản').fill('recover this text')
  await page.getByRole('button', { name: 'Dùng văn bản' }).click()
  await expect(page.getByTestId('current-chunk')).toHaveText('recover')
  await expect(page.getByTestId('save-status')).toHaveText('Chưa lưu được')
  const backup = await exportFile(page, info.outputPath('recovery.json'))
  expect(backup.data.documents[0].original).toBe('recover this text')
  await page.screenshot({ path: 'artifacts/m1b-storage-error.png', fullPage: true })
})

test('saved library switches documents and preserves independent reading positions', async ({ page }) => {
  await load(page, 'one two three')
  await page.getByRole('button', { name: 'Tiến một lượt' }).click()
  await saved(page)
  const firstId = await page.getByLabel('Chọn tài liệu').inputValue()
  await page.getByRole('button', { name: 'Tạo văn bản mới' }).click()
  await page.getByLabel('Nội dung văn bản').fill('alpha beta gamma')
  await page.getByRole('button', { name: 'Dùng văn bản' }).click()
  await saved(page)
  await page.getByLabel('Chọn tài liệu').selectOption(firstId)
  await expect(page.getByTestId('current-chunk')).toHaveText('two')
  await saved(page); await page.reload()
  await expect(page.getByTestId('current-chunk')).toHaveText('two')
  expect((await inspect(page)).documents).toHaveLength(2)
})

test('reload while still playing resumes at the last durable checkpoint without autoplay', async ({ page }) => {
  await load(page)
  await page.getByLabel('Tốc độ', { exact: true }).fill('30')
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
  await expect(page.getByTestId('current-chunk')).toHaveText('từ2', { timeout: 7000 })
  await saved(page)
  const checkpoint = await page.getByTestId('current-chunk').textContent()
  await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeEnabled()
  await page.reload()
  await expect(page.getByTestId('current-chunk')).toHaveText(checkpoint!)
  await expect(page.getByRole('button', { name: 'Đọc tiếp', exact: true })).toBeEnabled()
})

test('a stale tab cannot overwrite another tab; its unsaved text remains exportable', async ({ page, context }, info) => {
  await load(page, 'original')
  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByLabel('Nội dung văn bản')).toHaveValue('original')
  await saved(other)
  await other.getByLabel('Nội dung văn bản').fill('winning revision')
  await other.getByRole('button', { name: 'Áp dụng thay đổi' }).click()
  await saved(other)
  await page.getByLabel('Nội dung văn bản').fill('stale tab revision')
  await page.getByRole('button', { name: 'Áp dụng thay đổi' }).click()
  await expect(page.getByTestId('save-status')).toHaveText('Chưa lưu được')
  const backup = await exportFile(page, info.outputPath('stale-tab-recovery.json'))
  expect(backup.data.documents[0].revisions[1].text).toBe('stale tab revision')
  await other.reload()
  await expect(other.getByLabel('Nội dung văn bản')).toHaveValue('winning revision')
  await other.close()
})
