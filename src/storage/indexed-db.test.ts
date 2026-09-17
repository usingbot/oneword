import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { IndexedDbStorage } from './indexed-db'
import { createDocument, createPdfDocument, revise } from '../application/document'
import { completeExtraction } from '../application/pdf-text'
import { emptyLibrary } from '../application/library'
import { exportBackup, mergeBackup, parseBackup } from '../application/backup'
import { addDeck, createPack, deleteCard, saveCard } from '../application/study-pack'

const stores: IndexedDbStorage[] = []
const make = (name: string = crypto.randomUUID()) => { const store = new IndexedDbStorage(name); stores.push(store); return store }
afterEach(async () => { for (const store of stores) { store.close(); await Dexie.delete(store.db.name) }; stores.length = 0 })
describe('real adapter with fake-indexeddb', () => {
  it('migrates M2 v2 preserving PDF originals, revisions, bookmarks, settings and generation', async () => {
    const name = crypto.randomUUID(), old = new Dexie(name)
    old.version(2).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id' })
    const doc = createPdfDocument(completeExtraction([{ raw: 'PDF source', warnings: [] }], 'pdfjs-dist@6.3.289'), 'm2.pdf', 'one two three')
    const data = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id, draft: { documentId: doc.id, text: 'M2 draft' }, positions: [{ documentId: doc.id, revisionId: doc.revisions[1].id, offset: 4, settings: emptyLibrary().preferences.reader, updatedAt: new Date().toISOString() }] }
    data.preferences.fontSize = 60
    await old.open(); await old.table('documents').put(doc); await old.table('positions').bulkPut(data.positions)
    await old.table('settings').put({ id: 'reader', ...data.preferences })
    await old.table('meta').put({ id: 'library', schemaVersion: 2, generation: 9, activeDocumentId: doc.id, draft: data.draft }); old.close()
    const store = make(name)
    expect(await store.read()).toEqual({ data, generation: 9 })
    expect(store.db.backendDB().version).toBe(50)
    const pack = createPack('New study content')
    await store.save({ ...data, packs: [pack] }, 9)
    expect((await store.read()).data.documents).toEqual(data.documents)
    expect((await store.read()).data.packs).toEqual([pack])
  })
  it('saves/edits/deletes study content atomically; a stale tab cannot resurrect removed content', async () => {
    const store = make(), stale = make(store.db.name)
    const base = addDeck(createPack('Content'), 'Deck'), pack = saveCard(base, { deckId: base.decks[0].id, front: { text: 'q' }, back: { text: 'a' } })
    const data = { ...emptyLibrary(), packs: [pack] }
    await store.read(); await store.save(data, 0); await stale.read()
    const changed = { ...data, packs: [deleteCard(pack, pack.cards[0].id)] }
    await store.save(changed, 1)
    await expect(stale.save(data, 1)).rejects.toThrow('Concurrent')
    expect((await store.read()).data.packs[0].cards).toEqual([])
    await store.save({ ...changed, packs: [] }, 2)
    expect((await store.read()).data.packs).toEqual([])
  })
  it('rolls back pack import/deletion with reader data when the final write fails', async () => {
    const store = make(), data = { ...emptyLibrary(), packs: [createPack('Keep')], documents: [createDocument('keep text', 'reader')] }
    await store.read(); await store.save(data, 0)
    const fail = () => { throw new DOMException('Synthetic quota failure', 'QuotaExceededError') }
    store.db.table('meta').hook('updating', fail)
    await expect(store.save({ ...data, packs: [createPack('Incoming')] }, 1)).rejects.toThrow()
    store.db.table('meta').hook('updating').unsubscribe(fail)
    expect(await store.read()).toEqual({ data, generation: 1 })
  })
  it('persists PDF source through reopen and backup restore, rejecting changed immutable metadata', async () => {
    const store = make(), target = make()
    const doc = createPdfDocument(completeExtraction([{ raw: 'raw PDF text', warnings: [] }], 'pdfjs-dist@6.3.289'), 'test.pdf', 'working text')
    const data = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id }
    await store.read(); await store.save(data, 0); store.close()
    const reopened = make(store.db.name)
    expect((await reopened.read()).data).toEqual(data)
    const parsed = parseBackup(exportBackup(data))
    await target.read(); await target.save(parsed.data, 0)
    expect((await target.read()).data).toEqual(data)
    const changed = { ...revise(doc, 'new'), pdf: { ...doc.pdf!, extractor: 'changed' } }
    await expect(reopened.save({ ...data, documents: [changed] }, 1)).rejects.toThrow('Immutable')
    expect((await reopened.read()).data).toEqual(data)
  })
  it('migrates M1b v1 atomically without changing documents, draft, generation or positions', async () => {
    const name = crypto.randomUUID(), old = new Dexie(name)
    old.version(1).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id' })
    const doc = revise(createDocument('original', 'm1b'), 'edited')
    const data = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id, draft: { documentId: doc.id, text: 'unsaved draft' }, positions: [{ documentId: doc.id, revisionId: doc.revisions[1].id, offset: 0, settings: emptyLibrary().preferences.reader, updatedAt: new Date().toISOString() }] }
    await old.open()
    await old.table('documents').put(doc)
    await old.table('positions').bulkPut(data.positions)
    await old.table('settings').put({ id: 'reader', ...data.preferences })
    await old.table('meta').put({ id: 'library', schemaVersion: 1, generation: 7, activeDocumentId: doc.id, draft: data.draft })
    old.close()
    const store = make(name)
    expect(await store.read()).toEqual({ data, generation: 7 })
    expect(store.db.backendDB().version).toBe(50)
    expect((await store.db.table('meta').get('library')).schemaVersion).toBe(5)
    expect(await store.save(data, 7)).toBe(8)
  })
  it('rolls back a rejected migration instead of changing the old meta record', async () => {
    const name = crypto.randomUUID(), old = new Dexie(name)
    old.version(1).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id' })
    await old.open(); await old.table('meta').put({ id: 'library', schemaVersion: 99, generation: 3 }); old.close()
    await expect(make(name).read()).rejects.toThrow()
    await old.open()
    expect(old.backendDB().version).toBe(10)
    expect((await old.table('meta').get('library')).schemaVersion).toBe(99)
    old.close()
  })
  it('creates schema and persists document, position, preferences across adapter reopen', async () => {
    const store = make(), doc = revise(createDocument('gốc', 'one'), 'a b c')
    const data = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id, positions: [{ documentId: doc.id, revisionId: doc.revisions[1].id, offset: 2, settings: { mode: 'words' as const, words: 1, wpm: 450, punctuation: false }, updatedAt: new Date().toISOString() }] }
    data.preferences.reader.wpm = 450; data.preferences.fontSize = 60
    expect((await store.read()).generation).toBe(0)
    expect(await store.save(data, 0)).toBe(1)
    store.close()
    expect((await make(store.db.name).read()).data).toEqual(data)
  })
  it('rejects stale writers from another adapter without losing the winning data', async () => {
    const first = make(), second = make(first.db.name)
    await first.read(); await second.read()
    const data = { ...emptyLibrary(), documents: [createDocument('first', 'first')] }
    await first.save(data, 0)
    await expect(second.save({ ...emptyLibrary(), documents: [createDocument('second', 'second')] }, 0)).rejects.toThrow('Concurrent')
    expect((await first.read()).data).toEqual(data)
  })
  it('protects immutable original and existing revision text at the storage boundary', async () => {
    const store = make(), doc = createDocument('original', 'one')
    const data = { ...emptyLibrary(), documents: [doc] }
    await store.read(); await store.save(data, 0)
    const corrupt = { ...doc, version: 2, original: 'changed', revisions: [{ ...doc.revisions[0], text: 'changed' }] }
    await expect(store.save({ ...data, documents: [corrupt] }, 1)).rejects.toThrow('Immutable')
    expect((await store.read()).data.documents[0].original).toBe('original')
  })
  it('round trips a backup through a separate empty database', async () => {
    const store = make(), target = make(), doc = createDocument('text', 'one')
    const data = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id }
    await store.read(); await store.save(data, 0)
    const backup = parseBackup(exportBackup((await store.read()).data))
    const merged = mergeBackup((await target.read()).data, backup.data)
    await target.save(merged.data, 0)
    expect((await target.read()).data).toEqual(data)
  })
  it('rolls back documents and preferences if the last meta write fails', async () => {
    const store = make(), data = { ...emptyLibrary(), documents: [createDocument('keep', 'old')] }
    await store.read(); await store.save(data, 0)
    const incoming = { ...emptyLibrary(), documents: [createDocument('restore', 'new')] }
    const merged = mergeBackup(data, incoming)
    const fail = () => { throw new DOMException('Synthetic quota failure at final write', 'QuotaExceededError') }
    store.db.table('meta').hook('updating', fail)
    await expect(store.save(merged.data, 1)).rejects.toThrow()
    store.db.table('meta').hook('updating').unsubscribe(fail)
    expect(await store.read()).toEqual({ data, generation: 1 })
  })
  it('does not rewrite document text on a position-only checkpoint', async () => {
    const store = make(), doc = createDocument('a b c', 'one'), data = { ...emptyLibrary(), documents: [doc] }
    await store.read(); await store.save(data, 0)
    let writes = 0
    store.db.table('documents').hook('updating', () => { writes++ })
    await store.save({ ...data, positions: [{ documentId: doc.id, revisionId: doc.revisions[0].id, offset: 2, settings: data.preferences.reader, updatedAt: new Date().toISOString() }] }, 1)
    expect(writes).toBe(0)
  })
  it('rejects a future database version without deleting its data', async () => {
    const name = crypto.randomUUID(), future = new Dexie(name)
    future.version(6).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id', packs: 'id' })
    await future.open(); await future.table('meta').put({ id: 'sentinel', value: 'keep' }); future.close()
    await expect(make(name).read()).rejects.toThrow()
    await future.open(); expect(await future.table('meta').get('sentinel')).toEqual({ id: 'sentinel', value: 'keep' }); future.close()
  })
})
