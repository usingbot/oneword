import Dexie, { type Table } from 'dexie'
import { type TextDocument } from '../application/document'
import { emptyLibrary, type LibraryData, type Preferences, type ReaderStorage, type ReadingPosition } from '../application/library'
import { exportBackup, validateLibrary } from '../application/backup'

export const DATABASE_NAME = 'oneword-reader'
interface Meta { id: string; schemaVersion: 1; generation: number; activeDocumentId: string | null; draft: LibraryData['draft'] }
export class IndexedDbStorage implements ReaderStorage {
  readonly db: Dexie
  private documents: Table<TextDocument, string>
  private positions: Table<ReadingPosition, string>
  private settings: Table<Preferences & { id: string }, string>
  private meta: Table<Meta, string>
  private savedDocuments = new Map<string, TextDocument>()
  constructor(name = DATABASE_NAME) {
    this.db = new Dexie(name)
    // Add future versions with .upgrade() transactions; never delete to migrate.
    this.db.version(1).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id' })
    // Dexie can open a newer compatible schema; M1b must still refuse writes.
    // Dexie's public version 1 maps to native IndexedDB version 10.
    this.documents = this.db.table('documents'); this.positions = this.db.table('positions'); this.settings = this.db.table('settings'); this.meta = this.db.table('meta')
    this.db.on('blocked', () => this.db.close())
  }
  async read() {
    const result = await this.db.transaction('r', this.db.tables, async () => {
      if (this.db.backendDB().version !== 10) throw new Error('Unsupported database version; no writes allowed')
      const meta = await this.meta.get('library'), documents = await this.documents.toArray(), prefs = await this.settings.get('reader')
      if (meta && meta.schemaVersion !== 1) throw new Error('Unsupported database schema')
      if (meta && (!Number.isSafeInteger(meta.generation) || meta.generation < 0)) throw new Error('Invalid generation')
      if (!meta && (documents.length || prefs)) throw new Error('Incomplete database')
      const data = validateLibrary({ documents, positions: await this.positions.toArray(), preferences: prefs ? { reader: prefs.reader, glow: prefs.glow, progress: prefs.progress, fontSize: prefs.fontSize } : emptyLibrary().preferences, activeDocumentId: meta?.activeDocumentId ?? null, draft: meta?.draft ?? null })
      return { data, generation: meta?.generation ?? 0 }
    })
    this.savedDocuments = new Map(result.data.documents.map(d => [d.id, d]))
    return result
  }
  async save(data: LibraryData, expectedGeneration: number) {
    // Validation happens before the transaction. No parsing or external I/O inside it.
    exportBackup(data)
    const changed = data.documents.filter(d => this.savedDocuments.get(d.id) !== d)
    const generation = await this.db.transaction('rw', this.db.tables, async () => {
      if (this.db.backendDB().version !== 10) throw new Error('Unsupported database version; no writes allowed')
      const meta = await this.meta.get('library')
      if ((meta?.generation ?? 0) !== expectedGeneration) throw new Error('Concurrent change; reload after exporting memory backup')
      if (meta && meta.schemaVersion !== 1) throw new Error('Unsupported database schema')
      for (const doc of changed) {
        const old = await this.documents.get(doc.id)
        if (old) {
          if (JSON.stringify(old) === JSON.stringify(doc)) continue
          if (old.original !== doc.original || old.source !== doc.source || old.name !== doc.name || old.createdAt !== doc.createdAt || doc.version <= old.version) throw new Error('Immutable document or stale version')
          for (const revision of doc.revisions) {
            const previous = old.revisions.find(r => r.id === revision.id)
            if (previous && JSON.stringify(previous) !== JSON.stringify(revision)) throw new Error('Immutable revision')
          }
        }
        await this.documents.put(doc)
      }
      // Only small position/settings records are written at reading checkpoints.
      await this.positions.bulkPut([...data.positions])
      await this.settings.put({ id: 'reader', ...data.preferences })
      const next = expectedGeneration + 1
      await this.meta.put({ id: 'library', schemaVersion: 1, generation: next, activeDocumentId: data.activeDocumentId, draft: data.draft })
      return next
    })
    this.savedDocuments = new Map(data.documents.map(d => [d.id, d]))
    return generation
  }
  close() { this.db.close() }
}
