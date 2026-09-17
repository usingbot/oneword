import type Dexie from 'dexie'
import { startAttempt, updateAttempt, validateAttempts, validateActiveAttempt, type QuizAttempt, type QuizCommand, type QuizGateway, type QuizSnapshot } from '../application/quiz'
import { validateStudyLibrary } from '../application/study-pack'
import { exportBackup } from '../application/backup'
import { emptyLibrary } from '../application/library'

export interface QuizRecord { id: 'quiz'; activeAttemptId: string | null; generation: number; attempts: readonly QuizAttempt[] }
export class IndexedDbQuiz implements QuizGateway {
  constructor(private db: Dexie, private clock = () => new Date()) {}
  private async snapshot(): Promise<QuizSnapshot> {
    if (this.db.backendDB().version !== 50) throw new Error('Unsupported database version')
    const record = await this.db.table<QuizRecord>('quiz').get('quiz'), generation = record?.generation ?? 0
    if (!Number.isSafeInteger(generation) || generation < 0) throw new Error('Invalid quiz generation')
    return { activeAttemptId: validateActiveAttempt(record?.activeAttemptId ?? null, validateAttempts(record?.attempts ?? [])), generation, attempts: validateAttempts(record?.attempts ?? []), packs: validateStudyLibrary(await this.db.table('packs').toArray()) }
  }
  async read() { return this.db.transaction('r', this.db.tables, () => this.snapshot()) }
  async execute(command: QuizCommand) {
    return this.db.transaction('rw', this.db.tables, async () => {
      const current = await this.snapshot(), old = current.attempts.find(a => a.id === command.id)
      let attempts = current.attempts
      let activeAttemptId: string | null
      if (command.type === 'open') activeAttemptId = validateActiveAttempt(command.id, current.attempts)
      else {
      let attempt: QuizAttempt
      if (command.type === 'start') {
        if (old) {
          if (old.quizId !== command.quizId || old.mode !== command.mode || old.seed !== command.seed || old.shuffleQuestions !== command.shuffleQuestions || old.shuffleChoices !== command.shuffleChoices) throw new Error('ID lượt quiz đã được dùng cho bài khác.')
          return current
        }
        attempt = startAttempt(current.packs, command, this.clock())
      } else {
        if (!old || old.revision !== command.expectedRevision) throw new Error('Bài đã đổi ở tab khác. Đã tải lại; hãy kiểm tra trước khi thao tác tiếp.')
        attempt = updateAttempt(old, command.action, this.clock())
      }
      attempts = validateAttempts([...current.attempts.filter(a => a.id !== attempt.id), attempt]); activeAttemptId = attempt.id
      }
      const meta = await this.db.table('meta').get('library'), prefs = await this.db.table('settings').get('reader'), review = await this.db.table('review').get('review')
      exportBackup({ ...emptyLibrary(), packs: current.packs, quizActiveAttemptId: activeAttemptId, quizAttempts: attempts, review: review?.data ?? emptyLibrary().review, documents: await this.db.table('documents').toArray(), positions: await this.db.table('positions').toArray(), activeDocumentId: meta?.activeDocumentId ?? null, draft: meta?.draft ?? null, preferences: prefs ? { reader: prefs.reader, glow: prefs.glow, progress: prefs.progress, fontSize: prefs.fontSize } : emptyLibrary().preferences })
      await this.db.table<QuizRecord>('quiz').put({ id: 'quiz', generation: current.generation + 1, attempts, activeAttemptId })
      return { ...current, generation: current.generation + 1, attempts, activeAttemptId }
    })
  }
}
