import { freezeDocument, validateText, type TextDocument } from './document'
import { type LibraryData, type Preferences, type ReadingPosition } from './library'
import { type ReaderSettings } from '../domain/reader'
import { MAX_PDF_PAGES, pdfWarnings, type PdfSource, type PdfWarning } from './pdf-text'
import { mergeStudyPacks, validateStudyLibrary } from './study-pack'

export const MAX_BACKUP_BYTES = 32 * 1024 * 1024
export const BACKUP_TYPE = 'oneword-personal-backup'
export interface BackupEnvelope { type: typeof BACKUP_TYPE; schemaVersion: 3; exportedAt: string; data: LibraryData }
function invalid(message = 'Cấu trúc hoặc tham chiếu không hợp lệ.'): never { throw new Error(message) }
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
  const result = value as Record<string, unknown>
  if (Object.keys(result).length !== keys.length || keys.some(k => !Object.hasOwn(result, k))) return invalid()
  return result
}
function string(value: unknown, max = 256): string { if (typeof value !== 'string' || value.length > max) return invalid(); return value }
function id(value: unknown): string { const s = string(value, 36); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(s)) return invalid('ID không hợp lệ.'); return s }
function timestamp(value: unknown): string { const s = string(value, 24); if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString() !== s) return invalid('Timestamp không hợp lệ.'); return s }
function integer(value: unknown, min: number, max: number): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) return invalid(); return value }
function bool(value: unknown): boolean { if (typeof value !== 'boolean') return invalid(); return value }
function text(value: unknown): string { const s = string(value, 2 * 1024 * 1024); validateText(s); return s }
function list(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) return invalid('Vượt giới hạn số tài liệu hoặc bản sửa.'); return value }
function settings(value: unknown): ReaderSettings {
  const s = object(value, ['mode', 'words', 'wpm', 'punctuation'])
  if (s.mode !== 'words' && s.mode !== 'sentence') return invalid()
  return { mode: s.mode, words: integer(s.words, 1, 100), wpm: integer(s.wpm, 30, 1200), punctuation: bool(s.punctuation) }
}
function preferences(value: unknown): Preferences {
  const p = object(value, ['reader', 'glow', 'progress', 'fontSize'])
  return { reader: settings(p.reader), glow: bool(p.glow), progress: bool(p.progress), fontSize: integer(p.fontSize, 28, 80) }
}
export function validateLibrary(value: unknown): LibraryData {
  const data = object(value, ['documents', 'positions', 'preferences', 'activeDocumentId', 'draft', 'packs'])
  const ids = new Set<string>(), revisionIds = new Set<string>()
  const documents: TextDocument[] = list(data.documents, 100).map(value => {
    const isPdf = !!value && typeof value === 'object' && 'source' in value && value.source === 'pdf'
    const d = object(value, ['id', 'source', 'createdAt', 'version', 'original', 'name', 'revisions', 'revision', ...(isPdf ? ['pdf'] : [])])
    const documentId = id(d.id)
    if (ids.has(documentId) || (d.source !== 'txt' && d.source !== 'paste' && d.source !== 'pdf')) return invalid('ID tài liệu trùng hoặc nguồn không hợp lệ.')
    ids.add(documentId)
    let lastNumber = -1
    const revisions = list(d.revisions, 1000).map(value => {
      const r = object(value, ['id', 'documentId', 'number', 'text', 'createdAt'])
      const revisionId = id(r.id), number = integer(r.number, 0, Number.MAX_SAFE_INTEGER)
      if (revisionIds.has(revisionId) || r.documentId !== documentId || number <= lastNumber) return invalid('ID hoặc liên kết bản sửa không hợp lệ.')
      revisionIds.add(revisionId); lastNumber = number
      return { id: revisionId, documentId, number, text: text(r.text), createdAt: timestamp(r.createdAt) }
    })
    const original = text(d.original), version = integer(d.version, 1, Number.MAX_SAFE_INTEGER)
    if (!revisions.length || revisions[0].number !== 0 || revisions[0].text !== original || version <= lastNumber) return invalid('Bản gốc hoặc version tài liệu không hợp lệ.')
    let pdf: PdfSource | undefined
    if (isPdf) {
      const p = object(d.pdf, ['pageCount', 'extractedAt', 'extractor', 'pages'])
      const pageCount = integer(p.pageCount, 1, MAX_PDF_PAGES)
      let end = -2
      const pages = list(p.pages, MAX_PDF_PAGES).map((value, index) => {
        const page = object(value, ['number', 'start', 'end', 'warnings'])
        const start = integer(page.start, 0, original.length)
        if (page.number !== index + 1 || start !== end + 2 || index > 0 && original.slice(end, start) !== '\n\n') return invalid('Liên kết trang PDF không hợp lệ.')
        end = integer(page.end, start, original.length)
        const warnings = list(page.warnings, pdfWarnings.length).map(w => { if (!pdfWarnings.includes(w as PdfWarning)) return invalid(); return w as PdfWarning })
        if (new Set(warnings).size !== warnings.length) return invalid()
        return { number: index + 1, start, end, warnings }
      })
      if (pages.length !== pageCount || end !== original.length) return invalid('Số trang PDF không hợp lệ.')
      pdf = { pageCount, extractedAt: timestamp(p.extractedAt), extractor: string(p.extractor, 80), pages }
    }
    return freezeDocument({ id: documentId, source: d.source, ...(pdf ? { pdf } : {}), createdAt: timestamp(d.createdAt), version, original, name: string(d.name), revisions, revision: integer(d.revision, 0, revisions.length - 1) })
  })
  const positionIds = new Set<string>()
  const positions: ReadingPosition[] = list(data.positions, 100).map(value => {
    const p = object(value, ['documentId', 'revisionId', 'offset', 'settings', 'updatedAt'])
    const documentId = id(p.documentId), revisionId = id(p.revisionId)
    const doc = documents.find(d => d.id === documentId), revision = doc?.revisions.find(r => r.id === revisionId)
    if (!revision || positionIds.has(documentId)) return invalid('Vị trí đọc tham chiếu tài liệu/bản sửa không tồn tại hoặc trùng.')
    positionIds.add(documentId)
    return { documentId, revisionId, offset: integer(p.offset, 0, revision.text.length), settings: settings(p.settings), updatedAt: timestamp(p.updatedAt) }
  })
  const activeDocumentId = data.activeDocumentId === null ? null : id(data.activeDocumentId)
  if (activeDocumentId !== null && !ids.has(activeDocumentId)) return invalid('Tài liệu đang mở không tồn tại.')
  let draft = null
  if (data.draft !== null) {
    const d = object(data.draft, ['documentId', 'text'])
    const documentId = d.documentId === null ? null : id(d.documentId)
    if (documentId !== activeDocumentId) return invalid('Bản nháp không khớp tài liệu đang mở.')
    draft = { documentId, text: text(d.text) }
  }
  return { documents, positions, preferences: preferences(data.preferences), activeDocumentId, draft, packs: validateStudyLibrary(data.packs) }
}
export function exportBackup(data: LibraryData): string {
  const envelope: BackupEnvelope = { type: BACKUP_TYPE, schemaVersion: 3, exportedAt: new Date().toISOString(), data: validateLibrary(data) }
  const json = JSON.stringify(envelope, null, 2)
  if (new TextEncoder().encode(json).byteLength > MAX_BACKUP_BYTES) return invalid('Sao lưu vượt giới hạn 32 MiB.')
  return json
}
export function parseBackup(json: string): BackupEnvelope {
  if (new TextEncoder().encode(json).byteLength > MAX_BACKUP_BYTES) return invalid('Sao lưu vượt giới hạn 32 MiB.')
  // Reject excessive nesting before JSON.parse; braces in text strings do not count.
  let depth = 0, quoted = false, escaped = false
  for (const c of json) {
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false }
    else if (c === '"') quoted = true
    else if (c === '{' || c === '[') { if (++depth > 12) return invalid('JSON lồng quá sâu.') }
    else if (c === '}' || c === ']') depth--
  }
  let parsed: unknown
  try { parsed = JSON.parse(json) } catch { return invalid('Không đọc được JSON sao lưu.') }
  const envelope = object(parsed, ['type', 'schemaVersion', 'exportedAt', 'data'])
  if (envelope.type !== BACKUP_TYPE) return invalid('Không phải Personal Backup của OneWord.')
  if (envelope.schemaVersion !== 1 && envelope.schemaVersion !== 2 && envelope.schemaVersion !== 3) return invalid('Chưa hỗ trợ phiên bản sao lưu này. Không thay đổi dữ liệu hiện có.')
  const legacy = envelope.schemaVersion < 3 ? object(envelope.data, ['documents', 'positions', 'preferences', 'activeDocumentId', 'draft']) : null
  const data = validateLibrary(legacy ? { ...legacy, packs: [] } : envelope.data)
  if (envelope.schemaVersion === 1 && data.documents.some(d => d.source === 'pdf')) return invalid('PDF cần định dạng sao lưu v2.')
  return { type: BACKUP_TYPE, schemaVersion: 3, exportedAt: timestamp(envelope.exportedAt), data }
}
export function mergeBackup(current: LibraryData, incoming: LibraryData) {
  const local = validateLibrary(current), backup = validateLibrary(incoming)
  const fresh = backup.documents.filter(d => !local.documents.some(old => old.id === d.id))
  const conflicts = backup.documents.filter(d => { const old = local.documents.find(old => old.id === d.id); return old && JSON.stringify(old) !== JSON.stringify(d) })
  if (conflicts.length) throw new Error(`${conflicts.length} tài liệu cùng ID nhưng khác nội dung/bản sửa. Đã chặn toàn bộ khôi phục; dữ liệu hiện có được giữ nguyên.`)
  const study = mergeStudyPacks(local.packs, backup.packs)
  if (study.conflicts.length) throw new Error(study.conflicts.join(' '))
  const empty = !local.documents.length && !local.draft && !local.packs.length
  const data = validateLibrary({
    documents: [...local.documents, ...fresh],
    positions: [...local.positions, ...backup.positions.filter(p => fresh.some(d => d.id === p.documentId))],
    preferences: empty ? backup.preferences : local.preferences,
    activeDocumentId: empty ? backup.activeDocumentId : local.activeDocumentId,
    draft: empty ? backup.draft : local.draft,
    packs: study.packs,
  })
  // Keep every successful library representable by our own backup format.
  exportBackup(data)
  return { data, added: fresh.length, duplicates: backup.documents.length - fresh.length, packsAdded: study.added, packsDuplicates: study.duplicates }
}
