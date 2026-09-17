import type { PdfExtraction, PdfSource } from './pdf-text'
export const MAX_TEXT_BYTES = 2 * 1024 * 1024
export interface TextDocument {
  readonly id: string
  readonly source: 'paste' | 'txt' | 'pdf'
  readonly pdf?: PdfSource
  readonly createdAt: string
  readonly version: number
  readonly original: string
  readonly name: string
  readonly revisions: readonly TextRevision[]
  readonly revision: number
}
export interface TextRevision { readonly id: string; readonly documentId: string; readonly number: number; readonly text: string; readonly createdAt: string }
export function freezeDocument(doc: TextDocument): TextDocument {
  return Object.freeze({ ...doc, ...(doc.pdf ? { pdf: Object.freeze({ ...doc.pdf, pages: Object.freeze(doc.pdf.pages.map(p => Object.freeze({ ...p, warnings: Object.freeze([...p.warnings]) }))) }) } : {}), revisions: Object.freeze(doc.revisions.map(r => Object.freeze({ ...r }))) })
}
export function validateText(text: string) {
  if (new TextEncoder().encode(text).byteLength > MAX_TEXT_BYTES) throw new Error('Văn bản vượt giới hạn 2 MB của bản thử nghiệm.')
  if (text.includes('\u0000')) throw new Error('Tệp chứa dữ liệu nhị phân. Hãy chọn tệp văn bản UTF-8.')
}
export function createDocument(text: string, name: string, source: 'paste' | 'txt' = 'paste'): TextDocument {
  validateText(text)
  const id = crypto.randomUUID(), createdAt = new Date().toISOString()
  return freezeDocument({ id, source, createdAt, version: 1, original: text, name, revisions: [{ id: crypto.randomUUID(), documentId: id, number: 0, text, createdAt }], revision: 0 })
}
export function currentText(doc: TextDocument) { return doc.revisions[doc.revision].text }
export function createPdfDocument(extraction: PdfExtraction, name: string, working: string): TextDocument {
  validateText(working)
  if (!working.trim()) throw new Error('Văn bản cần có chữ trước khi tiếp tục.')
  const base = createDocument(extraction.raw, name)
  return revise(freezeDocument({ ...base, source: 'pdf', pdf: extraction.metadata }), working)
}
export function revise(doc: TextDocument, text: string): TextDocument {
  validateText(text)
  if (text === currentText(doc)) return doc
  if (doc.revision >= 999) throw new Error('Đã đạt giới hạn 1.000 bản sửa cho tài liệu. Hãy xuất sao lưu trước khi tạo tài liệu mới.')
  return freezeDocument({ ...doc, version: doc.version + 1, revisions: [...doc.revisions.slice(0, doc.revision + 1), { id: crypto.randomUUID(), documentId: doc.id, number: doc.version, text, createdAt: new Date().toISOString() }], revision: doc.revision + 1 })
}
export function undo(doc: TextDocument): TextDocument {
  if (!doc.revision) return doc
  return freezeDocument({ ...doc, version: doc.version + 1, revision: doc.revision - 1 })
}
export async function readTextFile(file: File): Promise<string> {
  if (!/\.txt$/iu.test(file.name)) throw new Error('Mở TXT chỉ nhận tệp .txt. Hãy dùng Mở PDF cho tệp PDF.')
  if (file.size > MAX_TEXT_BYTES) throw new Error('Tệp vượt giới hạn 2 MB của bản thử nghiệm.')
  const buffer = await file.arrayBuffer()
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer) }
  catch { throw new Error('Không đọc được UTF-8. Hãy lưu tệp với mã hóa UTF-8 rồi thử lại.') }
  validateText(text)
  return text
}
