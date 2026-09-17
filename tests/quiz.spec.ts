import { expect, test, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'

const fixture = {
  type: 'oneword-study-pack', schemaVersion: 2, id: 'quiz-pack', title: 'Quiz fixture', description: 'Synthetic local quiz', createdAt: '2026-09-17T00:00:00.000Z', updatedAt: '2026-09-17T00:00:00.000Z', decks: [], cards: [],
  quizzes: [{ id: 'quiz', packId: 'quiz-pack', title: 'Three questions', description: 'Synthetic questions', questionIds: ['q0', 'q1', 'q2'] }],
  questions: [0, 1, 2].map(i => ({ id: `q${i}`, prompt: i === 0 ? '<script>window.quizXss=true</script> Question 0' : `Question ${i}`, choices: [{ id: 'wrong', text: 'Choice A' }, { id: 'right', text: 'Choice B' }, { id: 'other', text: 'Choice C' }], correctChoiceId: 'right', explanation: `Explanation ${i}`, revision: 1 })),
}
const errors = new WeakMap<Page, string[]>(), requests = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page, baseURL }) => {
  const failures: string[] = [], unexpected: string[] = []; errors.set(page, failures); requests.set(page, unexpected)
  page.on('pageerror', e => failures.push(e.message)); page.on('console', m => { if (m.type() === 'error') failures.push(m.text()) })
  page.on('request', r => { if (r.method() !== 'GET' || new URL(r.url()).origin !== baseURL && !r.url().startsWith('https://media.example.test/')) unexpected.push(r.url()) })
  await page.addInitScript(() => { const original = crypto.getRandomValues.bind(crypto); crypto.getRandomValues = function<T extends ArrayBufferView>(array: T): T { if (array instanceof Uint32Array && array.length === 1) { array[0] = 0; return array }; return original(array) as T } })
})
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); expect(requests.get(page)).toEqual([]) })
async function enter(page: Page) { await page.getByRole('button', { name: 'Học / Flashcards' }).click(); await page.getByRole('button', { name: 'Quiz', exact: true }).click() }
async function seed(page: Page, value: unknown = fixture) {
  await page.goto('/'); await page.getByRole('button', { name: 'Học / Flashcards' }).click(); await page.getByRole('button', { name: 'Nhập Study Pack', exact: true }).click()
  await page.getByLabel('JSON Study Pack', { exact: true }).fill(JSON.stringify(value)); await page.getByRole('button', { name: 'Kiểm tra và xem trước' }).click(); await page.getByRole('button', { name: 'Xác nhận nhập Study Pack' }).click()
  await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị'); await page.getByRole('button', { name: 'Quiz', exact: true }).click(); await expect(page.getByRole('button', { name: 'Bắt đầu kiểm tra' })).toBeEnabled()
}
const runner = (page: Page) => page.getByRole('region', { name: 'Lượt làm quiz', exact: true })
const question = (page: Page) => page.getByRole('article', { name: 'Câu quiz', exact: true })
async function state(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('oneword-reader'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const get = (name: string) => new Promise<unknown>((resolve, reject) => { const r = db.transaction(name).objectStore(name).get(name); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    try { return { quiz: await get('quiz') as { attempts: { id: string; revision: number; current: number; questionOrder: string[]; items: { question: { id: string }; choiceOrder: string[]; selectedChoiceId: string | null; flagged: boolean }[]; result: { correct: number; total: number; excluded: number } | null }[] }, review: await get('review') } } finally { db.close() }
  })
}
async function choose(page: Page, name = 'Choice B') { await question(page).getByRole('radio', { name, exact: true }).click(); await expect(question(page).getByRole('radio', { name, exact: true })).toBeChecked(); await expect(question(page).getByRole('radio', { name, exact: true })).toBeEnabled() }
async function finish(page: Page) { await runner(page).getByRole('button', { name: 'Nộp toàn bài', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận nộp bài', exact: true }).click(); await expect(page.getByRole('region', { name: 'Kết quả quiz', exact: true })).toBeVisible() }

test('Practice wrong answer locks selection, shows correct answer/explanation, works offline and creates no FSRS event', async ({ page, context }) => {
  await seed(page); const before = (await state(page)).review; await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click()
  await expect(question(page)).toContainText('<script>window.quizXss=true</script>'); expect(await page.evaluate(() => Object.hasOwn(window, 'quizXss'))).toBe(false)
  await expect(question(page)).not.toContainText('Explanation'); await context.setOffline(true); await choose(page, 'Choice A')
  await question(page).getByRole('button', { name: 'Kiểm tra câu trả lời' }).click(); await expect(question(page)).toContainText('Bạn chọn sai'); await expect(question(page)).toContainText('Choice B — Đáp án đúng'); await expect(question(page)).toContainText('Explanation 0')
  await expect(question(page).getByRole('radio').first()).toBeDisabled(); await page.screenshot({ path: 'artifacts/m3c-practice.png', fullPage: true })
  await runner(page).getByRole('button', { name: 'Câu tiếp theo' }).click(); await expect(question(page)).toContainText('Question 1'); await expect(question(page)).not.toContainText('Explanation')
  expect((await state(page)).review).toEqual(before); await context.setOffline(false)
  await writeFile('artifacts/m3c-practice-privacy.json', JSON.stringify({ state: await state(page), errors: errors.get(page), unexpectedRequests: requests.get(page) }, null, 2))
})

test('Test shuffle, exact in-progress reload, unanswered warning, final grading/history and FSRS isolation', async ({ page }) => {
  await seed(page); const before = (await state(page)).review
  await page.getByLabel('Xáo thứ tự câu hỏi').check(); await page.getByLabel('Xáo thứ tự lựa chọn').check(); await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click()
  await expect(question(page)).toBeVisible(); const initial = await state(page), attempt = initial.quiz.attempts[0]
  expect(attempt.items[0].choiceOrder.indexOf('right')).not.toBe(1); expect(attempt.questionOrder).not.toEqual(['q0', 'q1', 'q2'])
  await choose(page); await runner(page).getByRole('button', { name: 'Đánh dấu câu', exact: true }).click(); await expect(runner(page).getByRole('button', { name: 'Bỏ đánh dấu câu' })).toBeEnabled()
  await runner(page).getByRole('button', { name: 'Câu tiếp theo' }).click(); await expect(runner(page).getByRole('heading', { name: 'Câu 2', exact: true })).toBeVisible()
  const selected = await state(page); await expect(question(page)).not.toContainText('Explanation'); await expect(runner(page)).not.toContainText('Đáp án đúng'); expect(selected.quiz.attempts[0].result).toBeNull()
  await page.reload(); await enter(page); await expect(question(page)).toBeVisible(); expect(await state(page)).toEqual(selected)
  await runner(page).getByRole('button', { name: 'Nộp toàn bài', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('Còn 2 câu chưa trả lời')
  await page.getByRole('button', { name: 'Quay lại làm bài' }).click(); await expect(page.getByRole('region', { name: 'Kết quả quiz', exact: true })).toHaveCount(0)
  await finish(page); await expect(page.getByRole('region', { name: 'Kết quả quiz', exact: true })).toContainText('1 / 3'); await expect(question(page)).toContainText('Explanation')
  const completed = await state(page); expect(completed.review).toEqual(before); await page.screenshot({ path: 'artifacts/m3c-test-results.png', fullPage: true })
  await page.reload(); await enter(page); await expect(question(page)).toContainText('Explanation'); expect(await state(page)).toEqual(completed); await runner(page).getByRole('button', { name: 'Về danh sách quiz' }).click(); await page.getByRole('button', { name: 'Xem lại kết quả' }).click(); await expect(question(page)).toContainText('Explanation'); expect((await state(page)).quiz.attempts).toEqual(completed.quiz.attempts)
  await writeFile('artifacts/m3c-shuffle-resume-fsrs.json', JSON.stringify({ selected, completed, beforeReview: before, errors: errors.get(page), unexpectedRequests: requests.get(page) }, null, 2))
})

test('Personal Backup v5 restores completed and in-progress quiz history, Study Pack exports content only', async ({ page, context, baseURL }, info) => {
  await seed(page); await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click(); await choose(page); await finish(page); await runner(page).getByRole('button', { name: 'Về danh sách quiz' }).click()
  await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click(); await choose(page, 'Choice C'); const before = await state(page)
  await page.getByRole('button', { name: 'Đọc', exact: true }).click(); const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Xuất sao lưu', exact: true }).click(); const path = info.outputPath('quiz-backup.json'); await (await download).saveAs(path)
  const backup = JSON.parse(await readFile(path, 'utf8')); expect(backup.schemaVersion).toBe(5); expect(backup.data.quizAttempts).toEqual(before.quiz.attempts)
  await page.goto('about:blank'); const cdp = await context.newCDPSession(page); await cdp.send('Storage.clearDataForOrigin', { origin: baseURL!, storageTypes: 'indexeddb' }); await page.goto('/')
  await page.getByLabel('Chọn tệp sao lưu').setInputFiles(path); await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click(); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị'); await expect(page.getByText('Đã khôi phục bằng một transaction. Dữ liệu có sẵn được giữ nguyên.', { exact: true })).toBeVisible()
  await enter(page); await expect(question(page).getByRole('radio', { name: 'Choice C', exact: true })).toBeChecked(); expect((await state(page)).quiz.attempts).toEqual(before.quiz.attempts)
  const packDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Xuất Study Pack', exact: true }).click(); const contentPath = info.outputPath('quiz-content.json'); await (await packDownload).saveAs(contentPath)
  const content = JSON.parse(await readFile(contentPath, 'utf8')); expect(content).toEqual(fixture); expect(content).not.toHaveProperty('quizAttempts')
  await writeFile('artifacts/m3c-backup-restore.json', JSON.stringify({ before, restored: await state(page), backupVersion: backup.schemaVersion, content }, null, 2))
})

test('manual quiz creation supports keyboard choices, completion, history and narrow layout', async ({ page }) => {
  test.setTimeout(60000)
  await page.setViewportSize({ width: 390, height: 844 }); await seed(page); await page.getByRole('button', { name: 'Tạo quiz', exact: true }).click()
  await page.getByLabel('Tên quiz', { exact: true }).fill('Manual quiz'); await page.getByLabel('Mô tả quiz', { exact: true }).fill('Manual description'); await page.getByRole('button', { name: 'Lưu quiz', exact: true }).click()
  await page.getByRole('combobox', { name: 'Chọn quiz', exact: true }).selectOption({ label: 'Manual quiz' }); await page.getByRole('button', { name: 'Sửa nội dung quiz' }).click(); await page.getByRole('button', { name: 'Thêm câu hỏi' }).click()
  await page.getByRole('textbox', { name: 'Câu hỏi', exact: true }).fill('Manual question'); await page.getByLabel('Lựa chọn 1', { exact: true }).fill('Red'); await page.getByLabel('Lựa chọn 2', { exact: true }).fill('Blue'); await page.getByLabel('Đáp án đúng 2', { exact: true }).check(); await page.getByLabel('Giải thích', { exact: true }).fill('Blue explanation'); await page.getByRole('button', { name: 'Lưu câu hỏi', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sửa câu 1' })).toBeVisible(); await page.getByRole('button', { name: 'Đóng trình soạn' }).click(); await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click()
  await question(page).getByRole('radio', { name: 'Blue', exact: true }).focus(); await page.keyboard.press('Space'); await expect(question(page).getByRole('radio', { name: 'Blue', exact: true })).toBeEnabled(); await question(page).getByRole('button', { name: 'Kiểm tra câu trả lời' }).click(); await expect(question(page)).toContainText('Blue explanation')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const radioBox = await question(page).getByRole('radio').first().boundingBox(), textBox = await question(page).locator('.quiz-choice span').first().boundingBox()
  expect(radioBox!.width).toBeLessThan(30); expect(textBox!.width).toBeGreaterThan(120)
  await page.screenshot({ path: 'artifacts/m3c-quiz-mobile.png', fullPage: true })
  await finish(page); await page.reload(); await enter(page); await runner(page).getByRole('button', { name: 'Về danh sách quiz' }).click(); await expect(page.getByRole('region', { name: 'Lịch sử quiz' })).toContainText('Manual quiz')
})

test('essential image failure is opt-in and explicitly excluded rather than counted wrong', async ({ page }) => {
  const pack = structuredClone(fixture), image = { url: 'https://media.example.test/unavailable.png', alt: 'Required diagram', essential: true }
  const mediaPack = { ...pack, questions: pack.questions.map((q, i) => i === 0 ? { ...q, image } : q) }
  let imageRequests = 0
  await page.route('https://media.example.test/**', async route => { imageRequests++; await route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: 'invalid image bytes' }) })
  await seed(page, mediaPack); await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click(); await expect(question(page)).toBeVisible(); expect(imageRequests).toBe(0)
  await expect(question(page).getByRole('radio').first()).toBeDisabled(); await question(page).getByRole('button', { name: 'Tải ảnh câu hỏi' }).click(); await expect(question(page)).toContainText('Không tải được ảnh'); expect(imageRequests).toBe(1)
  await question(page).getByRole('button', { name: 'Đánh dấu ảnh không khả dụng' }).click(); await expect(question(page)).toContainText('loại khỏi mẫu số'); await finish(page)
  expect((await state(page)).quiz.attempts[0].result).toMatchObject({ correct: 0, total: 2, excluded: 1 }); await writeFile('artifacts/m3c-image-exclusion.json', JSON.stringify({ state: await state(page), imageRequests, errors: errors.get(page) }, null, 2))
})

test('broken quiz import is rejected before any content or attempt is written', async ({ page }) => {
  await seed(page); const before = await state(page); await page.getByRole('button', { name: 'Nhập Study Pack', exact: true }).click(); const broken = structuredClone(fixture); broken.questions[0].correctChoiceId = 'missing'
  await page.getByLabel('JSON Study Pack', { exact: true }).fill(JSON.stringify(broken)); await page.getByRole('button', { name: 'Kiểm tra và xem trước' }).click(); await expect(page.getByRole('alert')).toContainText('Đáp án đúng không tồn tại'); await expect(page.getByRole('button', { name: 'Xác nhận nhập Study Pack' })).toHaveCount(0); expect(await state(page)).toEqual(before)
})

test('two real tabs reject stale quiz answers and a failed write can be retried without partial state', async ({ page, context }) => {
  await seed(page); await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click(); await expect(question(page)).toBeVisible()
  const other = await context.newPage(); await other.goto('/'); await enter(other); await expect(question(other)).toBeVisible(); await choose(other)
  const accepted = await state(other); await question(page).getByRole('radio', { name: 'Choice A', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('đã đổi ở tab khác'); expect(await state(page)).toEqual(accepted); await other.close()
  await page.evaluate(() => { const original = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(...args) { if (this.name === 'quiz') { IDBObjectStore.prototype.put = original; throw new DOMException('Synthetic quota', 'QuotaExceededError') }; return original.apply(this, args) } })
  await question(page).getByRole('radio', { name: 'Choice C', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Chưa lưu thao tác'); expect(await state(page)).toEqual(accepted)
  await choose(page, 'Choice C'); expect((await state(page)).quiz.attempts[0].items[0].selectedChoiceId).toBe('other')
})

test('editor preserves IDs/revisions while editing, reordering and deleting questions', async ({ page }, info) => {
  test.setTimeout(60000)
  await seed(page); await page.getByRole('button', { name: 'Sửa nội dung quiz' }).click(); await page.getByRole('button', { name: 'Sửa câu 1', exact: true }).click()
  await page.getByRole('textbox', { name: 'Câu hỏi', exact: true }).fill('Edited question'); await page.getByRole('button', { name: 'Thêm lựa chọn', exact: true }).click(); await page.getByLabel('Lựa chọn 4', { exact: true }).fill('Extra choice'); await page.getByRole('button', { name: 'Lưu câu hỏi', exact: true }).click()
  await page.getByRole('button', { name: 'Đưa câu 2 lên', exact: true }).click(); await expect(page.getByRole('region', { name: 'Soạn quiz' }).getByRole('listitem').first()).toContainText('Question 1')
  page.once('dialog', d => d.accept()); await page.getByRole('button', { name: 'Xóa câu 3', exact: true }).click(); await expect(page.getByRole('button', { name: 'Sửa câu 3', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Đóng trình soạn' }).click(); const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Xuất Study Pack', exact: true }).click(); const path = info.outputPath('edited-quiz.json'); await (await download).saveAs(path)
  const content = JSON.parse(await readFile(path, 'utf8')); expect(content.quizzes[0].questionIds).toEqual(['q1', 'q0']); expect(content.questions.map((q: { id: string }) => q.id)).toEqual(['q0', 'q1'])
  expect(content.questions[0]).toMatchObject({ id: 'q0', prompt: 'Edited question', revision: 2, correctChoiceId: 'right' }); expect(content.questions[0].choices.slice(0, 3)).toEqual(fixture.questions[0].choices)
})

test('loaded essential HTTPS image unlocks answering with no referrer or FSRS write', async ({ page }) => {
  const image = { url: 'https://media.example.test/diagram.svg', alt: 'Supplied diagram', essential: true }, observed: Record<string, string>[] = []
  await page.route(image.url, async route => { observed.push(await route.request().allHeaders()); await route.fulfill({ status: 200, contentType: 'image/svg+xml', headers: { 'access-control-allow-origin': '*' }, body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="green"/></svg>' }) })
  await seed(page, { ...fixture, questions: fixture.questions.map((q, i) => i === 0 ? { ...q, image } : q) }); const before = (await state(page)).review
  await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click(); await question(page).getByRole('button', { name: 'Tải ảnh câu hỏi' }).click(); await expect(question(page).getByRole('radio').first()).toBeEnabled(); await choose(page); await finish(page)
  expect((await state(page)).quiz.attempts[0].result).toMatchObject({ correct: 1, total: 3, excluded: 0 }); expect((await state(page)).review).toEqual(before); expect(observed).toHaveLength(1); expect(observed[0].referer).toBeUndefined(); expect(observed[0].cookie).toBeUndefined()
})

test('reload resumes the older selected attempt rather than the newest attempt', async ({ page }) => {
  await seed(page); await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click(); await choose(page, 'Choice A'); const firstId = (await state(page)).quiz.attempts[0].id
  await runner(page).getByRole('button', { name: 'Về danh sách quiz' }).click(); await page.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click(); await choose(page, 'Choice C'); await runner(page).getByRole('button', { name: 'Về danh sách quiz' }).click()
  await page.getByRole('button', { name: 'Tiếp tục bài', exact: true }).last().click(); await expect(question(page).getByRole('radio', { name: 'Choice A', exact: true })).toBeChecked()
  const before = await state(page); await page.reload(); await enter(page); await expect(question(page).getByRole('radio', { name: 'Choice A', exact: true })).toBeChecked(); expect(await state(page)).toEqual(before)
  expect((await state(page)).quiz.attempts.find(a => a.id === firstId)!.items[0].selectedChoiceId).toBe('wrong')
})
