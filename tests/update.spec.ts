import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { libraryFixture } from './fixtures/library'
import { databaseSnapshot, holdDatabaseWrites, seedDatabase } from './fixtures/browser-library'
import { productionServer } from './fixtures/production-server'
import { exportBackup } from '../src/application/backup'
import { emptyLibrary } from '../src/application/library'

// Test-only server switches between two complete Vite production outputs.
// No update endpoint or fixture data is included in the production app/server.
for (const activity of ['quiz', 'review', 'draft']) test(`real old-cache → new-build update protects active ${activity} and all personal data`, async ({ page, context }) => {
  test.setTimeout(90000)
  const server = await productionServer(), { origin } = server
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  try {
    await seedDatabase(page, libraryFixture(), 5, origin); await page.goto(origin); await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến', { timeout: 30000 }); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
    expect(await page.locator('meta[name="oneword-build"]').getAttribute('content')).toBe('update-fixture-old')
    if (activity === 'draft') await page.getByLabel('Nội dung văn bản').fill('Draft protected during update')
    else {
      await page.getByRole('button', { name: 'Học / Flashcards' }).click()
      if (activity === 'quiz') { await page.getByRole('button', { name: 'Quiz', exact: true }).click(); await page.getByRole('radio', { name: 'First answer', exact: true }).click(); await expect(page.getByRole('radio', { name: 'First answer', exact: true })).toBeChecked() }
      else { await page.getByRole('button', { name: 'Ôn theo lịch', exact: true }).click(); await page.getByRole('button', { name: 'Mở đáp án', exact: true }).click(); await expect(page.getByRole('button', { name: /3 · Nhớ/ })).toBeVisible() }
    }
    await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị'); const active = await databaseSnapshot(page)
    server.state.root = resolve('.tools/m4a-update-next'); await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update() }); await expect(page.getByText('OneWord có bản cập nhật mới.', { exact: true })).toBeVisible({ timeout: 30000 }); await expect(page.getByRole('button', { name: 'Cập nhật an toàn' })).toBeDisabled()
    expect(await page.locator('meta[name="oneword-build"]').getAttribute('content')).toBe('update-fixture-old'); expect(await databaseSnapshot(page)).toEqual(active)
    if (activity === 'draft') { await expect(page.getByLabel('Nội dung văn bản')).toHaveValue('Draft protected during update'); await page.getByRole('button', { name: 'Áp dụng thay đổi' }).click() }
    else {
      const release = await holdDatabaseWrites(page)
      try {
        if (activity === 'review') await page.getByRole('button', { name: /3 · Nhớ/ }).click()
        else await page.getByRole('radio', { name: 'Second answer', exact: true }).click()
        // Pending writes must not be bypassed by navigating back to Reader.
        await expect(page.getByRole('button', { name: 'Đọc', exact: true })).toBeDisabled()
        await expect(page.getByRole('button', { name: 'Cập nhật an toàn' })).toBeDisabled()
        expect(await page.locator('meta[name="oneword-build"]').getAttribute('content')).toBe('update-fixture-old')
      } finally { await release() }
      if (activity === 'review') await expect(page.getByText('Đã lưu đánh giá.', { exact: true })).toBeVisible()
      else await expect(page.getByRole('radio', { name: 'Second answer', exact: true })).toBeChecked()
      await page.getByRole('button', { name: 'Đọc', exact: true }).click()
    }
    if (activity === 'quiz') {
      await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click(); await expect(page.getByRole('button', { name: 'Cập nhật an toàn' })).toBeDisabled(); await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
      await page.getByLabel('Chọn tệp sao lưu').setInputFiles({ name: 'empty.json', mimeType: 'application/json', buffer: Buffer.from(exportBackup(emptyLibrary())) })
      await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.locator('.update-notice button')).toBeDisabled(); await page.getByRole('button', { name: 'Hủy khôi phục' }).click()
    }
    await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị'); const before = await databaseSnapshot(page)
    // A second open page must prevent cross-tab forced activation.
    const other = await context.newPage(); await other.goto(origin); await expect(other.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị');
    await page.getByRole('button', { name: 'Cập nhật an toàn' }).click(); await expect(page.getByText(/Hãy đóng các tab\/cửa sổ OneWord khác/)).toBeVisible(); await other.close()
    await page.getByRole('button', { name: 'Cập nhật an toàn' }).click(); await expect(page.locator('meta[name="oneword-build"]')).toHaveAttribute('content', 'update-fixture-next', { timeout: 30000 }); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
    const after = await databaseSnapshot(page)
    for (const name of ['documents', 'packs', 'review', 'quiz', 'settings']) expect(after.records[name]).toEqual(before.records[name])
    const position = (value: unknown[]) => value.map(p => { const { updatedAt: _time, ...rest } = p as Record<string, unknown>; void _time; return rest })
    expect(position(after.records.positions)).toEqual(position(before.records.positions))
    expect(after.version).toBe(50); expect(errors).toEqual([])
    await context.setOffline(true); await page.reload(); await expect(page.getByLabel('Nội dung văn bản')).toHaveValue(activity === 'draft' ? 'Draft protected during update' : libraryFixture().documents[0].original)
    await writeFile(`artifacts/m4a-update-${activity}.json`, JSON.stringify({ active, before, after, errors }, null, 2))
  } finally { await page.goto('about:blank'); await server.close() }
})

test('an incomplete new build cannot replace the working offline cache or touch IndexedDB', async ({ page, context }) => {
  const server = await productionServer(), { origin } = server
  try {
    await seedDatabase(page, libraryFixture(), 5, origin); await page.goto(origin); await expect(page.getByTestId('offline-status')).toContainText('sẵn sàng ngoại tuyến', { timeout: 30000 }); await expect(page.getByTestId('save-status')).toHaveText('Đã lưu trên thiết bị')
    await expect(page.getByText('OneWord có bản cập nhật mới.', { exact: true })).toHaveCount(0)
    const before = await databaseSnapshot(page), cachesBefore = await page.evaluate(() => caches.keys())
    server.state.root = resolve('.tools/m4a-update-next'); server.state.failIcon = true
    await page.evaluate(async () => {
      const reg = (await navigator.serviceWorker.getRegistration())!
      const failed = new Promise<void>(done => reg.addEventListener('updatefound', () => { const worker = reg.installing!; worker.addEventListener('statechange', () => { if (worker.state === 'redundant') done() }) }, { once: true }))
      await reg.update(); await failed
    })
    await expect(page.getByText(/Chưa lưu đủ ứng dụng/)).toBeVisible(); expect(await page.evaluate(() => caches.keys())).toEqual(cachesBefore); expect(await databaseSnapshot(page)).toEqual(before)
    await context.setOffline(true); await page.reload(); await expect(page.getByLabel('Nội dung văn bản')).toHaveValue(libraryFixture().documents[0].original); await expect(page.locator('meta[name="oneword-build"]')).toHaveAttribute('content', 'update-fixture-old')
    await context.setOffline(false); server.state.failIcon = false; await page.getByText('Ngoại tuyến, cài đặt và sao lưu', { exact: true }).click(); await page.getByRole('button', { name: 'Kiểm tra cập nhật', exact: true }).click(); await expect(page.getByText('OneWord có bản cập nhật mới.', { exact: true })).toBeVisible({ timeout: 30000 })
    await writeFile('artifacts/m4a-update-incomplete.json', JSON.stringify({ before, after: await databaseSnapshot(page), cachesBefore, recoveredWaiting: true }, null, 2))
  } finally { await page.goto('about:blank'); await server.close() }
})
