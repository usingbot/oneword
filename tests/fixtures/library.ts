import { emptyLibrary, type LibraryData } from '../../src/application/library'
import { validateStudyPack, type StudyPack } from '../../src/application/study-pack'
import { emptyReview, type CardSchedule, type ReviewEvent } from '../../src/application/review'
import { scheduleRecall } from '../../src/application/fsrs-adapter'
import { startAttempt, updateAttempt } from '../../src/application/quiz'

// Original synthetic content only. IDs, dates and random seeds are reproducible.
export function libraryFixture(large = false): LibraryData {
  const at = '2026-01-01T00:00:00.000Z', text = 'Synthetic local reading text. '.repeat(large ? 18000 : 12)
  const documentId = '00000000-0000-4000-8000-000000000001', revisionId = '00000000-0000-4000-8000-000000000002'
  const packs: StudyPack[] = Array.from({ length: large ? 4 : 1 }, (_, p) => validateStudyPack({
    type: 'oneword-study-pack', schemaVersion: 2, id: `pack-${p}`, title: `Synthetic pack ${p}`, description: 'Generated test data', createdAt: at, updatedAt: at,
    decks: [{ id: `deck-${p}`, packId: `pack-${p}`, title: 'Synthetic cards', order: 0 }],
    cards: Array.from({ length: large ? 500 : 3 }, (_, i) => ({ id: `card-${p}-${i}`, deckId: `deck-${p}`, front: { text: `Recall synthetic fact ${i}?` }, back: { text: `Synthetic answer ${i}.` }, order: i, revision: 1 })),
    quizzes: [{ id: `quiz-${p}`, packId: `pack-${p}`, title: 'Synthetic quiz', description: '', questionIds: Array.from({ length: large ? 20 : 2 }, (_, i) => `q-${p}-${i}`) }],
    questions: Array.from({ length: large ? 20 : 2 }, (_, i) => ({ id: `q-${p}-${i}`, prompt: `Synthetic question ${i}`, choices: [{ id: 'a', text: 'First answer' }, { id: 'b', text: 'Second answer' }], correctChoiceId: 'b', explanation: 'Synthetic explanation', revision: 1 })),
  }))
  const review = emptyReview('UTC'), cards = packs.flatMap(p => p.cards), schedules = new Map<string, CardSchedule>(), events: ReviewEvent[] = []
  for (let n = 0; n < (large ? 4000 : 1); n++) {
    const card = cards[n % cards.length], before = schedules.get(card.id) ?? null, now = new Date(Date.parse(at) + n * 60000)
    const id = `event-${n}`, after = { cardId: card.id, revision: (before?.revision ?? 0) + 1, state: scheduleRecall(before?.state ?? null, 'good', now), lastEventId: id }
    events.push({ id, cardId: card.id, rating: 'good', reviewedAt: now.toISOString(), studyDay: now.toISOString().slice(0, 10), contentRevision: 1, before, after, settings: review.settings, sequence: n + 1 }); schedules.set(card.id, after)
  }
  const attempts = Array.from({ length: large ? 200 : 2 }, (_, i) => {
    let a = startAttempt(packs, { type: 'start', id: `attempt-${i.toString().padStart(3, '0')}`, quizId: 'quiz-0', mode: 'test', seed: i, shuffleQuestions: true, shuffleChoices: true }, new Date(at))
    a = updateAttempt(a, { type: 'select', choiceId: 'b' }, new Date(at))
    return i % 2 ? a : updateAttempt(a, { type: 'finish' }, new Date(at))
  })
  return { ...emptyLibrary(), review: { ...review, schedules: [...schedules.values()].sort((a, b) => a.cardId.localeCompare(b.cardId)), events }, packs, quizAttempts: attempts, quizActiveAttemptId: attempts[1].id,
    documents: [{ id: documentId, source: 'txt', name: 'Synthetic reading.txt', original: text, createdAt: at, version: 1, revision: 0, revisions: [{ id: revisionId, documentId, number: 0, text, createdAt: at }] }],
    positions: [{ documentId, revisionId, offset: 10, settings: emptyLibrary().preferences.reader, updatedAt: at }], activeDocumentId: documentId,
  }
}
