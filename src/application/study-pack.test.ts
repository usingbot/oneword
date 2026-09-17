import { describe, expect, it } from 'vitest'
import { addDeck, createPack, deleteCard, exportStudyPack, imageUrl, MAX_PACK_BYTES, mergeStudyPacks, parseStudyPack, saveCard, validateStudyLibrary, validateStudyPack } from './study-pack'
import { emptyLibrary } from './library'
import { exportBackup, mergeBackup, parseBackup } from './backup'
import { createDocument } from './document'

export function studyFixture() {
  const pack = addDeck(createPack('Synthetic pack', 'Only content'), 'First deck')
  return saveCard(pack, { deckId: pack.decks[0].id, front: { text: 'Question', image: { url: 'https://images.example.test/q.png', alt: 'Question image', caption: 'Supplied reference', essential: true } }, back: { text: 'Answer' }, tags: ['test'], source: 'Supplied material' })
}
describe('Study Pack content contract', () => {
  it('manually creates pack/deck/card, edits and moves with stable IDs/revision, then deletes', () => {
    const first = studyFixture(), second = addDeck(first, 'Second deck')
    const card = second.cards[0], moved = saveCard(second, { ...card, deckId: second.decks.find(d => d.id !== card.deckId)!.id, front: { text: 'Edited' } }, card.id)
    expect(moved.id).toBe(first.id); expect(moved.cards[0].id).toBe(card.id); expect(moved.cards[0].revision).toBe(2)
    expect(moved.cards[0].front.image).toBeUndefined()
    expect(deleteCard(moved, card.id).cards).toEqual([])
    expect(first.cards[0].front.text).toBe('Question')
    expect(Object.isFrozen(first.cards[0].front.image)).toBe(true)
  })
  it('exports/imports only canonical content with identical identity and relationships', () => {
    const pack = studyFixture(), exported = exportStudyPack(pack)
    expect(parseStudyPack(exported)).toEqual(pack)
    expect(Object.keys(JSON.parse(exported))).toEqual(['type', 'schemaVersion', 'id', 'title', 'description', 'createdAt', 'updatedAt', 'decks', 'cards'])
    expect(exported).not.toMatch(/"(due|history|preferences|positions|generation|session|stability|difficulty)"/u)
  })
  it('skips identical IDs, blocks changed content and accepts a new pack', () => {
    const pack = studyFixture()
    expect(mergeStudyPacks([pack], [parseStudyPack(exportStudyPack(pack))])).toMatchObject({ added: 0, duplicates: 1, conflicts: [] })
    const changed = validateStudyPack({ ...pack, title: 'changed' })
    expect(mergeStudyPacks([pack], [changed]).conflicts[0]).toContain('khác nội dung')
    expect(mergeStudyPacks([pack], [studyFixture()])).toMatchObject({ added: 1, duplicates: 0, conflicts: [] })
  })
  it('rejects deck/card ID collisions across new packs, without changing current content', () => {
    const first = studyFixture(), second = studyFixture()
    const collision = validateStudyPack({ ...second, cards: [{ ...second.cards[0], id: first.cards[0].id }] })
    const result = mergeStudyPacks([first], [collision])
    expect(result.conflicts[0]).toContain('pack khác'); expect(result.packs).toEqual([first])
  })
  it('canonicalizes property/array/tag order for identical-content comparisons', () => {
    const pack = addDeck(studyFixture(), 'Other')
    const reordered = validateStudyPack({ ...pack, decks: [...pack.decks].reverse(), cards: pack.cards.map(c => Object.fromEntries(Object.entries(c).reverse())) })
    expect(mergeStudyPacks([pack], [reordered]).duplicates).toBe(1)
  })
  it.each([
    ['malformed', '{'], ['depth', '['.repeat(11) + '0' + ']'.repeat(11)], ['oversized', ' '.repeat(MAX_PACK_BYTES + 1)],
  ])('rejects %s JSON', (_, input) => { expect(() => parseStudyPack(input)).toThrow() })
  it.each(['type', 'future', 'duplicate-card', 'duplicate-deck', 'reference', 'pack-reference', 'missing', 'long-title', 'long-text', 'too-many-cards', 'too-many-decks', 'id', 'timestamp', 'revision', 'empty-face', 'unknown', 'scheduling', 'external-ref', 'data-image'])('rejects %s input at runtime', kind => {
    const value = JSON.parse(exportStudyPack(studyFixture()))
    if (kind === 'type') value.type = 'oneword-personal-backup'
    if (kind === 'future') value.schemaVersion = 2
    if (kind === 'duplicate-card') value.cards.push(value.cards[0])
    if (kind === 'duplicate-deck') value.decks.push(value.decks[0])
    if (kind === 'reference') value.cards[0].deckId = 'missing-deck'
    if (kind === 'pack-reference') value.decks[0].packId = 'other-pack'
    if (kind === 'missing') delete value.cards[0].back
    if (kind === 'long-title') value.title = 'x'.repeat(121)
    if (kind === 'long-text') value.cards[0].back.text = 'x'.repeat(10001)
    if (kind === 'too-many-cards') value.cards = Array(5001).fill(value.cards[0])
    if (kind === 'too-many-decks') value.decks = Array(101).fill(value.decks[0])
    if (kind === 'id') value.id = '<script>'
    if (kind === 'timestamp') value.updatedAt = '2026-02-31T00:00:00.000Z'
    if (kind === 'revision') value.cards[0].revision = 0
    if (kind === 'empty-face') value.cards[0].back.text = ' '
    if (kind === 'unknown') value.secret = 'unrecognized'
    if (kind === 'scheduling') value.cards[0].due = 'tomorrow'
    if (kind === 'external-ref') value.$ref = 'https://invalid.example/schema.json'
    if (kind === 'data-image') value.cards[0].front.image.url = 'data:image/png;base64,aGVsbG8='
    expect(() => parseStudyPack(JSON.stringify(value))).toThrow()
  })
  it('explains the card and missing deck in a reference error', () => {
    const pack = studyFixture(), card = pack.cards[0]
    expect(() => validateStudyPack({ ...pack, cards: [{ ...card, deckId: 'missing' }] })).toThrow(`Thẻ ${card.id} tham chiếu bộ thẻ missing`)
  })
  it('rejects URLs and pack data that exceed limits after canonical export', () => {
    expect(() => imageUrl('https://example.test/' + 'é'.repeat(400))).toThrow('sau chuẩn hóa')
    const pack = studyFixture(), card = pack.cards[0]
    const cards = Array.from({ length: 415 }, (_, i) => ({ ...card, id: `card-${i}`, front: { text: 'a'.repeat(10000) }, back: { text: 'b'.repeat(10000) } }))
    const compact = JSON.stringify({ ...pack, cards })
    expect(new TextEncoder().encode(compact).byteLength).toBeLessThan(MAX_PACK_BYTES)
    expect(new TextEncoder().encode(JSON.stringify({ ...pack, cards }, null, 2)).byteLength).toBeGreaterThan(MAX_PACK_BYTES)
    expect(() => parseStudyPack(compact)).toThrow('8 MiB')
  })
  it.each(['http://example.test/a.png', 'data:image/png;base64,AA', 'javascript:alert(1)', 'file:///a.png', 'https://user:pass@example.test/a', 'https://example.test/ bad', 'https://example.test\\@evil.test/a'])('rejects unsafe image URL %s', url => { expect(() => imageUrl(url)).toThrow() })
  it('accepts HTTPS references, including essential image-only faces, without interpreting HTML text', () => {
    expect(imageUrl('https://EXAMPLE.test/image.png')).toBe('https://example.test/image.png')
    const pack = studyFixture(), card = pack.cards[0]
    const parsed = validateStudyPack({ ...pack, cards: [{ ...card, front: { ...card.front, text: '' }, back: { text: '<script>alert(1)</script>' } }] })
    expect(parsed.cards[0].front.image?.essential).toBe(true)
    expect(parsed.cards[0].back.text).toBe('<script>alert(1)</script>')
  })
  it('bounds library packs and preserves backup separation with all-or-nothing conflicts', () => {
    expect(() => validateStudyLibrary(Array(101).fill(studyFixture()))).toThrow('100')
    const pack = studyFixture(), doc = createDocument('reader original', 'reader')
    const data = { ...emptyLibrary(), documents: [doc], packs: [pack], activeDocumentId: doc.id }
    const parsed = parseBackup(exportBackup(data))
    expect(parsed.schemaVersion).toBe(4); expect(parsed.data).toEqual(data)
    expect(mergeBackup(emptyLibrary(), parsed.data).data).toEqual(data)
    const conflict = { ...data, packs: [validateStudyPack({ ...pack, title: 'changed' })] }
    expect(() => mergeBackup(data, conflict)).toThrow('khác nội dung')
  })
  it.each([1, 2])('migrates Personal Backup v%s by adding empty content, leaving reader state intact', version => {
    const doc = createDocument('reader', 'old.txt', 'txt'), data = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id }
    const old = JSON.parse(exportBackup(data)); old.schemaVersion = version; delete old.data.packs; delete old.data.review
    expect(parseBackup(JSON.stringify(old))).toMatchObject({ schemaVersion: 4, data })
  })
})
