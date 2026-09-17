import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { IndexedDbStorage } from './indexed-db'
import { IndexedDbReview } from './review-store'
import { addDeck, createPack, deleteCard, exportStudyPack, saveCard } from '../application/study-pack'
import { emptyLibrary } from '../application/library'
import { emptyReview, newCardsUsed, reviewQueue, type ReviewCommand, type ReviewSnapshot } from '../application/review'
import { exportBackup, mergeBackup, parseBackup } from '../application/backup'

const stores: IndexedDbStorage[] = []
afterEach(async () => { for (const store of stores) { store.close(); await Dexie.delete(store.db.name) }; stores.length = 0 })
const make = (name: string = crypto.randomUUID()) => { const s = new IndexedDbStorage(name); stores.push(s); return s }
async function fixture() {
  const store = make(); await store.read()
  let pack = addDeck(createPack('Review test'), 'Deck')
  for (let i = 0; i < 3; i++) pack = saveCard(pack, { deckId: pack.decks[0].id, front: { text: `q${i}` }, back: { text: `a${i}` } })
  const data = { ...emptyLibrary(), review: emptyReview('UTC'), packs: [pack] }
  await store.save(data, 0, 0)
  let now = new Date('2026-09-17T12:00:00.000Z')
  const review = new IndexedDbReview(store.db, () => now)
  return { store, pack, review, setTime: (at: string) => { now = new Date(at) } }
}
function command(snapshot: ReviewSnapshot, cardId = snapshot.packs[0].cards[0].id): Extract<ReviewCommand, { type: 'rate' }> {
  const card = snapshot.packs.flatMap(p => p.cards).find(c => c.id === cardId)!
  return { type: 'rate', id: crypto.randomUUID(), cardId, contentRevision: card.revision, expectedRevision: snapshot.data.schedules.find(s => s.cardId === cardId)?.revision ?? 0, rating: 'good', settings: snapshot.data.settings }
}
describe('authoritative local review transactions', () => {
  it('M3b v4 backup migration preserves nonempty FSRS schedules, events and settings exactly', async () => {
    const { store, review } = await fixture()
    await review.execute(command(await review.read()))
    const data = (await store.read()).data, legacy = JSON.parse(exportBackup(data))
    legacy.schemaVersion = 4; delete legacy.data.quizAttempts; delete legacy.data.quizActiveAttemptId
    const migrated = parseBackup(JSON.stringify(legacy))
    expect(migrated.schemaVersion).toBe(5); expect(migrated.data).toEqual(data); expect(migrated.data.review.events).toHaveLength(1)
  })
  it('duplicate operation ID and parallel double-submit create exactly one immutable event', async () => {
    const { review } = await fixture(), request = command(await review.read())
    const [a, b] = await Promise.all([review.execute(request), review.execute(request)])
    expect(a).toEqual(b); expect(a.data.events).toHaveLength(1); expect(a.data.schedules[0].revision).toBe(1)
    await expect(review.execute({ ...request, rating: 'again' })).rejects.toThrow('Mã thao tác')
  })
  it('different operation IDs and two connections cannot rate a stale schedule', async () => {
    const { store, review } = await fixture(), other = make(store.db.name), tab = new IndexedDbReview(other.db, () => new Date('2026-09-17T12:00:00Z'))
    const requestA = command(await review.read()), requestB = command(await tab.read())
    const results = await Promise.allSettled([review.execute(requestA), tab.execute(requestB)])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect((await review.read()).data.events).toHaveLength(1)
  })
  it('failed transaction writes neither schedule, event nor counter', async () => {
    const { store, review } = await fixture(), before = await review.read(), fail = () => { throw new DOMException('Synthetic quota failure', 'QuotaExceededError') }
    store.db.table('review').hook('updating', fail)
    await expect(review.execute(command(before))).rejects.toThrow()
    store.db.table('review').hook('updating').unsubscribe(fail)
    expect(await review.read()).toEqual(before)
  })
  it('undo new and subsequent review restores exact FSRS snapshot and daily allowance with monotonic guards', async () => {
    const { review, setTime } = await fixture(), initial = await review.read(), request = command(initial)
    const first = await review.execute(request), event = first.data.events[0]
    expect(newCardsUsed(first.data, new Date(event.reviewedAt))).toBe(1)
    const undone = await review.execute({ type: 'undo', id: crypto.randomUUID(), eventId: event.id })
    expect(undone.data.events[0]).toEqual(event); expect(undone.data.schedules[0]).toMatchObject({ state: null, revision: 2 }); expect(newCardsUsed(undone.data, new Date(event.reviewedAt))).toBe(0)
    await expect(review.execute({ ...request, id: crypto.randomUUID() })).rejects.toThrow('đã đổi')
    const again = await review.execute(command(undone)), before = again.data.schedules[0]
    setTime(before.state!.due)
    const subsequent = await review.execute(command(again)), last = subsequent.data.events.at(-1)!
    const restored = await review.execute({ type: 'undo', id: crypto.randomUUID(), eventId: last.id })
    expect(restored.data.schedules[0].state).toEqual(before.state); expect(restored.data.schedules[0].revision).toBe(last.after.revision + 1)
  })
  it('rejects unsafe undo after newer review and after content editing', async () => {
    const { review, store } = await fixture(), first = await review.execute(command(await review.read()))
    await review.execute(command(first, first.packs[0].cards[1].id))
    await expect(review.execute({ type: 'undo', id: crypto.randomUUID(), eventId: first.data.events[0].id })).rejects.toThrow('an toàn')
    const read = await store.read(), latest = (await review.read()).data.events.at(-1)!, pack = read.data.packs[0], card = pack.cards.find(c => c.id === latest.cardId)!
    const edited = saveCard(pack, { ...card, front: { text: 'changed' } }, card.id)
    await store.save({ ...read.data, packs: [edited] }, read.generation)
    await expect(review.execute({ type: 'undo', id: crypto.randomUUID(), eventId: latest.id })).rejects.toThrow('an toàn')
  })
  it('enforces daily limit in the transaction across decks, rollover and due exemption', async () => {
    const { review, setTime } = await fixture(), start = await review.read()
    const settings = await review.execute({ type: 'settings', expectedGeneration: start.generation, newPerDay: 1 })
    const first = await review.execute(command(settings)), next = command(first, first.packs[0].cards[1].id)
    await expect(review.execute(next)).rejects.toThrow('giới hạn')
    setTime(first.data.schedules[0].state!.due)
    const due = await review.execute(command(first)); expect(due.data.events).toHaveLength(2)
    setTime('2026-09-18T00:00:00.000Z')
    expect((await review.execute(next)).data.events).toHaveLength(3)
  })
  it('reader checkpoints and card moves/edits preserve schedules; deletion prunes live schedule but retains audit and consumed limit', async () => {
    const { store, review } = await fixture(), rated = await review.execute(command(await review.read())), before = rated.data
    const read = await store.read(), pack = addDeck(read.data.packs[0], 'Moved'), card = pack.cards.find(c => c.id === before.events[0].cardId)!
    const moved = saveCard(pack, { ...card, deckId: pack.decks.find(d => d.id !== card.deckId)!.id, front: { text: 'edited' } }, card.id)
    await store.save({ ...read.data, review: emptyReview('UTC'), packs: [moved] }, read.generation)
    expect((await review.read()).data).toEqual(before)
    const next = await store.read()
    await store.save({ ...next.data, review: emptyReview('UTC'), packs: [deleteCard(moved, card.id)] }, next.generation)
    const deleted = await review.read()
    expect(deleted.data.schedules).toEqual([]); expect(deleted.data.events).toEqual(before.events); expect(newCardsUsed(deleted.data, new Date(before.events[0].reviewedAt))).toBe(1)
    expect(exportStudyPack(moved)).not.toMatch(/"(due|stability|events|desiredRetention)"/u)
  })
  it('backup4 exact restore, conflicts and transaction failure keep both content and scheduler intact', async () => {
    const { store, review } = await fixture(); const rated = await review.execute(command(await review.read()))
    const backup = parseBackup(exportBackup((await store.read()).data)), target = make(); const base = await target.read()
    const merged = mergeBackup(base.data, backup.data)
    const fail = () => { throw new Error('final write failure') }; target.db.table('meta').hook('creating', fail)
    await expect(target.save(merged.data, base.generation, 0)).rejects.toThrow()
    target.db.table('meta').hook('creating').unsubscribe(fail)
    expect((await target.read()).data).toEqual(base.data)
    await target.save(merged.data, base.generation, 0)
    expect((await target.read()).data).toEqual(backup.data)
    const changed = await review.execute(command(rated, rated.packs[0].cards[1].id))
    expect(() => mergeBackup({ ...backup.data, review: changed.data }, backup.data)).toThrow('Lịch ôn')
    await expect(target.save(merged.data, 1, 0)).rejects.toThrow('Concurrent review')
  })
  it('M3a migration preserves content and rolls back an invalid meta upgrade', async () => {
    const { pack } = await fixture(), name = crypto.randomUUID(), old = new Dexie(name)
    old.version(3).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id', packs: 'id' })
    await old.table('packs').put(pack); await old.table('meta').put({ id: 'library', schemaVersion: 3, generation: 7, activeDocumentId: null, draft: null }); old.close()
    const migrated = make(name), data = await migrated.read()
    expect(migrated.db.backendDB().version).toBe(50); expect(data.data.packs).toEqual([pack]); expect(data.generation).toBe(7); expect(data.data.review.events).toEqual([])
    const badName = crypto.randomUUID(), bad = new Dexie(badName); bad.version(3).stores({ documents: 'id', positions: 'documentId', settings: 'id', meta: 'id', packs: 'id' })
    await bad.table('meta').put({ id: 'library', schemaVersion: 99 }); bad.close()
    await expect(make(badName).read()).rejects.toThrow(); await bad.open(); expect(bad.backendDB().version).toBe(30); expect(await bad.table('meta').get('library')).toEqual({ id: 'library', schemaVersion: 99 }); bad.close()
  })
  it('queue after reload retains due state and stable timezone; rejects malformed personal state', async () => {
    const { store, review, setTime } = await fixture(), rated = await review.execute(command(await review.read()))
    const fresh = make(store.db.name), data = (await fresh.read()).data
    expect(data.review).toEqual(rated.data)
    expect(reviewQueue(data.packs[0].cards, data.review, new Date(rated.data.schedules[0].state!.due)).due).toHaveLength(1)
    setTime('2026-09-16T00:00:00.000Z'); await expect(review.execute(command(rated, rated.packs[0].cards[1].id))).rejects.toThrow('Đồng hồ')
    const invalid = JSON.parse(exportBackup(data)); invalid.data.review.schedules[0].state.due = 'invalid'
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow()
  })
})
