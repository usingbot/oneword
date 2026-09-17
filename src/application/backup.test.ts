import { describe, expect, it } from 'vitest'
import { createDocument, currentText, revise, undo } from './document'
import { emptyLibrary, resumePosition } from './library'
import { exportBackup, mergeBackup, parseBackup } from './backup'

function fixture() {
  const doc = revise(createDocument('gốc nguyên vẹn', 'thử.txt', 'txt'), 'một hai ba bốn')
  const data = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id, draft: { documentId: doc.id, text: 'nháp chưa áp dụng' }, positions: [{ documentId: doc.id, revisionId: doc.revisions[1].id, offset: 4, settings: emptyLibrary().preferences.reader, updatedAt: new Date().toISOString() }] }
  return data
}
describe('personal backup contract', () => {
  it('round trips original, revisions, draft, settings and position with stable IDs', () => {
    const data = fixture(); data.preferences.glow = false; data.preferences.reader.wpm = 420
    const parsed = parseBackup(exportBackup(data))
    expect(parsed.data).toEqual(data)
    expect(Object.isFrozen(parsed.data.documents[0])).toBe(true)
    expect(Object.isFrozen(parsed.data.documents[0].revisions[0])).toBe(true)
    expect(currentText(undo(parsed.data.documents[0]))).toBe('gốc nguyên vẹn')
  })
  it('restores into an empty library, with preferences and active draft', () => {
    const data = fixture(), result = mergeBackup(emptyLibrary(), data)
    expect(result.data).toEqual(data); expect(result.added).toBe(1)
  })
  it('treats identical IDs/content as duplicates and preserves local position/settings', () => {
    const data = fixture(), incoming = structuredClone(data)
    incoming.positions[0].offset = 0; incoming.preferences.reader.wpm = 600
    const result = mergeBackup(data, incoming)
    expect(result.duplicates).toBe(1); expect(result.data).toEqual(data)
  })
  it('rejects conflicting IDs without mutating either library', () => {
    const data = fixture(), incoming = structuredClone(data)
    incoming.documents[0] = revise(incoming.documents[0], 'khác')
    const before = JSON.stringify(data)
    expect(() => mergeBackup(data, incoming)).toThrow('cùng ID')
    expect(JSON.stringify(data)).toBe(before)
  })
  it.each([
    ['malformed', '{'],
    ['nesting', '['.repeat(20) + '0' + ']'.repeat(20)],
    ['oversized', ' '.repeat(32 * 1024 * 1024 + 1)],
  ])('rejects %s JSON', (_, json) => { expect(() => parseBackup(json)).toThrow() })
  it.each(['type', 'version', 'reference', 'duplicate', 'revision-reference', 'prototype', 'original', 'invalid-setting', 'timestamp'])('rejects %s without trusting TS types', kind => {
    const envelope = JSON.parse(exportBackup(fixture()))
    if (kind === 'type') envelope.type = 'study-pack'
    if (kind === 'version') envelope.schemaVersion = 4
    if (kind === 'reference') envelope.data.activeDocumentId = crypto.randomUUID()
    if (kind === 'duplicate') envelope.data.documents.push(envelope.data.documents[0])
    if (kind === 'revision-reference') envelope.data.positions[0].revisionId = crypto.randomUUID()
    if (kind === 'prototype') envelope.data['__proto__unexpected'] = { polluted: true }
    if (kind === 'original') envelope.data.documents[0].original = 'thay gốc'
    if (kind === 'invalid-setting') envelope.data.preferences.reader.wpm = -1
    if (kind === 'timestamp') envelope.exportedAt = '2026-02-31T00:00:00.000Z'
    expect(() => parseBackup(JSON.stringify(envelope))).toThrow()
  })
  it('rejects cross-document revision ID collisions on merge', () => {
    const local = fixture(), incoming = fixture()
    const doc = incoming.documents[0]
    incoming.documents[0] = { ...doc, revisions: [{ ...doc.revisions[0], id: local.documents[0].revisions[0].id }, doc.revisions[1]] }
    expect(() => mergeBackup(local, incoming)).toThrow()
  })
  it('resumes a valid offset; falls back explicitly on revision mismatch or unsafe offset', () => {
    const data = fixture(), doc = data.documents[0], position = data.positions[0]
    expect(resumePosition(doc, position)).toEqual({ offset: 4, warning: '' })
    expect(resumePosition(doc, { ...position, offset: 2 }).warning).not.toBe('')
    expect(resumePosition(revise(doc, 'new text'), position)).toMatchObject({ offset: 0 })
    expect(resumePosition(revise(doc, 'new text'), position).warning).not.toBe('')
  })
})
