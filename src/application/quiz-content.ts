import { array, face, id, integer, record, text, updatePack, type CardImage, type StudyPack } from './study-pack'

export interface Quiz { id: string; packId: string; deckId?: string; title: string; description: string; questionIds: readonly string[] }
export interface QuizChoice { id: string; text: string }
export interface QuizQuestion { id: string; prompt: string; image?: CardImage; choices: readonly QuizChoice[]; correctChoiceId: string; explanation?: string; tags?: readonly string[]; source?: string; revision: number }
export function validateQuestion(value: unknown): QuizQuestion {
  const q = record(value, ['id', 'prompt', 'choices', 'correctChoiceId', 'revision'], ['image', 'explanation', 'tags', 'source'], 'Câu hỏi')
  const content = face({ text: q.prompt, ...('image' in q ? { image: q.image } : {}) }, 'Câu hỏi')
  const choices = array(q.choices, 6, 'Lựa chọn').map(value => {
    const c = record(value, ['id', 'text'], [], 'Lựa chọn')
    return { id: id(c.id, 'ID lựa chọn'), text: text(c.text, 2000, 'Nội dung lựa chọn', true) }
  })
  if (choices.length < 2 || new Set(choices.map(c => c.id)).size !== choices.length) throw new Error('Cần 2–6 lựa chọn với ID không trùng trong câu hỏi.')
  const correctChoiceId = id(q.correctChoiceId, 'ID đáp án đúng')
  if (!choices.some(c => c.id === correctChoiceId)) throw new Error('Đáp án đúng không tồn tại trong lựa chọn.')
  const tags = 'tags' in q ? array(q.tags, 20, 'Nhãn').map(t => text(t, 64, 'Nhãn', true)) : undefined
  if (tags && new Set(tags).size !== tags.length) throw new Error('Nhãn bị trùng.')
  return { id: id(q.id, 'ID câu hỏi'), prompt: content.text, ...(content.image ? { image: content.image } : {}), choices, correctChoiceId, revision: integer(q.revision, 1, 'Revision câu hỏi'), ...('explanation' in q ? { explanation: text(q.explanation, 10000, 'Giải thích') } : {}), ...(tags ? { tags: tags.sort() } : {}), ...('source' in q ? { source: text(q.source, 1000, 'Nguồn') } : {}) }
}
export function validateQuizContent(quizzesValue: unknown, questionsValue: unknown, packId: string, deckIds: Set<string>, identifiers: Set<string>) {
  const unique = (value: unknown) => { const key = id(value, 'ID quiz/câu hỏi'); if (identifiers.has(key)) throw new Error(`ID ${key} bị trùng trong Study Pack.`); identifiers.add(key); return key }
  const questions = array(questionsValue, 2000, 'Câu hỏi').map(value => { const q = validateQuestion(value); unique(q.id); return q }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  const quizzes: Quiz[] = array(quizzesValue, 100, 'Quiz').map(value => {
    const q = record(value, ['id', 'packId', 'title', 'description', 'questionIds'], ['deckId'], 'Quiz'), quizId = unique(q.id)
    if (q.packId !== packId || 'deckId' in q && !deckIds.has(String(q.deckId))) throw new Error('Quiz tham chiếu pack/bộ thẻ không tồn tại.')
    const questionIds = array(q.questionIds, 200, 'Câu hỏi trong quiz').map(v => id(v, 'ID câu hỏi'))
    if (new Set(questionIds).size !== questionIds.length || questionIds.some(key => !questions.some(v => v.id === key))) throw new Error('Quiz có tham chiếu câu hỏi bị trùng hoặc không tồn tại.')
    return { id: quizId, packId, ...('deckId' in q ? { deckId: id(q.deckId, 'ID bộ thẻ') } : {}), title: text(q.title, 120, 'Tên quiz', true), description: text(q.description, 2000, 'Mô tả quiz'), questionIds }
  }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  return { quizzes, questions }
}
export function saveQuiz(pack: StudyPack, title: string, description: string, quizId: string = crypto.randomUUID()) {
  const old = pack.quizzes?.find(q => q.id === quizId)
  const quiz: Quiz = { ...old, id: quizId, packId: pack.id, title, description, questionIds: old?.questionIds ?? [] }
  return updatePack(pack, { schemaVersion: 2, quizzes: [...pack.quizzes?.filter(q => q.id !== quizId) ?? [], quiz], questions: pack.questions ?? [] })
}
export function saveQuestion(pack: StudyPack, quizId: string, input: Omit<QuizQuestion, 'revision'>) {
  const quiz = pack.quizzes?.find(q => q.id === quizId)
  if (!quiz) throw new Error('Quiz không còn tồn tại.')
  const old = pack.questions?.find(q => q.id === input.id)
  const question = validateQuestion({ ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)), revision: (old?.revision ?? 0) + 1 })
  return updatePack(pack, { questions: [...pack.questions?.filter(q => q.id !== question.id) ?? [], question], quizzes: pack.quizzes!.map(q => q.id === quizId ? { ...q, questionIds: q.questionIds.includes(question.id) ? q.questionIds : [...q.questionIds, question.id] } : q) })
}
export function deleteQuestion(pack: StudyPack, questionId: string) {
  return updatePack(pack, { questions: pack.questions?.filter(q => q.id !== questionId), quizzes: pack.quizzes?.map(q => ({ ...q, questionIds: q.questionIds.filter(key => key !== questionId) })) })
}
