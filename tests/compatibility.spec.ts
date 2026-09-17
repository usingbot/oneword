import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { libraryFixture } from './fixtures/library'
import { seedDatabase, databaseSnapshot } from './fixtures/browser-library'
import { makePdf, simplePages } from './fixtures/pdf'

test('second-engine smoke: cold offline shell, PDF ingestion, reader, FSRS and quiz', async ({ page, context, browserName, browser }) => {
  const errors: string[] = [], requests: { method: string; url: string }[] = []
  page.on('pageerror', e => errors.push(e.message)); context.on('request', r => requests.push({ method: r.method(), url: r.url() }))
  await seedDatabase(page, libraryFixture()); await page.goto('/'); await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến', { timeout: 30000 })
  await context.setOffline(true); await page.reload(); await expect(page.getByLabel('Nội dung văn bản')).toHaveValue(libraryFixture().documents[0].original)
  await page.getByLabel('Mở tệp PDF', { exact: true }).setInputFiles({ name: 'local.pdf', mimeType: 'application/pdf', buffer: makePdf(simplePages, { actions: true }) })
  await expect(page.getByLabel('Văn bản PDF để chỉnh sửa', { exact: true })).toHaveValue(/OneWord PDF private sample/); await page.getByRole('button', { name: 'Lưu và tiếp tục đến trình đọc' }).click(); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  await page.getByRole('region', { name: 'Trình đọc', exact: true }).focus(); await page.keyboard.press('Space'); await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeVisible(); await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Học / Flashcards' }).click(); await page.getByRole('button', { name: 'Ôn theo lịch', exact: true }).click(); await page.getByRole('button', { name: 'Mở đáp án', exact: true }).click(); await page.getByRole('button', { name: /3 · Nhớ/ }).click(); await expect(page.getByRole('status').filter({ hasText: 'Đã lưu đánh giá.' })).toBeVisible()
  await page.getByRole('button', { name: 'Trở về nội dung' }).click(); await page.getByRole('button', { name: 'Quiz', exact: true }).click(); await page.getByRole('radio', { name: 'First answer', exact: true }).press('Space'); await expect(page.getByRole('radio', { name: 'First answer', exact: true })).toBeChecked()
  expect(await page.evaluate(() => 'PDF_SCRIPT_EXECUTED' in globalThis)).toBe(false); expect(errors).toEqual([]); expect(requests.every(r => r.method === 'GET' && new URL(r.url).origin === new URL(page.url()).origin)).toBe(true)
  await writeFile(`artifacts/m4a-${browserName}-compatibility.json`, JSON.stringify({ browser: browser.version(), errors, requests, database: await databaseSnapshot(page) }, null, 2))
})
