import { MAX_TEXT_BYTES, validateText } from './document'

export const MAX_PDF_BYTES = 50 * 1024 * 1024
export const MAX_PDF_PAGES = 500
export const pdfWarnings = ['no-text', 'little-text', 'reading-order', 'fragmented', 'unicode'] as const
export type PdfWarning = typeof pdfWarnings[number]
export interface PdfPageInfo { number: number; start: number; end: number; warnings: readonly PdfWarning[] }
export interface PdfSource { pageCount: number; extractedAt: string; extractor: string; pages: readonly PdfPageInfo[] }
export interface PdfExtraction { raw: string; working: string; metadata: PdfSource }
export interface PdfTextItem { str: string; transform: number[]; width: number; height: number; hasEOL: boolean; dir: string }
export const warningLabels: Record<PdfWarning, string> = {
  'no-text': 'Không có chữ trích xuất được; có thể là trang ảnh/scan hoặc trang trắng. Không có OCR.',
  'little-text': 'Rất ít chữ; có thể thiếu nội dung trong ảnh.',
  'reading-order': 'Có dấu hiệu nhiều cột hoặc thứ tự bất thường. Hãy kiểm tra thứ tự đọc.',
  fragmented: 'Nhiều mảnh chữ nhỏ; hãy kiểm tra từ và khoảng trắng.',
  unicode: 'Có ký tự thay thế, điều khiển hoặc hướng chữ đặc biệt; hãy đối chiếu bản PDF.',
}

// Never sort PDF items: geometry is a warning signal, not a layout engine.
export function extractPage(items: readonly PdfTextItem[]) {
  const parts: string[] = []
  let previous: PdfTextItem | undefined, jumps = 0, tiny = 0, count = 0
  for (const item of items) {
    if (previous && item.str) {
      const dy = item.transform[5] - previous.transform[5]
      const lineHeight = Math.max(1, Math.abs(item.height), Math.abs(previous.height))
      if (Math.abs(dy) > lineHeight * .5 && !parts.at(-1)?.endsWith('\n')) parts.push('\n')
      else if (Math.abs(dy) <= lineHeight * .5 && !previous.hasEOL && item.transform[4] - previous.transform[4] - previous.width > lineHeight * .15 && !/\s$/u.test(previous.str) && !/^\s/u.test(item.str)) parts.push(' ')
      if (dy > lineHeight || Math.abs(item.transform[4] - previous.transform[4]) > 140 && Math.abs(dy) <= lineHeight * 2) jumps++
    }
    parts.push(item.str)
    if (item.hasEOL) parts.push('\n')
    if (item.str.trim()) { count++; if ([...item.str.trim()].length <= 2) tiny++; previous = item }
  }
  const raw = parts.join('')
  const warnings: PdfWarning[] = []
  const characters = raw.replace(/\s/gu, '').length
  if (!characters) warnings.push('no-text')
  else if (characters < 20) warnings.push('little-text')
  if (jumps >= 2 || items.some(i => i.dir === 'ttb' || Math.abs(i.transform[1]) > 1 || Math.abs(i.transform[2]) > 1)) warnings.push('reading-order')
  if (count >= 12 && tiny / count > .6) warnings.push('fragmented')
  if (/[\uFFFD\u202A-\u202E\u2066-\u2069]/u.test(raw) || [...raw].some(c => c.charCodeAt(0) <= 8 || c.charCodeAt(0) >= 14 && c.charCodeAt(0) <= 31)) warnings.push('unicode')
  return { raw, warnings }
}

// Preserve line boundaries, Unicode and every hyphen. No inferred word joining.
export function normalizePdfText(raw: string) {
  return raw.replace(/\r\n?/gu, '\n').split('\n').map(line => line.replace(/[\t \u00A0]+/gu, ' ').trim()).join('\n').replace(/\n{3,}/gu, '\n\n').trim()
}
export function completeExtraction(pages: readonly { raw: string; warnings: readonly PdfWarning[] }[], extractor: string): PdfExtraction {
  let raw = ''
  const information: PdfPageInfo[] = []
  for (const [index, page] of pages.entries()) {
    if (index) raw += '\n\n'
    const start = raw.length
    raw += page.raw
    information.push({ number: index + 1, start, end: raw.length, warnings: page.warnings })
  }
  validateText(raw)
  if (new TextEncoder().encode(raw).byteLength > MAX_TEXT_BYTES) throw new Error('Văn bản PDF vượt giới hạn 2 MiB.')
  if (!raw.trim()) throw new Error('PDF không có chữ có thể chọn; có thể là ảnh/scan hoặc trang trắng. OCR không có trong phiên bản này.')
  return { raw, working: normalizePdfText(raw), metadata: { pageCount: pages.length, extractedAt: new Date().toISOString(), extractor, pages: information } }
}
