import { describe, expect, it } from 'vitest'
import { createEmptyCard, fsrs, Rating, State, type Card } from 'ts-fsrs'
import { scheduleRecall, schedulerParameters } from './fsrs-adapter'
import { emptyReview, reviewQueue, studyDay, type CardSchedule, type SchedulerState } from './review'
import { addDeck, createPack, saveCard } from './study-pack'
import { exportBackup, parseBackup } from './backup'
import { emptyLibrary } from './library'
import { createDocument, revise } from './document'

const now = new Date('2026-09-17T12:00:00.000Z'), real = fsrs(schedulerParameters)
function serialized(card: Card): SchedulerState {
  return { state: card.state === State.Learning ? 'learning' : card.state === State.Review ? 'review' : 'relearning', due: card.due.toISOString(), lastReview: card.last_review!.toISOString(), stability: card.stability, difficulty: card.difficulty, elapsedDays: card.elapsed_days, scheduledDays: card.scheduled_days, learningSteps: card.learning_steps, reps: card.reps, lapses: card.lapses }
}
describe('FSRS adapter using the real pinned library', () => {
  it.each([['again', Rating.Again], ['hard', Rating.Hard], ['good', Rating.Good], ['easy', Rating.Easy]] as const)('new card %s matches library output with frozen time', (rating, grade) => {
    expect(scheduleRecall(null, rating, now)).toEqual(serialized(real.next(createEmptyCard(now), now, grade).card))
  })
  it.each([['again', Rating.Again], ['hard', Rating.Hard], ['good', Rating.Good], ['easy', Rating.Easy]] as const)('overdue subsequent %s passes all scheduler state and preserves input', (rating, grade) => {
    const first = real.next(createEmptyCard(now), now, Rating.Easy).card, later = new Date(first.due.getTime() + 20 * 86400000)
    const input = serialized(first), untouched = structuredClone(input)
    expect(scheduleRecall(input, rating, later)).toEqual(serialized(real.next(first, later, grade).card))
    expect(input).toEqual(untouched)
  })
  it('lapse enters relearning and learning steps survive serialization', () => {
    const first = scheduleRecall(null, 'easy', now), lapse = scheduleRecall(first, 'again', new Date(first.due))
    expect(first.state).toBe('review'); expect(lapse.state).toBe('relearning'); expect(lapse.lapses).toBe(first.lapses + 1)
    const next = scheduleRecall(JSON.parse(JSON.stringify(lapse)), 'good', new Date(lapse.due))
    expect(next.reps).toBe(lapse.reps + 1)
  })
  it('rejects time moving behind last review', () => { expect(() => scheduleRecall(scheduleRecall(null, 'good', now), 'again', new Date(now.getTime() - 1))).toThrow() })
})
describe('study days and content separation', () => {
  it('uses persisted timezone through midnight and DST instead of device timezone', () => {
    expect(studyDay(new Date('2026-09-17T16:59:59.999Z'), 'Asia/Ho_Chi_Minh')).toBe('2026-09-17')
    expect(studyDay(new Date('2026-09-17T17:00:00.000Z'), 'Asia/Ho_Chi_Minh')).toBe('2026-09-18')
    expect(studyDay(new Date('2026-11-01T05:30:00Z'), 'America/New_York')).toBe('2026-11-01')
    expect(studyDay(new Date('2026-11-01T06:30:00Z'), 'America/New_York')).toBe('2026-11-01')
  })
  it('orders due before new, keeps overdue cards with limit zero, deterministic ties', () => {
    let pack = addDeck(createPack('Queue'), 'Deck')
    for (let i = 0; i < 3; i++) pack = saveCard(pack, { deckId: pack.decks[0].id, front: { text: `q${i}` }, back: { text: 'a' } })
    const a = pack.cards[0], b = pack.cards[1], state = scheduleRecall(null, 'good', now)
    const schedules: CardSchedule[] = [a, b].map(c => ({ cardId: c.id, revision: 1, state, lastEventId: 'test' }))
    const data = { ...emptyReview('UTC'), schedules, settings: { ...emptyReview('UTC').settings, newPerDay: 0 } }
    const queue = reviewQueue(pack.cards, data, new Date(state.due))
    expect(queue.cards.map(c => c.id)).toEqual([a.id, b.id].sort()); expect(queue.fresh).toHaveLength(1)
  })
  it.each([1, 2, 3])('Personal Backup v%s adds empty review state and preserves prior data', version => {
    const doc = revise(createDocument('original reader text', 'old.txt', 'txt'), 'edited reader text')
    const deck = addDeck(createPack('M3a pack'), 'M3a deck'), pack = saveCard(deck, { deckId: deck.decks[0].id, front: { text: 'Question' }, back: { text: 'Answer' } })
    const base = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id, draft: { documentId: doc.id, text: 'unsaved draft' }, packs: version === 3 ? [pack] : [] }
    const old = JSON.parse(exportBackup(base)); old.schemaVersion = version; delete old.data.review; delete old.data.quizAttempts; delete old.data.quizActiveAttemptId
    if (version < 3) delete old.data.packs
    const migrated = parseBackup(JSON.stringify(old))
    expect(migrated.schemaVersion).toBe(5); expect(migrated.data).toEqual(base)
  })
})
