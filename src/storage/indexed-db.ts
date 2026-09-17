import { mergeAttempts } from '../application/quiz'
import type { QuizRecord } from './quiz-store'
import { emptyReview, pruneReview } from '../application/review'
import type { ReviewRecord } from './review-store'
import { mergeReview } from '../application/review-validation'
import Dexie, { type Table } from 'dexie'
import { type TextDocument } from '../application/document'
import { emptyLibrary, type LibraryData, type Preferences, type ReaderStorage, type ReadingPosition } from '../application/library'
import { exportBackup, validateLibrary } from '../application/backup'
import type { StudyPack } from '../application/study-pack'

export const DATABASE_NAME = 'oneword-reader'
interface Meta { id: string; schemaVersion: 5; generation: number; activeDocumentId: string | null; draft: LibraryData['draft'] }
async function readSnapshot(tables: Pick<Dexie, 'table'>) {
  const meta = await tables.table<Meta>('meta').get('library'), documents = await tables.table<TextDocument>('documents').toArray(), prefs = await tables.table<Preferences & { id: string }>('settings').get('reader')
  const packs = await tables.table<StudyPack>('packs').toArray(), positions = await tables.table<ReadingPosition>('positions').toArray()
  let review = await tables.table<ReviewRecord>('review').get('review'), quiz = await tables.table<QuizRecord>('quiz').get('quiz')
  if (meta && (meta.schemaVersion !== 5 || !Number.isSafeInteger(meta.generation) || meta.generation < 0)) throw new Error('Unsupported or corrupt database metadata')
  if (!meta && (documents.length || prefs || packs.length || positions.length || review?.data.events.length || review?.data.schedules.length || review?.data.undos.length || quiz?.attempts.length)) throw new Error('Incomplete database; records retained')
  if (meta && (!review || !quiz)) throw new Error('Missing personal state; records retained')
  if (!review) { review = { id: 'review', generation: 0, data: emptyReview() }; await tables.table('review').put(review) }
  if (!quiz) { quiz = { id: 'quiz', generation: 0, attempts: [], activeAttemptId: null }; await tables.table('quiz').put(quiz) }
  if (![review.generation, quiz.generation].every(g => Number.isSafeInteger(g) && g >= 0)) throw new Error('Invalid personal generation')
  const data = validateLibrary({ quizActiveAttemptId: quiz.activeAttemptId, quizAttempts: quiz.attempts, review: review.data, packs, documents, positions, preferences: prefs ? { reader: prefs.reader, glow: prefs.glow, progress: prefs.progress, fontSize: prefs.fontSize } : emptyLibrary().preferences, activeDocumentId: meta?.activeDocumentId ?? null, draft: meta?.draft ?? null })
  return { data, generation: meta?.generation ?? 0 }
}
export class IndexedDbStorage implements ReaderStorage {
  readonly db: Dexie
  private documents: Table<TextDocument, string>
  private positions: Table<ReadingPosition, string>
  private settings: Table<Preferences & { id: string }, string>
  private meta: Table<Meta, string>
  private savedDocuments = new Map<string, TextDocument>()
  private packs: Table<StudyPack, string>
  private savedPacks = new Map<string, StudyPack>()
  constructor(name = DATABASE_NAME) {
    this.db = new Dexie(name)
    // Add future versions with .upgrade() transactions; never delete to migrate.
    this.db.version(1).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id' })
    this.db.version(2).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id' }).upgrade(async tx => {
      const meta = await tx.table('meta').get('library')
      if (meta) {
        if (meta.schemaVersion !== 1) throw new Error('Unsupported database schema')
        await tx.table('meta').put({ ...meta, schemaVersion: 2 })
      }
    })
    this.db.version(3).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id', packs: 'id' }).upgrade(async tx => {
      const meta = await tx.table('meta').get('library')
      if (meta) {
        if (meta.schemaVersion !== 2) throw new Error('Unsupported database schema')
        await tx.table('meta').put({ ...meta, schemaVersion: 3 })
      }
    })
    this.db.version(4).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id', packs: 'id', review: 'id' }).upgrade(async tx => {
      const meta = await tx.table('meta').get('library')
      if (meta) {
        if (meta.schemaVersion !== 3) throw new Error('Unsupported database schema')
        await tx.table('meta').put({ ...meta, schemaVersion: 4 })
      }
      await tx.table('review').put({ id: 'review', generation: 0, data: emptyReview() })
    })
    this.db.version(5).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id', packs: 'id', review: 'id', quiz: 'id' }).upgrade(async tx => {
      const meta = await tx.table('meta').get('library')
      if (meta) { if (meta.schemaVersion !== 4) throw new Error('Unsupported database schema'); await tx.table('meta').put({ ...meta, schemaVersion: 5 }) }
      await tx.table('quiz').put({ id: 'quiz', generation: 0, attempts: [], activeAttemptId: null })
      // Validate the entire migrated graph before committing the version change.
      await readSnapshot(tx)
    })
    // Dexie v5 is native IndexedDB v50; reject future schemas before writes.
    this.documents = this.db.table('documents'); this.positions = this.db.table('positions'); this.settings = this.db.table('settings'); this.meta = this.db.table('meta')
    this.packs = this.db.table('packs')
    this.db.on('blocked', () => this.db.close())
  }
  async read() {
    const started = performance.now()
    const result = await this.db.transaction('rw', this.db.tables, async () => {
      if (this.db.backendDB().version !== 50) throw new Error('Unsupported database version; no writes allowed')
      return readSnapshot(this.db)
    })
    performance.clearMeasures('oneword-idb-read'); performance.measure('oneword-idb-read', { start: started, end: performance.now() })
    this.savedDocuments = new Map(result.data.documents.map(d => [d.id, d]))
    this.savedPacks = new Map(result.data.packs.map(p => [p.id, p]))
    return result
  }
  async save(data: LibraryData, expectedGeneration: number, expectedReviewGeneration?: number, expectedQuizGeneration?: number) {
    // Validation happens before the transaction. No parsing or external I/O inside it.
    exportBackup(data)
    const changed = data.documents.filter(d => this.savedDocuments.get(d.id) !== d)
    const generation = await this.db.transaction('rw', this.db.tables, async () => {
      if (this.db.backendDB().version !== 50) throw new Error('Unsupported database version; no writes allowed')
      const meta = await this.meta.get('library')
      if ((meta?.generation ?? 0) !== expectedGeneration) throw new Error('Concurrent change; reload after exporting memory backup')
      if (meta && meta.schemaVersion !== 5) throw new Error('Unsupported database schema')
      for (const doc of changed) {
        const old = await this.documents.get(doc.id)
        if (old) {
          if (JSON.stringify(old) === JSON.stringify(doc)) continue
          if (old.original !== doc.original || old.source !== doc.source || old.name !== doc.name || old.createdAt !== doc.createdAt || JSON.stringify(old.pdf) !== JSON.stringify(doc.pdf) || doc.version <= old.version) throw new Error('Immutable document or stale version')
          for (const revision of doc.revisions) {
            const previous = old.revisions.find(r => r.id === revision.id)
            if (previous && JSON.stringify(previous) !== JSON.stringify(revision)) throw new Error('Immutable revision')
          }
        }
        await this.documents.put(doc)
      }
      const reviewTable = this.db.table<ReviewRecord>('review'), review = await reviewTable.get('review')
      if (expectedReviewGeneration !== undefined && expectedReviewGeneration !== (review?.generation ?? 0)) throw new Error('Concurrent review change; restore aborted')
      const nextReview = expectedReviewGeneration !== undefined ? mergeReview(review?.data ?? emptyReview(), data.review, data.packs) : pruneReview(review?.data ?? emptyReview(), data.packs)
      const quizTable = this.db.table<QuizRecord>('quiz'), quiz = await quizTable.get('quiz')
      if (expectedQuizGeneration !== undefined && expectedQuizGeneration !== (quiz?.generation ?? 0)) throw new Error('Concurrent quiz change; restore aborted')
      const quizAttempts = expectedQuizGeneration !== undefined ? mergeAttempts(quiz?.attempts ?? [], data.quizAttempts) : quiz?.attempts ?? []
      const activeAttemptId = expectedQuizGeneration !== undefined ? quiz?.activeAttemptId ?? data.quizActiveAttemptId : quiz?.activeAttemptId ?? null
      exportBackup({ ...data, review: nextReview, quizAttempts, quizActiveAttemptId: activeAttemptId })
      if (!quiz || JSON.stringify(quizAttempts) !== JSON.stringify(quiz.attempts) || activeAttemptId !== quiz.activeAttemptId) await quizTable.put({ id: 'quiz', generation: (quiz?.generation ?? 0) + 1, attempts: quizAttempts, activeAttemptId })
      if (!review || JSON.stringify(nextReview) !== JSON.stringify(review.data)) await reviewTable.put({ id: 'review', generation: (review?.generation ?? 0) + 1, data: nextReview })
      // Reader checkpoints preserve the authoritative live review state.
      const packIds = new Set(data.packs.map(p => p.id))
      await this.packs.bulkDelete([...this.savedPacks.keys()].filter(id => !packIds.has(id)))
      await this.packs.bulkPut(data.packs.filter(p => this.savedPacks.get(p.id) !== p))
      await this.positions.bulkPut([...data.positions])
      await this.settings.put({ id: 'reader', ...data.preferences })
      const next = expectedGeneration + 1
      await this.meta.put({ id: 'library', schemaVersion: 5, generation: next, activeDocumentId: data.activeDocumentId, draft: data.draft })
      return next
    })
    this.savedDocuments = new Map(data.documents.map(d => [d.id, d]))
    this.savedPacks = new Map(data.packs.map(p => [p.id, p]))
    return generation
  }
  close() { this.db.close() }
}
