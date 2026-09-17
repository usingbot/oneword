import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractPdf } from './pdf'
import { MAX_PDF_BYTES, MAX_PDF_PAGES } from './pdf-text'

const mocks = vi.hoisted(() => ({ getDocument: vi.fn() }))
vi.mock('pdfjs-dist', () => ({ getDocument: mocks.getDocument, GlobalWorkerOptions: {}, version: '6.3.289' }))
const file = () => new File(['%PDF synthetic'], 'test.pdf', { type: 'application/pdf' })
function fixture(count = 2, content = 'some selectable text') {
  const cleanup = vi.fn(), destroy = vi.fn(async () => undefined)
  const getPage = vi.fn(async () => ({ cleanup, streamTextContent: () => new ReadableStream({ start(controller) {
    controller.enqueue({ items: [{ str: content, transform: [12, 0, 0, 12, 40, 760], width: 100, height: 12, hasEOL: true, dir: 'ltr' }] }); controller.close()
  } }) }))
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: count, getPage }), destroy })
  return { cleanup, destroy, getPage }
}
beforeEach(() => mocks.getDocument.mockReset())
describe('PDF extraction lifecycle (mocked transport; real PDF covered in browser)', () => {
  it('processes pages sequentially with progress, then cleans up every page and task', async () => {
    const { cleanup, destroy, getPage } = fixture()
    const progress = vi.fn()
    const result = await extractPdf(file(), new AbortController().signal, progress)
    expect(progress.mock.calls).toEqual([[0, 2], [1, 2], [2, 2]])
    expect(getPage.mock.calls).toEqual([[1], [2]])
    expect(result.metadata.pageCount).toBe(2)
    expect(cleanup).toHaveBeenCalledTimes(2); expect(destroy).toHaveBeenCalledTimes(1)
    expect(mocks.getDocument.mock.calls[0][0]).toMatchObject({ data: expect.any(Uint8Array), enableXfa: false, useWasm: false, disableFontFace: true })
    expect(mocks.getDocument.mock.calls[0][0]).not.toHaveProperty('url')
  })
  it('cancellation after page one releases resources and never requests page two or returns partial data', async () => {
    const { destroy, cleanup, getPage } = fixture(), controller = new AbortController()
    await expect(extractPdf(file(), controller.signal, page => { if (page === 1) controller.abort() })).rejects.toMatchObject({ name: 'AbortError' })
    expect(getPage).toHaveBeenCalledTimes(1); expect(cleanup).toHaveBeenCalledTimes(1); expect(destroy).toHaveBeenCalledTimes(1)
  })
  it('rejects too many pages before extracting and destroys task', async () => {
    const { destroy, getPage } = fixture(MAX_PDF_PAGES + 1)
    await expect(extractPdf(file(), new AbortController().signal, vi.fn())).rejects.toThrow('500 trang')
    expect(getPage).not.toHaveBeenCalled(); expect(destroy).toHaveBeenCalledTimes(1)
  })
  it('bounds text before retaining an oversized stream chunk and cleans resources on failure', async () => {
    const { destroy, cleanup } = fixture(1, 'x'.repeat(2 * 1024 * 1024 + 1))
    await expect(extractPdf(file(), new AbortController().signal, vi.fn())).rejects.toThrow('2 MiB')
    expect(cleanup).toHaveBeenCalledTimes(1); expect(destroy).toHaveBeenCalledTimes(1)
  })
  it('rejects oversized input before reading bytes or starting PDF.js', async () => {
    const input = file(), read = vi.spyOn(input, 'arrayBuffer')
    Object.defineProperty(input, 'size', { value: MAX_PDF_BYTES + 1 })
    await expect(extractPdf(input, new AbortController().signal, vi.fn())).rejects.toThrow('50 MiB')
    expect(read).not.toHaveBeenCalled(); expect(mocks.getDocument).not.toHaveBeenCalled()
  })
  it('rejects an already cancelled request before reading bytes', async () => {
    const input = file(), controller = new AbortController(), read = vi.spyOn(input, 'arrayBuffer')
    controller.abort()
    await expect(extractPdf(input, controller.signal, vi.fn())).rejects.toMatchObject({ name: 'AbortError' })
    expect(read).not.toHaveBeenCalled()
  })
})
