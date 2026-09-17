import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { IndexedDbStorage } from './indexed-db'
import { libraryFixture } from '../../tests/fixtures/library'
import { exportBackup, parseBackup } from '../application/backup'
import { dayFormatter, studyDay } from '../application/review'

describe('M4a storage and bounded validation hardening', () => {
  it.each(['missing-review', 'missing-quiz', 'invalid-review-generation', 'invalid-quiz-generation', 'orphan-position'])('refuses %s without repairing over uncertain data', async kind => {
    const name = crypto.randomUUID(), store = new IndexedDbStorage(name)
    try {
      await store.read(); const data = libraryFixture(); await store.save(data, 0, 0, 0)
      if (kind === 'missing-review') await store.db.table('review').delete('review')
      if (kind === 'missing-quiz') await store.db.table('quiz').delete('quiz')
      if (kind === 'invalid-review-generation') await store.db.table('review').update('review', { generation: -1 })
      if (kind === 'invalid-quiz-generation') await store.db.table('quiz').update('quiz', { generation: -1 })
      if (kind === 'orphan-position') { await store.db.table('meta').clear(); await store.db.table('documents').clear(); await store.db.table('packs').clear(); await store.db.table('settings').clear(); await store.db.table('review').clear(); await store.db.table('quiz').clear() }
      const before = await Promise.all(store.db.tables.map(t => t.toArray()))
      await expect(store.read()).rejects.toThrow()
      expect(await Promise.all(store.db.tables.map(t => t.toArray()))).toEqual(before)
    } finally { store.close(); await Dexie.delete(name) }
  })
  it('supports the documented 200-attempt limit and rejects overflow without truncation', () => {
    const data = libraryFixture(true), json = exportBackup(data), parsed = parseBackup(json)
    expect(parsed.data.quizAttempts).toEqual(data.quizAttempts); expect(parsed.data.review.events).toEqual(data.review.events)
    expect(() => exportBackup({ ...data, quizAttempts: [...data.quizAttempts, { ...data.quizAttempts[0], id: 'overflow' }] })).toThrow()
  }, 30000)
  it('timezone formatter reuse keeps DST/day boundaries and rejects invalid timezones', () => {
    expect(dayFormatter('America/New_York')).toBe(dayFormatter('America/New_York'))
    expect(studyDay(new Date('2026-03-08T04:59:59.000Z'), 'America/New_York')).toBe('2026-03-07')
    expect(studyDay(new Date('2026-03-08T05:00:00.000Z'), 'America/New_York')).toBe('2026-03-08')
    expect(() => dayFormatter('Invalid/Zone')).toThrow()
  })
})
