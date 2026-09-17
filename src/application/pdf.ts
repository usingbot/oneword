import { MAX_TEXT_BYTES } from './document'
import { completeExtraction, extractPage, MAX_PDF_BYTES, MAX_PDF_PAGES, type PdfTextItem } from './pdf-text'

export async function extractPdf(file: File, signal: AbortSignal, progress: (page: number, total: number) => void) {
  signal.throwIfAborted()
  if (!/\.pdf$/iu.test(file.name)) throw new Error('Hãy chọn tệp .pdf.')
  if (!file.size) throw new Error('Tệp PDF rỗng.')
  if (file.size > MAX_PDF_BYTES) throw new Error('PDF vượt giới hạn 50 MiB. Hãy chọn tệp nhỏ hơn.')
  const { getDocument, GlobalWorkerOptions, version } = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  signal.throwIfAborted()
  GlobalWorkerOptions.workerSrc = workerUrl
  const bytes = new Uint8Array(await file.arrayBuffer())
  signal.throwIfAborted()
  // PDF.js 6 removed isEvalSupported/eval. No viewer/scripting manager or actions API.
  const task = getDocument({ data: bytes, enableXfa: false, useWasm: false,
    disableFontFace: true, useSystemFonts: false, stopAtErrors: true,
    cMapUrl: `${import.meta.env.BASE_URL}pdf-assets/cmaps/`, cMapPacked: true,
    standardFontDataUrl: `${import.meta.env.BASE_URL}pdf-assets/standard_fonts/`,
    // Only our fixed, bundled asset paths can be fetched. No PDF URL is supplied.
    useWorkerFetch: true, verbosity: 0 })
  let destruction: Promise<void> | undefined
  const destroy = () => destruction ??= task.destroy()
  const abort = () => { void destroy().catch(() => undefined) }
  signal.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 120_000)
  try {
    signal.throwIfAborted()
    const pdf = await task.promise
    if (!pdf.numPages) throw new Error('PDF không có trang.')
    if (pdf.numPages > MAX_PDF_PAGES) throw new Error('PDF vượt giới hạn 500 trang. Hãy chia thành tệp nhỏ hơn.')
    const pages: ReturnType<typeof extractPage>[] = []
    let size = 0
    progress(0, pdf.numPages)
    for (let number = 1; number <= pdf.numPages; number++) {
      signal.throwIfAborted()
      const page = await pdf.getPage(number)
      try {
        const stream = page.streamTextContent({ disableNormalization: true })
        const reader = stream.getReader()
        const items: PdfTextItem[] = []
        try {
          while (true) {
            signal.throwIfAborted()
            const chunk = await reader.read()
            if (chunk.done) break
            for (const item of chunk.value.items) if ('str' in item) {
              size += new TextEncoder().encode(item.str).byteLength + 2
              if (size > MAX_TEXT_BYTES || items.length >= 100_000) throw new Error('Văn bản PDF quá lớn hoặc quá nhiều mảnh chữ (giới hạn 2 MiB).')
              items.push(item)
            }
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        } finally { await reader.cancel().catch(() => undefined); reader.releaseLock() }
        signal.throwIfAborted()
        pages.push(extractPage(items))
        progress(number, pdf.numPages)
      } finally { page.cleanup() }
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    signal.throwIfAborted()
    return completeExtraction(pages, `pdfjs-dist@${version}`)
  } catch (error) {
    signal.throwIfAborted()
    if (error instanceof Error && error.name === 'PasswordException') throw new Error('PDF được bảo vệ bằng mật khẩu. M2 chưa mở PDF cần mật khẩu; hãy chọn bản đã mở khóa hợp lệ.', { cause: error })
    if (error instanceof Error && /^(InvalidPDFException|UnknownErrorException)$/u.test(error.name)) throw new Error('PDF hỏng, không hợp lệ hoặc không đọc được lớp chữ. Không tạo tài liệu.', { cause: error })
    if (destruction) throw new Error('Trích xuất quá thời gian 120 giây. Hãy thử tệp nhỏ hơn.', { cause: error })
    throw error
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', abort); await destroy() }
}
