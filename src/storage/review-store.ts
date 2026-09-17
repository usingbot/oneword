import type Dexie from 'dexie'
import { scheduleRecall } from '../application/fsrs-adapter'
import { emptyReview, latestReview, newCardsUsed, ReviewConflict, studyDay, systemClock, type CardSchedule, type ReviewCommand, type ReviewData, type ReviewGateway, type ReviewSnapshot } from '../application/review'
import { validateReview, validateReviewSettings } from '../application/review-validation'
import { validateStudyLibrary } from '../application/study-pack'
import { exportBackup } from '../application/backup'
import { defaultPreferences } from '../application/library'

export interface ReviewRecord { id: 'review'; generation: number; data: ReviewData }
export class IndexedDbReview implements ReviewGateway {
  constructor(private db: Dexie, private clock = systemClock) {}
  async read(): Promise<ReviewSnapshot> {
    return this.db.transaction('r', this.db.tables, async () => {
      if (this.db.backendDB().version !== 50) throw new Error('Unsupported database version')
      const packs = validateStudyLibrary(await this.db.table('packs').toArray()), record = await this.db.table<ReviewRecord>('review').get('review')
      if (record && (!Number.isSafeInteger(record.generation) || record.generation < 0)) throw new Error('Invalid review generation')
      return { packs, data: validateReview(record?.data ?? emptyReview(), packs), generation: record?.generation ?? 0 }
    })
  }
  async execute(command: ReviewCommand): Promise<ReviewSnapshot> {
    return this.db.transaction('rw', this.db.tables, async () => {
      if (this.db.backendDB().version !== 50) throw new Error('Unsupported database version')
      const packs = validateStudyLibrary(await this.db.table('packs').toArray()), table = this.db.table<ReviewRecord>('review'), record = await table.get('review')
      const current = validateReview(record?.data ?? emptyReview(), packs), generation = record?.generation ?? 0
      if (!Number.isSafeInteger(generation) || generation < 0) throw new Error('Invalid review generation')
      const now = this.clock(), at = now.toISOString()
      let next: ReviewData
      const sequence = Math.max(0, ...current.events.map(e => e.sequence), ...current.undos.map(u => u.sequence)) + 1
      const lastInstant = [...current.events.map(e => e.reviewedAt), ...current.undos.map(u => u.undoneAt)].sort().at(-1)
      const conflict = (message: string): never => { throw new ReviewConflict(message) }
      if (command.type === 'rate') {
        const duplicate = current.events.find(e => e.id === command.id)
        if (duplicate) {
          if (duplicate.cardId !== command.cardId || duplicate.rating !== command.rating || duplicate.contentRevision !== command.contentRevision || (duplicate.before?.revision ?? 0) !== command.expectedRevision || JSON.stringify(duplicate.settings) !== JSON.stringify(command.settings)) return conflict('Mã thao tác đã được dùng cho lượt khác.')
          return { packs, data: current, generation }
        }
        if (current.undos.some(u => u.id === command.id)) return conflict('Mã thao tác đã được dùng.')
        const card = packs.flatMap(p => p.cards).find(c => c.id === command.cardId), before = current.schedules.find(s => s.cardId === command.cardId) ?? null
        if (!card || card.revision !== command.contentRevision || (before?.revision ?? 0) !== command.expectedRevision || JSON.stringify(current.settings) !== JSON.stringify(command.settings)) return conflict('Thẻ hoặc lịch ôn đã đổi ở tab khác. Đã tải lại; hãy tự nhớ và mở đáp án lần nữa.')
        if (lastInstant && at < lastInstant) return conflict('Đồng hồ đang sớm hơn lượt ôn trước. Hãy kiểm tra giờ thiết bị.')
        if (before?.state && before.state.due > at) return conflict('Thẻ này chưa đến hạn. Không ghi đánh giá sớm.')
        if (!before?.state && newCardsUsed(current, now) >= current.settings.newPerDay) return conflict('Đã đạt giới hạn thẻ mới của ngày học này.')
        const after: CardSchedule = { cardId: card.id, revision: (before?.revision ?? 0) + 1, state: scheduleRecall(before?.state ?? null, command.rating, now), lastEventId: command.id }
        next = { ...current, schedules: [...current.schedules.filter(s => s.cardId !== card.id), after], events: [...current.events, { id: command.id, cardId: card.id, rating: command.rating, reviewedAt: at, studyDay: studyDay(now, current.settings.timeZone), contentRevision: card.revision, before, after, settings: { ...current.settings }, sequence }] }
      } else if (command.type === 'undo') {
        const duplicate = current.undos.find(u => u.id === command.id)
        if (duplicate) { if (duplicate.eventId !== command.eventId) return conflict('Mã hoàn tác đã được dùng.'); return { packs, data: current, generation } }
        if (current.events.some(e => e.id === command.id)) return conflict('Mã thao tác đã được dùng.')
        const event = latestReview(current), card = packs.flatMap(p => p.cards).find(c => c.id === event?.cardId), schedule = current.schedules.find(s => s.cardId === event?.cardId)
        if (!event || event.id !== command.eventId || !card || card.revision !== event.contentRevision || JSON.stringify(schedule) !== JSON.stringify(event.after)) return conflict('Không thể hoàn tác an toàn: có lượt mới, thẻ đã sửa hoặc đã xóa.')
        if (lastInstant && at < lastInstant) return conflict('Hãy kiểm tra đồng hồ trước khi hoàn tác.')
        const after: CardSchedule = { cardId: event.cardId, revision: event.after.revision + 1, state: event.before?.state ?? null, lastEventId: event.before?.lastEventId ?? null }
        next = { ...current, schedules: current.schedules.map(s => s.cardId === after.cardId ? after : s), undos: [...current.undos, { id: command.id, eventId: event.id, undoneAt: at, sequence, after }] }
      } else {
        if (command.expectedGeneration !== generation) return conflict('Thiết lập đã đổi ở tab khác. Hãy kiểm tra lại.')
        next = { ...current, settings: validateReviewSettings({ ...current.settings, newPerDay: command.newPerDay }) }
      }
      next = validateReview(next, packs)
      const meta = await this.db.table('meta').get('library'), prefs = await this.db.table('settings').get('reader')
      exportBackup({ quizActiveAttemptId: (await this.db.table('quiz').get('quiz'))?.activeAttemptId ?? null, quizAttempts: (await this.db.table('quiz').get('quiz'))?.attempts ?? [], packs, review: next, documents: await this.db.table('documents').toArray(), positions: await this.db.table('positions').toArray(), activeDocumentId: meta?.activeDocumentId ?? null, draft: meta?.draft ?? null, preferences: prefs ? { reader: prefs.reader, glow: prefs.glow, progress: prefs.progress, fontSize: prefs.fontSize } : defaultPreferences })
      await table.put({ id: 'review', generation: generation + 1, data: next })
      return { packs, data: next, generation: generation + 1 }
    })
  }
}
