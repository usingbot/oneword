import { describe, expect, it } from 'vitest'
import { completeExtraction, extractPage, normalizePdfText, type PdfTextItem } from './pdf-text'
import { createDocument, createPdfDocument, currentText, revise, undo } from './document'
import { exportBackup, parseBackup } from './backup'
import { emptyLibrary } from './library'
const item = (str: string, x = 40, y = 760, hasEOL = true): PdfTextItem => ({ str, transform: [12, 0, 0, 12, x, y], width: 80, height: 12, hasEOL, dir: 'ltr' })
describe('PDF text and source contract', () => {
  it('normalizes whitespace deterministically without inferring hyphens or deleting Unicode', () => {
    const raw = '  Tiếng\tViệt  e\u0301 😀\r\n informa-\r\ntion\n\n\nwell-being state-of-the-art x-ray A-B -4  '
    const normalized = normalizePdfText(raw)
    expect(normalized).toBe('Tiếng Việt e\u0301 😀\ninforma-\ntion\n\nwell-being state-of-the-art x-ray A-B -4')
    expect(normalizePdfText(normalized)).toBe(normalized)
  })
  it('keeps content order and diagnoses interleaved columns without silently sorting', () => {
    const result = extractPage([item('left1'), item('right1', 330), item('left2', 40, 740), item('right2', 330, 740)])
    expect(result.raw).toBe('left1\nright1\nleft2\nright2\n')
    expect(result.warnings).toContain('reading-order')
  })
  it('separates baseline lines and spaced fragments while preserving item strings', () => {
    expect(extractPage([item('hello', 40, 760, false), item('world', 130, 760, false), item('next', 40, 740)]).raw).toBe('hello world\nnext\n')
  })
  it('warns for fragmented, little text, controls and non-text pages', () => {
    expect(extractPage([]).warnings).toEqual(['no-text'])
    expect(extractPage([item('hi')]).warnings).toContain('little-text')
    expect(extractPage([item('\uFFFD\u202E')]).warnings).toContain('unicode')
    expect(extractPage(Array.from({ length: 15 }, () => item('x'))).warnings).toContain('fragmented')
  })
  it('retains page offsets including empty mixed pages, immutable raw and undo revisions', () => {
    const extraction = completeExtraction([extractPage([item('  original  ')]), extractPage([])], 'pdfjs-dist@test')
    const doc = createPdfDocument(extraction, 'test.pdf', 'edited')
    expect(doc.original).toBe('  original  \n\n\n')
    expect(doc.pdf?.pages[1]).toMatchObject({ start: doc.original.length, end: doc.original.length, warnings: ['no-text'] })
    expect(currentText(undo(doc))).toBe(doc.original)
    expect(revise(doc, 'new').original).toBe(doc.original)
    expect(Object.isFrozen(doc.pdf?.pages[0].warnings)).toBe(true)
    const library = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id }
    expect(parseBackup(exportBackup(library)).data).toEqual(library)
  })
  it('rejects all-empty extraction and empty edited documents', () => {
    expect(() => completeExtraction([extractPage([])], 'test')).toThrow('OCR')
    expect(() => createPdfDocument(completeExtraction([extractPage([item('text')])], 'test'), 'test.pdf', ' ')).toThrow()
  })
  it.each(['page-count', 'offset', 'warning', 'unknown', 'v1-pdf'])('rejects invalid PDF backup: %s', kind => {
    const doc = createPdfDocument(completeExtraction([extractPage([item('text')])], 'test'), 'test.pdf', 'text')
    const backup = JSON.parse(exportBackup({ ...emptyLibrary(), documents: [doc] }))
    const pdf = backup.data.documents[0].pdf
    if (kind === 'page-count') pdf.pageCount = 2
    if (kind === 'offset') pdf.pages[0].start = 1
    if (kind === 'warning') pdf.pages[0].warnings.push('not-known')
    if (kind === 'unknown') pdf.binary = 'not-allowed'
    if (kind === 'v1-pdf') { backup.schemaVersion = 1; delete backup.data.packs; delete backup.data.review; delete backup.data.quizAttempts; delete backup.data.quizActiveAttemptId }
    expect(() => parseBackup(JSON.stringify(backup))).toThrow()
  })
  it('accepts an M1b v1 backup without changing IDs, original or history', () => {
    const doc = revise(createDocument('original text', 'm1b.txt', 'txt'), 'edited text')
    const data = { ...emptyLibrary(), documents: [doc], activeDocumentId: doc.id, draft: { documentId: doc.id, text: 'draft' } }
    const backup = JSON.parse(exportBackup(data)); backup.schemaVersion = 1; delete backup.data.packs; delete backup.data.review; delete backup.data.quizAttempts; delete backup.data.quizActiveAttemptId
    expect(parseBackup(JSON.stringify(backup))).toMatchObject({ schemaVersion: 5, data })
  })
})
