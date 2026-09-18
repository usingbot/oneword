import { expect, type Page } from '@playwright/test'
import type { ReviewRecord } from '../../src/storage/review-store'
import { databaseSnapshot } from './browser-library'

export const reviewPanel = (page: Page) => page.getByRole('region', { name: 'Ôn theo lịch', exact: true })

export async function readReviewRecord(page: Page): Promise<ReviewRecord> {
  return (await databaseSnapshot(page)).records.review[0] as ReviewRecord
}

export async function expectOneGoodReview(page: Page, before: ReviewRecord, cardId: string) {
  await expect(reviewPanel(page).getByRole('status')).toContainText('Đã lưu đánh giá')
  const after = await readReviewRecord(page)
  const previous = before.data.schedules.find(schedule => schedule.cardId === cardId)
  const schedule = after.data.schedules.find(schedule => schedule.cardId === cardId)
  expect(after.generation).toBe(before.generation + 1)
  expect(after.data.events).toHaveLength(before.data.events.length + 1)
  expect(after.data.events.slice(0, -1)).toEqual(before.data.events)
  expect(after.data.events.at(-1)).toMatchObject({ cardId, rating: 'good', before: previous ?? null, after: schedule })
  expect(schedule?.revision).toBe((previous?.revision ?? 0) + 1)
  expect(schedule?.lastEventId).toBe(after.data.events.at(-1)?.id)
  expect(after.data.schedules.filter(item => item.cardId !== cardId)).toEqual(before.data.schedules.filter(item => item.cardId !== cardId))
  expect(after.data.settings).toEqual(before.data.settings)
  expect(after.data.undos).toEqual(before.data.undos)
  return after
}
