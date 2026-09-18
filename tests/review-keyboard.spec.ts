import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { holdDatabaseWrites, seedDatabase } from './fixtures/browser-library'
import { libraryFixture } from './fixtures/library'
import { expectOneGoodReview, readReviewRecord, reviewPanel } from './fixtures/review'

for (const input of ['button', 'keyboard'] as const) test(`${input} Good uses the same ready review state and commits exactly once`, async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-18T12:00:00.000Z'))
  await seedDatabase(page, libraryFixture())
  await page.goto('/')
  await page.getByRole('button', { name: 'Học / Flashcards', exact: true }).click()
  const before = await readReviewRecord(page), panel = reviewPanel(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  if (input === 'keyboard') {
    // Hold a real transaction: the review's initial read cannot finish yet.
    // Early input must be ignored, not queued into an unseen card/rating.
    const release = await holdDatabaseWrites(page)
    try {
      await page.getByRole('button', { name: 'Ôn theo lịch', exact: true }).click()
      await expect(panel).toContainText('Đang đọc lịch ôn trên thiết bị')
      await panel.focus(); await expect(panel).toBeFocused()
      await page.keyboard.press('Space'); await page.keyboard.press('3')
      await expect(panel.locator('.review-ratings button')).toHaveCount(0)
      await expect(panel).toContainText('Đang đọc lịch ôn trên thiết bị')
    } finally { await release() }
  } else {
    await page.getByRole('button', { name: 'Ôn theo lịch', exact: true }).click()
  }
  await expect(panel.getByRole('article')).toContainText('Recall synthetic fact 0?')
  await expect(panel.getByRole('button', { name: 'Mở đáp án', exact: true })).toBeEnabled()
  expect(await readReviewRecord(page)).toEqual(before)
  if (input === 'keyboard') {
    await panel.focus(); await expect(panel).toBeFocused()
    await page.keyboard.press('3') // Loaded but unrevealed: still no rating.
    expect(await readReviewRecord(page)).toEqual(before)
    await page.keyboard.press('Space')
  } else {
    await panel.getByRole('button', { name: 'Mở đáp án', exact: true }).click()
  }
  await expect(panel.getByText('Synthetic answer 0.', { exact: true })).toBeVisible()
  const good = panel.getByRole('button', { name: /3 · Nhớ/ })
  await expect(panel.locator('.review-ratings button')).toHaveCount(4)
  await expect(good).toBeEnabled()
  expect(await readReviewRecord(page)).toEqual(before)
  if (input === 'keyboard') {
    await expect(panel).toBeFocused()
    const release = await holdDatabaseWrites(page)
    try {
      await page.keyboard.down('3')
      await expect(good).toBeDisabled()
      await page.keyboard.down('3') // Native repeat=true while the write is pending.
      await page.keyboard.up('3')
    } finally { await release() }
  } else {
    await good.click()
  }
  const after = await expectOneGoodReview(page, before, 'card-0-0')
  await expect(panel.getByRole('article')).toContainText('Recall synthetic fact 1?')
  if (input === 'keyboard') {
    await expect(panel).toBeFocused()
    await page.keyboard.down('3') // Next card has not been revealed.
    await page.keyboard.press('Space')
    await expect(panel.getByRole('button', { name: /3 · Nhớ/ })).toBeEnabled()
    await page.keyboard.down('3') // Held rating key cannot rate the next card either.
    await page.keyboard.up('3')
    expect(await readReviewRecord(page)).toEqual(after)
    await panel.getByText('Thiết lập ôn', { exact: true }).click()
    const field = panel.getByLabel('Thẻ mới mỗi ngày')
    await field.fill(''); await field.focus(); await page.keyboard.press('3')
    await expect(field).toHaveValue('3')
    expect(await readReviewRecord(page)).toEqual(after)
  }
  expect(errors).toEqual([])
  await writeFile(`artifacts/rc0-keyboard-${input}.json`, JSON.stringify({ before, after, errors }, null, 2))
})
