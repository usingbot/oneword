import { describe, expect, it } from 'vitest'
import { createPack, exportStudyPack, parseStudyPack, validateStudyPack } from './study-pack'
import { deleteQuestion, saveQuestion, saveQuiz } from './quiz-content'
import { grade, mergeAttempts, seededRandom, shuffle, startAttempt, updateAttempt, validateAttempt, type QuizMode } from './quiz'
import { emptyLibrary } from './library'
import { exportBackup, mergeBackup, parseBackup } from './backup'

const now = new Date('2026-09-17T12:00:00.000Z')
export function quizFixture() {
  let pack = saveQuiz(createPack('Quiz fixture'), 'Numbers', 'Synthetic content', 'quiz')
  for (let i = 0; i < 3; i++) pack = saveQuestion(pack, 'quiz', { id: `question-${i}`, prompt: `Question ${i}`, choices: [{ id: 'wrong', text: 'Wrong choice' }, { id: 'right', text: 'Right choice' }, { id: 'other', text: 'Other choice' }], correctChoiceId: 'right', explanation: `Explanation ${i}` })
  return pack
}
const start = (mode: QuizMode = 'test', seed = 42) => startAttempt([quizFixture()], { type: 'start', id: 'attempt', quizId: 'quiz', mode, seed, shuffleQuestions: true, shuffleChoices: true }, now)
describe('quiz content and identity', () => {
  it('creates quiz/questions manually with stable choice IDs and increasing content revision', () => {
    const pack = quizFixture(), q = pack.questions![0], changed = saveQuestion(pack, 'quiz', { ...q, prompt: 'Edited' })
    expect(pack.schemaVersion).toBe(2); expect(pack.quizzes![0].questionIds).toHaveLength(3)
    expect(changed.questions![0]).toMatchObject({ id: q.id, revision: 2, choices: q.choices })
    expect(deleteQuestion(changed, q.id).quizzes![0].questionIds).not.toContain(q.id)
  })
  it('preserves Study Pack v1 and excludes personal fields from v2 exports', () => {
    const old = createPack('Legacy'); expect(parseStudyPack(exportStudyPack(old))).toEqual(old)
    const pack = quizFixture(); expect(parseStudyPack(exportStudyPack(pack))).toEqual(pack)
    expect(exportStudyPack(pack)).not.toMatch(/attempts|score|schedule|history|flagged/)
    expect(() => validateStudyPack({ ...pack, attempts: [] })).toThrow()
  })
  it.each(['missing-choices', 'duplicate-choice', 'missing-answer', 'duplicate-question', 'missing-reference', 'explanation', 'url', 'future', 'foreign-state'])('rejects malformed %s atomically', kind => {
    const pack = JSON.parse(exportStudyPack(quizFixture())), q = pack.questions[0]
    if (kind === 'missing-choices') delete q.choices
    if (kind === 'duplicate-choice') q.choices[1].id = q.choices[0].id
    if (kind === 'missing-answer') q.correctChoiceId = 'missing'
    if (kind === 'duplicate-question') pack.questions.push(q)
    if (kind === 'missing-reference') pack.quizzes[0].questionIds.push('missing')
    if (kind === 'explanation') q.explanation = { html: 'unsafe' }
    if (kind === 'url') q.image = { url: 'data:image/png;base64,x', alt: 'invalid' }
    if (kind === 'future') pack.schemaVersion = 3
    if (kind === 'foreign-state') pack.history = []
    expect(() => parseStudyPack(JSON.stringify(pack))).toThrow()
  })
})
describe('quiz attempts and grading', () => {
  it('deterministic shuffle moves choices and grading uses IDs rather than positions', () => {
    expect(shuffle([1, 2, 3, 4], seededRandom(42))).toEqual(shuffle([1, 2, 3, 4], seededRandom(42)))
    let a = start('test', 0); expect(a.items[0].choiceOrder.indexOf('right')).not.toBe(1)
    a = updateAttempt(a, { type: 'select', choiceId: 'right' }, now)
    expect(grade(a.items).correct).toBe(1); expect(validateAttempt(JSON.parse(JSON.stringify(a)))).toEqual(a)
  })
  it('Practice locks a submitted selection and exposes feedback only after explicit answer', () => {
    let a = start('practice'); expect(a.items[0].submitted).toBe(false)
    a = updateAttempt(a, { type: 'select', choiceId: 'wrong' }, now); expect(a.items[0].submitted).toBe(false)
    a = updateAttempt(a, { type: 'answer' }, now); expect(a.items[0].submitted).toBe(true); expect(a.items[0].question.explanation).toBeTruthy()
    expect(() => updateAttempt(a, { type: 'select', choiceId: 'right' }, now)).toThrow('khóa')
    expect(() => updateAttempt(a, { type: 'finish' }, now)).toThrow('các câu còn lại')
  })
  it('Test stores no result before submit and counts unanswered as incorrect afterward', () => {
    let a = start(); a = updateAttempt(a, { type: 'select', choiceId: 'right' }, now)
    expect(a.result).toBeNull(); expect(a.items[0].submitted).toBe(false)
    expect(() => updateAttempt(a, { type: 'answer' }, now)).toThrow()
    a = updateAttempt(a, { type: 'finish' }, now)
    expect(a.result).toEqual({ correct: 1, total: 3, answered: 1, unanswered: 2, excluded: 0 })
    expect(() => updateAttempt(a, { type: 'select', choiceId: 'wrong' }, now)).toThrow('đã nộp')
  })
  it('in-progress round-trip preserves flags, answers, current position and actual order', () => {
    let a = start(); a = updateAttempt(a, { type: 'navigate', index: 1 }, now); a = updateAttempt(a, { type: 'flag' }, now); a = updateAttempt(a, { type: 'select', choiceId: 'other' }, now)
    const pack = quizFixture(), data = { ...emptyLibrary(), packs: [pack], quizAttempts: [a] }
    expect(parseBackup(exportBackup(data)).data).toEqual(data)
  })
  it('snapshot history survives content edits/deletion and does not change FSRS state', () => {
    const a = updateAttempt(start(), { type: 'finish' }, now), before = emptyLibrary(), data = { ...before, quizAttempts: [a] }
    const restored = mergeBackup(emptyLibrary(), parseBackup(exportBackup(data)).data).data
    expect(restored.quizAttempts).toEqual([a]); expect(restored.review).toEqual(before.review)
    expect(a.items[0].question.prompt).toContain('Question')
  })
  it('essential images must be available or explicitly excluded, never silently scored wrong', () => {
    const pack = quizFixture(), changed = saveQuestion(pack, 'quiz', { ...pack.questions![0], image: { url: 'https://example.com/essential.png', alt: 'Essential', essential: true } })
    let a = startAttempt([changed], { type: 'start', id: 'media-attempt', quizId: 'quiz', mode: 'test', seed: 0, shuffleQuestions: false, shuffleChoices: false }, now)
    expect(() => updateAttempt(a, { type: 'select', choiceId: 'right' }, now)).toThrow('ảnh')
    expect(() => updateAttempt(a, { type: 'finish' }, now)).toThrow('ảnh')
    a = updateAttempt(a, { type: 'unavailable' }, now); a = updateAttempt(a, { type: 'finish' }, now)
    expect(a.result).toEqual({ correct: 0, total: 2, answered: 0, unanswered: 2, excluded: 1 })
  })
  it.each(['order', 'answer', 'result', 'mode', 'clock'])('rejects corrupted attempt %s', kind => {
    const a = JSON.parse(JSON.stringify(updateAttempt(start(), { type: 'finish' }, now)))
    if (kind === 'order') a.items[0].choiceOrder[1] = a.items[0].choiceOrder[0]
    if (kind === 'answer') a.items[0].selectedChoiceId = 'missing'
    if (kind === 'result') a.result.correct = 99
    if (kind === 'mode') a.mode = 'exam'
    if (kind === 'clock') a.completedAt = '2020-01-01T00:00:00.000Z'
    expect(() => validateAttempt(a)).toThrow()
  })
  it('restore is idempotent and rejects divergent same-ID history without overwriting', () => {
    const a = start(), changed = updateAttempt(a, { type: 'flag' }, now)
    expect(mergeAttempts([a], [a])).toEqual([a]); expect(() => mergeAttempts([a], [changed])).toThrow('khác trạng thái')
  })
  it.each([1, 2, 3, 4])('migrates Personal Backup v%s with empty attempts and preserved reader/review', version => {
    const data = emptyLibrary(), old = JSON.parse(exportBackup(data)); old.schemaVersion = version; delete old.data.quizAttempts; delete old.data.quizActiveAttemptId
    if (version < 4) delete old.data.review
    if (version < 3) delete old.data.packs
    expect(parseBackup(JSON.stringify(old))).toMatchObject({ schemaVersion: 5, data })
  })
})
