import { expect } from '@playwright/test'
import { test, waitForPdfPreview } from './fixtures/compatibility'
import { writeFile } from 'node:fs/promises'
import { libraryFixture } from './fixtures/library'
import { databaseSnapshot } from './fixtures/browser-library'
import { makePdf, simplePages } from './fixtures/pdf'

test('second-engine smoke: cold offline shell, PDF ingestion, reader, FSRS and quiz', async ({ compatibility, context, browserName, browser }) => {
  const { page, errors, requests } = compatibility
  await test.step('reload offline and recover saved Reader content', async () => {
    await context.setOffline(true); await page.reload(); await expect(page.getByLabel('Nội dung văn bản')).toHaveValue(libraryFixture().documents[0].original)
  })
  await test.step('import real PDF offline and save extracted text', async () => {
    await page.getByLabel('Mở tệp PDF', { exact: true }).setInputFiles({ name: 'local.pdf', mimeType: 'application/pdf', buffer: makePdf(simplePages, { actions: true }) })
    await waitForPdfPreview(page)
    await expect(page.getByLabel('Văn bản PDF để chỉnh sửa', { exact: true })).toHaveValue(/OneWord PDF private sample/); await page.getByRole('button', { name: 'Lưu và tiếp tục đến trình đọc' }).click(); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
  })
  await test.step('play and pause Reader with keyboard', async () => {
    await page.getByRole('region', { name: 'Trình đọc', exact: true }).focus(); await page.keyboard.press('Space'); await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeVisible(); await page.keyboard.press('Space')
  })
  await test.step('recall, reveal and persist an FSRS review', async () => {
    await page.getByRole('button', { name: 'Học / Flashcards' }).click(); await page.getByRole('button', { name: 'Ôn theo lịch', exact: true }).click(); await page.getByRole('button', { name: 'Mở đáp án', exact: true }).click(); await page.getByRole('button', { name: /3 · Nhớ/ }).click(); await expect(page.getByRole('status').filter({ hasText: 'Đã lưu đánh giá.' })).toBeVisible()
  })
  await test.step('resume seeded quiz and select a stable answer with keyboard', async () => {
    await page.getByRole('button', { name: 'Trở về nội dung' }).click(); await page.getByRole('button', { name: 'Quiz', exact: true }).click(); await page.getByRole('radio', { name: 'First answer', exact: true }).press('Space'); await expect(page.getByRole('radio', { name: 'First answer', exact: true })).toBeChecked()
  })
  await test.step('verify script isolation, same-origin network and database evidence', async () => {
    expect(await page.evaluate(() => 'PDF_SCRIPT_EXECUTED' in globalThis)).toBe(false); expect(errors).toEqual([]); expect(requests.every(r => r.method === 'GET' && new URL(r.url).origin === new URL(page.url()).origin)).toBe(true)
    await writeFile(`artifacts/m4a-${browserName}-compatibility.json`, JSON.stringify({ browser: browser.version(), errors, requests, database: await databaseSnapshot(page) }, null, 2))
  })
})
