import { array, id, integer, record, text, timestamp, type StudyPack } from './study-pack'
import { validateQuestion, type QuizQuestion } from './quiz-content'

export type QuizMode = 'practice' | 'test'
export interface AttemptItem { question: QuizQuestion; choiceOrder: readonly string[]; selectedChoiceId: string | null; submitted: boolean; unavailable: boolean; mediaReady: boolean; flagged: boolean }
export interface QuizResult { correct: number; total: number; answered: number; unanswered: number; excluded: number }
export interface QuizAttempt {
  id: string; quizId: string; packId: string; title: string; mode: QuizMode; startedAt: string; completedAt: string | null
  revision: number; current: number; seed: number; shuffleQuestions: boolean; shuffleChoices: boolean
  questionOrder: readonly string[]; items: readonly AttemptItem[]; result: QuizResult | null
}
export interface QuizSnapshot { activeAttemptId: string | null; attempts: readonly QuizAttempt[]; generation: number; packs: readonly StudyPack[] }
export type QuizAction = { type: 'select'; choiceId: string | null } | { type: 'navigate'; index: number } | { type: 'flag' } | { type: 'media'; ready: boolean } | { type: 'unavailable' } | { type: 'answer' } | { type: 'finish' }
export type QuizCommand = { type: 'open'; id: string | null } | { type: 'start'; id: string; quizId: string; mode: QuizMode; seed: number; shuffleQuestions: boolean; shuffleChoices: boolean } | { type: 'update'; id: string; expectedRevision: number; action: QuizAction }
export interface QuizGateway { read(): Promise<QuizSnapshot>; execute(command: QuizCommand): Promise<QuizSnapshot> }
export function randomSeed() { return crypto.getRandomValues(new Uint32Array(1))[0] }
// Mulberry32 + Fisher–Yates, for reproducible ordering only (not cryptography).
export function seededRandom(seed: number) { let state = seed >>> 0; return () => { state = (state + 0x6D2B79F5) | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
export function shuffle<T>(values: readonly T[], random: () => number) { const result = [...values]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }; return result }
export function grade(items: readonly AttemptItem[]): QuizResult {
  const eligible = items.filter(i => !i.unavailable), answered = eligible.filter(i => i.selectedChoiceId !== null).length
  return { correct: eligible.filter(i => i.selectedChoiceId === i.question.correctChoiceId).length, total: eligible.length, answered, unanswered: eligible.length - answered, excluded: items.length - eligible.length }
}
export function startAttempt(packs: readonly StudyPack[], command: Extract<QuizCommand, { type: 'start' }>, now: Date): QuizAttempt {
  const pack = packs.find(p => p.quizzes?.some(q => q.id === command.quizId)), quiz = pack?.quizzes?.find(q => q.id === command.quizId)
  if (!pack || !quiz || !quiz.questionIds.length) throw new Error('Quiz chưa có câu hỏi hoặc không còn tồn tại.')
  const random = seededRandom(command.seed), order = command.shuffleQuestions ? shuffle(quiz.questionIds, random) : [...quiz.questionIds]
  return validateAttempt({ id: command.id, quizId: quiz.id, packId: pack.id, title: quiz.title, mode: command.mode, startedAt: now.toISOString(), completedAt: null, revision: 1, current: 0, seed: command.seed, shuffleQuestions: command.shuffleQuestions, shuffleChoices: command.shuffleChoices, questionOrder: order, items: order.map(key => {
    const question = structuredClone(pack.questions!.find(q => q.id === key)!), choices = question.choices.map(c => c.id)
    return { question, choiceOrder: command.shuffleChoices ? shuffle(choices, random) : choices, selectedChoiceId: null, submitted: false, unavailable: false, mediaReady: !question.image?.essential, flagged: false }
  }), result: null })
}
export function updateAttempt(attempt: QuizAttempt, action: QuizAction, now: Date): QuizAttempt {
  if (attempt.completedAt) throw new Error('Bài đã nộp; không thể sửa kết quả.')
  if (now.toISOString() < attempt.startedAt) throw new Error('Đồng hồ sớm hơn lúc bắt đầu bài. Hãy kiểm tra giờ thiết bị.')
  const next = structuredClone(attempt), items = [...next.items], item = items[next.current]
  const locked = item.submitted || item.unavailable
  if (action.type === 'navigate') {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= items.length) throw new Error('Vị trí câu hỏi không hợp lệ.')
    next.current = action.index
  } else if (action.type === 'flag') item.flagged = !item.flagged
  else if (action.type === 'finish') {
    if (items.some(i => i.question.image?.essential && !i.mediaReady && !i.unavailable)) throw new Error('Cần tải ảnh thiết yếu hoặc đánh dấu câu không khả dụng trước khi nộp.')
    if (next.mode === 'practice' && items.some(i => !i.submitted && !i.unavailable)) throw new Error('Hãy trả lời hoặc đánh dấu ảnh không khả dụng cho các câu còn lại.')
    next.completedAt = now.toISOString(); next.result = grade(items)
  } else {
    if (locked) throw new Error('Câu đã chốt; lựa chọn được khóa.')
    if (action.type === 'media') { item.mediaReady = action.ready; if (!action.ready && item.question.image?.essential) item.selectedChoiceId = null }
    if (action.type === 'unavailable') {
      if (!item.question.image?.essential) throw new Error('Chỉ câu cần ảnh thiết yếu mới được loại do thiếu ảnh.')
      item.unavailable = true; item.selectedChoiceId = null
    }
    if (action.type === 'select') {
      if (!item.mediaReady) throw new Error('Cần ảnh thiết yếu trước khi chọn đáp án.')
      if (action.choiceId !== null && !item.question.choices.some(c => c.id === action.choiceId)) throw new Error('Lựa chọn không tồn tại.')
      item.selectedChoiceId = action.choiceId
    }
    if (action.type === 'answer') {
      if (next.mode !== 'practice' || !item.mediaReady || item.selectedChoiceId === null) throw new Error('Hãy chọn đáp án trong chế độ luyện tập.')
      item.submitted = true
    }
  }
  return validateAttempt({ ...next, items, revision: next.revision + 1 })
}
function bool(value: unknown) { if (typeof value !== 'boolean') throw new Error('Trạng thái quiz cần boolean.'); return value }
export function validateAttempt(value: unknown): QuizAttempt {
  const a = record(value, ['id', 'quizId', 'packId', 'title', 'mode', 'startedAt', 'completedAt', 'revision', 'current', 'seed', 'shuffleQuestions', 'shuffleChoices', 'questionOrder', 'items', 'result'], [], 'Lượt quiz')
  if (a.mode !== 'practice' && a.mode !== 'test') throw new Error('Chế độ quiz không hợp lệ.')
  if (typeof a.seed !== 'number' || !Number.isInteger(a.seed) || a.seed < 0 || a.seed > 0xffffffff) throw new Error('Seed quiz không hợp lệ.')
  const items = array(a.items, 200, 'Câu trong lượt quiz').map(value => {
    const i = record(value, ['question', 'choiceOrder', 'selectedChoiceId', 'submitted', 'unavailable', 'mediaReady', 'flagged'], [], 'Trạng thái câu'), question = validateQuestion(i.question)
    const choiceOrder = array(i.choiceOrder, 6, 'Thứ tự lựa chọn').map(v => id(v, 'ID lựa chọn'))
    if (choiceOrder.length !== question.choices.length || new Set(choiceOrder).size !== choiceOrder.length || choiceOrder.some(key => !question.choices.some(c => c.id === key))) throw new Error('Thứ tự lựa chọn không khớp câu hỏi.')
    const selectedChoiceId = i.selectedChoiceId === null ? null : id(i.selectedChoiceId, 'Lựa chọn đã chọn')
    if (selectedChoiceId !== null && !choiceOrder.includes(selectedChoiceId)) throw new Error('Đáp án đã chọn không tồn tại.')
    const item: AttemptItem = { question, choiceOrder, selectedChoiceId, submitted: bool(i.submitted), unavailable: bool(i.unavailable), mediaReady: bool(i.mediaReady), flagged: bool(i.flagged) }
    if (item.unavailable && (!question.image?.essential || selectedChoiceId !== null || item.submitted) || item.submitted && (a.mode !== 'practice' || selectedChoiceId === null) || question.image?.essential && !item.mediaReady && selectedChoiceId !== null) throw new Error('Trạng thái trả lời/ảnh không nhất quán.')
    return item
  })
  const questionOrder = array(a.questionOrder, 200, 'Thứ tự câu hỏi').map(v => id(v, 'ID câu hỏi'))
  if (!items.length || questionOrder.length !== items.length || new Set(questionOrder).size !== items.length || items.some((i, index) => i.question.id !== questionOrder[index])) throw new Error('Thứ tự câu hỏi không hợp lệ.')
  const current = integer(a.current, 0, 'Vị trí câu hỏi'), startedAt = timestamp(a.startedAt, 'Bắt đầu'), completedAt = a.completedAt === null ? null : timestamp(a.completedAt, 'Hoàn thành')
  if (current >= items.length || completedAt && completedAt < startedAt) throw new Error('Thời gian/vị trí quiz không hợp lệ.')
  let result: QuizResult | null = null
  if (completedAt) {
    const r = record(a.result, ['correct', 'total', 'answered', 'unanswered', 'excluded'], [], 'Kết quả'), expected = grade(items)
    if (Object.entries(expected).some(([key, value]) => r[key] !== value) || items.some(i => i.question.image?.essential && !i.mediaReady && !i.unavailable) || a.mode === 'practice' && items.some(i => !i.submitted && !i.unavailable)) throw new Error('Kết quả quiz không khớp câu trả lời.')
    result = expected
  } else if (a.result !== null) throw new Error('Bài chưa nộp không được có kết quả.')
  return { id: id(a.id, 'ID lượt quiz'), quizId: id(a.quizId, 'ID quiz'), packId: id(a.packId, 'ID pack'), title: text(a.title, 120, 'Tên quiz', true), mode: a.mode, startedAt, completedAt, revision: integer(a.revision, 1, 'Revision lượt quiz'), current, seed: a.seed, shuffleQuestions: bool(a.shuffleQuestions), shuffleChoices: bool(a.shuffleChoices), questionOrder, items, result }
}
export function validateAttempts(value: unknown): readonly QuizAttempt[] {
  const attempts = array(value, 200, 'Lịch sử quiz').map(validateAttempt).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  if (new Set(attempts.map(a => a.id)).size !== attempts.length) throw new Error('ID lượt quiz bị trùng.')
  return attempts
}
export function mergeAttempts(local: readonly QuizAttempt[], incoming: readonly QuizAttempt[]) {
  const result = [...local]
  for (const attempt of incoming) { const old = result.find(a => a.id === attempt.id); if (old && JSON.stringify(old) !== JSON.stringify(attempt)) throw new Error('Lượt quiz cùng ID khác trạng thái; khôi phục bị chặn.'); if (!old) result.push(attempt) }
  return validateAttempts(result)
}

export function validateActiveAttempt(value: unknown, attempts: readonly QuizAttempt[]): string | null {
  if (value === null) return null
  const key = id(value, 'ID bài đang mở')
  if (!attempts.some(a => a.id === key)) throw new Error('Bài đang mở không tồn tại trong lịch sử quiz.')
  return key
}
