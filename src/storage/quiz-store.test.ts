import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { IndexedDbStorage } from './indexed-db'
import { IndexedDbQuiz } from './quiz-store'
import { IndexedDbReview } from './review-store'
import { createPack } from '../application/study-pack'
import { saveQuestion, saveQuiz } from '../application/quiz-content'
import { emptyLibrary } from '../application/library'
import { exportBackup, mergeBackup, parseBackup } from '../application/backup'
import type { QuizCommand } from '../application/quiz'

const stores: IndexedDbStorage[] = []
afterEach(async () => { for (const s of stores) { s.close(); await Dexie.delete(s.db.name) }; stores.length = 0 })
function make(name: string = crypto.randomUUID()) { const s = new IndexedDbStorage(name); stores.push(s); return s }
const request: Extract<QuizCommand, { type: 'start' }> = { type: 'start', id: 'attempt', quizId: 'quiz', mode: 'test', seed: 5, shuffleQuestions: true, shuffleChoices: true }
async function fixture() {
  const store = make(); await store.read()
  const pack = saveQuestion(saveQuiz(createPack('Quiz test'), 'Quiz', '', 'quiz'), 'quiz', { id: 'question', prompt: 'Question', choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctChoiceId: 'b' })
  await store.save({ ...emptyLibrary(), packs: [pack] }, 0)
  return { store, pack, quiz: new IndexedDbQuiz(store.db, () => new Date('2026-09-17T12:00:00.000Z')) }
}
describe('quiz storage boundary', () => {
  it('start is idempotent; double selection and two-tab stale updates cannot overwrite', async () => {
    const { store, quiz } = await fixture(), a = await quiz.execute(request)
    expect(await quiz.execute(request)).toEqual(a)
    const otherStore = make(store.db.name), other = new IndexedDbQuiz(otherStore.db); await otherStore.read()
    const update: QuizCommand = { type: 'update', id: 'attempt', expectedRevision: 1, action: { type: 'select', choiceId: 'b' } }
    const results = await Promise.allSettled([quiz.execute(update), other.execute({ ...update, action: { type: 'select', choiceId: 'a' } })])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect((await quiz.read()).attempts[0].revision).toBe(2)
  })
  it('reload keeps exact in-progress state; final submission survives new adapter and FSRS is unchanged', async () => {
    const { store, quiz } = await fixture(), review = new IndexedDbReview(store.db), before = await review.read()
    await quiz.execute(request)
    const selected = await quiz.execute({ type: 'update', id: 'attempt', expectedRevision: 1, action: { type: 'select', choiceId: 'b' } })
    expect(await new IndexedDbQuiz(store.db).read()).toEqual(selected)
    const completed = await quiz.execute({ type: 'update', id: 'attempt', expectedRevision: 2, action: { type: 'finish' } })
    expect(completed.attempts[0].result).toMatchObject({ correct: 1, total: 1 })
    expect(await new IndexedDbQuiz(store.db).read()).toEqual(completed); expect(await review.read()).toEqual(before)
  })
  it('failure rolls back the entire attempt; retry preserves order and selection', async () => {
    const { store, quiz } = await fixture(), before = await quiz.execute(request)
    const reject = () => { throw new DOMException('Synthetic quota', 'QuotaExceededError') }
    store.db.table('quiz').hook('updating', reject)
    await expect(quiz.execute({ type: 'update', id: 'attempt', expectedRevision: 1, action: { type: 'select', choiceId: 'b' } })).rejects.toThrow()
    store.db.table('quiz').hook('updating').unsubscribe(reject)
    expect(await quiz.read()).toEqual(before)
    expect((await quiz.execute({ type: 'update', id: 'attempt', expectedRevision: 1, action: { type: 'select', choiceId: 'b' } })).attempts[0].items[0].selectedChoiceId).toBe('b')
  })
  it('ordinary reader/content saves preserve live attempts even with stale in-memory history', async () => {
    const { store, quiz, pack } = await fixture(), before = await quiz.execute(request)
    await store.save({ ...emptyLibrary(), packs: [pack] }, 1)
    expect(await quiz.read()).toEqual(before)
    await store.save(emptyLibrary(), 2)
    expect((await quiz.read()).attempts).toEqual(before.attempts)
  })
  it('editing the source question preserves attempt snapshot revisions and correct answer', async () => {
    const { store, quiz, pack } = await fixture(), before = await quiz.execute(request)
    const changed = saveQuestion(pack, 'quiz', { ...pack.questions![0], prompt: 'Changed prompt', correctChoiceId: 'a' })
    await store.save({ ...emptyLibrary(), packs: [changed] }, 1)
    const after = await quiz.read()
    expect(after.attempts).toEqual(before.attempts); expect(after.packs[0].questions![0]).toMatchObject({ prompt: 'Changed prompt', correctChoiceId: 'a', revision: 2 })
    await quiz.execute({ type: 'update', id: 'attempt', expectedRevision: 1, action: { type: 'select', choiceId: 'b' } })
    expect((await quiz.execute({ type: 'update', id: 'attempt', expectedRevision: 2, action: { type: 'finish' } })).attempts[0].result?.correct).toBe(1)
  })
  it('backup restores attempts atomically and rejects stale restore generations', async () => {
    const { store, quiz } = await fixture(); await quiz.execute(request)
    const backup = parseBackup(exportBackup((await store.read()).data)), restored = make(); await restored.read()
    const merged = mergeBackup(emptyLibrary(), backup.data).data
    await restored.save(merged, 0, 0, 0)
    expect((await new IndexedDbQuiz(restored.db).read()).attempts).toEqual(backup.data.quizAttempts)
    const current = await quiz.read(); await quiz.execute({ type: 'update', id: 'attempt', expectedRevision: 1, action: { type: 'flag' } })
    await expect(store.save(backup.data, 1, (await new IndexedDbReview(store.db).read()).generation, current.generation)).rejects.toThrow('Concurrent quiz')
    expect((await quiz.read()).attempts[0].items[0].flagged).toBe(true)
  })
  it('initial reader checkpoint does not invalidate a fresh empty quiz restore generation', async () => {
    const store = make(); const initial = await store.read(), quiz = new IndexedDbQuiz(store.db), before = await quiz.read()
    await store.save(initial.data, initial.generation)
    expect((await quiz.read()).generation).toBe(before.generation)
    await expect(store.save(initial.data, 1, undefined, before.generation)).resolves.toBe(2)
  })
  it('remembers the selected older attempt across reload and backup, including explicit return to list', async () => {
    const { store, quiz } = await fixture(); await quiz.execute(request); await quiz.execute({ ...request, id: 'second' })
    await quiz.execute({ type: 'open', id: 'attempt' })
    expect((await new IndexedDbQuiz(store.db).read()).activeAttemptId).toBe('attempt')
    expect(parseBackup(exportBackup((await store.read()).data)).data.quizActiveAttemptId).toBe('attempt')
    await expect(quiz.execute({ type: 'open', id: 'missing' })).rejects.toThrow('không tồn tại')
    await quiz.execute({ type: 'open', id: null }); expect((await quiz.read()).activeAttemptId).toBeNull()
  })
  it('migrates real M3b v4 preserving all reader/content/FSRS stores', async () => {
    const name = crypto.randomUUID(), old = new Dexie(name), data = emptyLibrary()
    old.version(4).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id', packs: 'id', review: 'id' })
    await old.open(); await old.table('review').put({ id: 'review', generation: 9, data: data.review }); await old.table('meta').put({ id: 'library', schemaVersion: 4, generation: 3, activeDocumentId: null, draft: null }); old.close()
    const migrated = make(name); expect(await migrated.read()).toEqual({ data, generation: 3 }); expect(migrated.db.backendDB().version).toBe(50)
    expect((await new IndexedDbReview(migrated.db).read()).generation).toBe(9); expect((await new IndexedDbQuiz(migrated.db).read()).attempts).toEqual([])
  })
  it('rolls back failed v4 migration without altering old review data', async () => {
    const name = crypto.randomUUID(), old = new Dexie(name)
    old.version(4).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id', packs: 'id', review: 'id' })
    await old.open(); await old.table('meta').put({ id: 'library', schemaVersion: 99 }); await old.table('review').put({ id: 'review', sentinel: 'keep' }); old.close()
    await expect(make(name).read()).rejects.toThrow('Unsupported database schema')
    await old.open(); expect(old.backendDB().version).toBe(40); expect((await old.table('review').get('review')).sentinel).toBe('keep'); old.close()
  })
})
