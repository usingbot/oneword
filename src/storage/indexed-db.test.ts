import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { IndexedDbStorage } from './indexed-db'
import { createDocument, revise } from '../application/document'
import { emptyLibrary } from '../application/library'
import { exportBackup, mergeBackup, parseBackup } from '../application/backup'

const stores: IndexedDbStorage[] = []
const make = (name: string = crypto.randomUUID()) => { const store = new IndexedDbStorage(name); stores.push(store); return store }
afterEach(async () => { for (const store of stores) { store.close(); await Dexie.delete(store.db.name) }; stores.length = 0 })
describe('real adapter with fake-indexeddb', () => {
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
    future.version(2).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id' })
    await future.open(); await future.table('meta').put({ id: 'sentinel', value: 'keep' }); future.close()
    await expect(make(name).read()).rejects.toThrow()
    await future.open(); expect(await future.table('meta').get('sentinel')).toEqual({ id: 'sentinel', value: 'keep' }); future.close()
  })
})
