export const MAX_TEXT_BYTES = 2 * 1024 * 1024
export interface TextDocument {
  readonly original: string
  readonly name: string
  readonly revisions: readonly string[]
  readonly revision: number
}
export function validateText(text: string) {
  if (new TextEncoder().encode(text).byteLength > MAX_TEXT_BYTES) throw new Error('Văn bản vượt giới hạn 2 MB của bản thử nghiệm.')
  if (text.includes('\u0000')) throw new Error('Tệp chứa dữ liệu nhị phân. Hãy chọn tệp văn bản UTF-8.')
}
export function createDocument(text: string, name: string): TextDocument {
  validateText(text)
  return Object.freeze({ original: text, name, revisions: Object.freeze([text]), revision: 0 })
}
export function currentText(doc: TextDocument) { return doc.revisions[doc.revision] }
export function revise(doc: TextDocument, text: string): TextDocument {
  validateText(text)
  if (text === currentText(doc)) return doc
  return Object.freeze({ ...doc, revisions: Object.freeze([...doc.revisions.slice(0, doc.revision + 1), text]), revision: doc.revision + 1 })
}
export function undo(doc: TextDocument): TextDocument {
  if (!doc.revision) return doc
  return Object.freeze({ ...doc, revision: doc.revision - 1 })
}
export async function readTextFile(file: File): Promise<string> {
  if (!/\.txt$/iu.test(file.name)) throw new Error('M1a chỉ mở tệp .txt. PDF chưa được hỗ trợ.')
  if (file.size > MAX_TEXT_BYTES) throw new Error('Tệp vượt giới hạn 2 MB của bản thử nghiệm.')
  const buffer = await file.arrayBuffer()
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer) }
  catch { throw new Error('Không đọc được UTF-8. Hãy lưu tệp với mã hóa UTF-8 rồi thử lại.') }
  validateText(text)
  return text
}
