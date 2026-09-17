import { expect, test } from '@playwright/test'
import { writeFile, readFile } from 'node:fs/promises'
import { libraryFixture } from './fixtures/library'
import { exportBackup, parseBackup } from '../src/application/backup'
import { reviewQueue } from '../src/application/review'

test('representative large library: production startup, opening, queue and backup round-trip measurements', async ({ page }, info) => {
  test.setTimeout(240000)
  const data = libraryFixture(true), metrics: Record<string, unknown> = { fixture: { packs: 4, cards: 2000, events: 4000, attempts: 200, questionsPerAttempt: 20, textBytes: new TextEncoder().encode(data.documents[0].original).length } }
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  let start = performance.now(); const json = exportBackup(data); metrics.nodeExportMs = performance.now() - start; metrics.backupBytes = Buffer.byteLength(json)
  start = performance.now(); const parsed = parseBackup(json); metrics.nodeParseMs = performance.now() - start
  start = performance.now(); const queue = reviewQueue(parsed.data.packs.flatMap(p => p.cards), parsed.data.review, new Date('2026-09-17T12:00:00.000Z')); metrics.queueMs = performance.now() - start; expect(queue.cards.length).toBeGreaterThan(0)
  start = performance.now(); await page.goto('/'); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị'); metrics.coldEmptyLoadMs = performance.now() - start
  start = performance.now(); await page.reload(); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị'); metrics.warmEmptyLoadMs = performance.now() - start
  start = performance.now(); await page.getByLabel('Chọn tệp sao lưu').setInputFiles({ name: 'synthetic-large.json', mimeType: 'application/json', buffer: Buffer.from(json) }); await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click(); await expect(page.getByText('Đã khôi phục bằng một transaction. Dữ liệu có sẵn được giữ nguyên.', { exact: true })).toBeVisible({ timeout: 120000 }); metrics.restoreMs = performance.now() - start
  start = performance.now(); await page.reload(); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị', { timeout: 120000 }); metrics.largeStartupMs = performance.now() - start
  metrics.browserMeasures = await page.evaluate(() => performance.getEntriesByType('measure').map(m => ({ name: m.name, ms: m.duration })))
  start = performance.now(); await page.getByRole('button', { name: 'Học / Flashcards' }).click(); await expect(page.getByRole('button', { name: 'Ôn theo lịch', exact: true })).toBeVisible(); metrics.packOpenMs = performance.now() - start
  start = performance.now(); await page.getByRole('button', { name: 'Ôn theo lịch', exact: true }).click(); await expect(page.getByRole('button', { name: 'Mở đáp án', exact: true })).toBeVisible({ timeout: 60000 }); metrics.reviewOpenMs = performance.now() - start
  await page.getByRole('button', { name: 'Trở về nội dung' }).click(); start = performance.now(); await page.getByRole('button', { name: 'Quiz', exact: true }).click(); await expect(page.getByRole('article', { name: 'Câu quiz', exact: true })).toBeVisible({ timeout: 60000 }); metrics.quizOpenMs = performance.now() - start
  await page.getByRole('button', { name: 'Đọc', exact: true }).click(); start = performance.now(); const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Xuất sao lưu', exact: true }).click(); const path = info.outputPath('large-backup.json'); await (await download).saveAs(path); metrics.browserExportMs = performance.now() - start
  const restored = parseBackup(await readFile(path, 'utf8')).data
  expect(restored.documents).toEqual(data.documents); expect(restored.packs).toEqual(parsed.data.packs); expect(restored.review).toEqual(parsed.data.review); expect(restored.quizAttempts).toEqual(parsed.data.quizAttempts); expect(restored.quizActiveAttemptId).toBe(data.quizActiveAttemptId)
  metrics.heap = await page.evaluate(() => (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory ? { used: (performance as Performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize } : null)
  metrics.errors = errors; expect(errors).toEqual([])
  await writeFile(`artifacts/m4a-performance-${process.env.M4A_MEASUREMENT === 'baseline' ? 'baseline' : 'current'}.json`, JSON.stringify(metrics, null, 2))
})
