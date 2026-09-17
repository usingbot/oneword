import { useEffect, useRef, useState } from 'react'
import { extractPdf } from '../application/pdf'
import { validateText } from '../application/document'
import { warningLabels, type PdfExtraction } from '../application/pdf-text'

export function PdfImport({ file, onCancel, onAccept }: { file: File; onCancel: () => void; onAccept: (result: PdfExtraction, working: string) => void }) {
  const [result, setResult] = useState<PdfExtraction | null>(null)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ page: 0, total: 0 })
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const controller = new AbortController()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancel.current?.focus()
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    void extractPdf(file, controller.signal, (page, total) => { if (!controller.signal.aborted) setProgress({ page, total }) })
      .then(value => { if (!controller.signal.aborted) { setResult(value); setWorking(value.working) } })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Không đọc được PDF.') })
    return () => { controller.abort(); document.body.style.overflow = previousOverflow; window.removeEventListener('beforeunload', warn) }
  }, [file])
  return <div className="restore-overlay"><section className="pdf-dialog" role="dialog" aria-modal="true" aria-label="Nhập PDF" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); onCancel() }
    if (event.key === 'Tab') {
      const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, summary')]
      const index = elements.indexOf(document.activeElement as HTMLElement)
      if (event.shiftKey && index <= 0 || !event.shiftKey && index === elements.length - 1) { event.preventDefault(); elements[event.shiftKey ? elements.length - 1 : 0]?.focus() }
    }
  }}>
    <div className="pdf-heading"><h2>Kiểm tra văn bản PDF</h2><button ref={cancel} onClick={onCancel}>Hủy nhập PDF</button></div>
    <p className="pdf-filename">{file.name}</p>
    <p>Chỉ xử lý trên thiết bị. Giới hạn 50 MiB / 500 trang / 2 MiB chữ. Bản xem trước chưa được lưu.</p>
    <p role="status">{result ? `Đã trích xuất ${progress.total} trang` : error ? 'Không tạo tài liệu.' : progress.total ? `Đang trích xuất: trang ${progress.page} / ${progress.total}` : 'Đang kiểm tra PDF…'}</p>
    {!result && !error && <progress aria-label="Tiến độ trích xuất PDF" value={progress.page} max={progress.total || 1} />}
    {error && <p role="alert" className="error">{error}</p>}
    {result && <>
      <p>Thứ tự chữ có thể sai ở nhiều cột, bảng, chú thích hoặc công thức. Hãy đối chiếu và sửa trước khi đọc. Chỉ thu gọn khoảng trắng; giữ xuống dòng và mọi dấu gạch nối.</p>
      {result.metadata.pages.some(p => p.warnings.length) && <details open className="pdf-warnings"><summary>Cảnh báo theo trang</summary><ul>{result.metadata.pages.filter(p => p.warnings.length).map(p => <li key={p.number}>Trang {p.number}: {p.warnings.map(w => warningLabels[w]).join(' ')}</li>)}</ul></details>}
      <label htmlFor="pdf-working">Văn bản PDF để chỉnh sửa</label>
      <textarea id="pdf-working" value={working} spellCheck={false} onChange={event => { try { validateText(event.target.value); setWorking(event.target.value); setError('') } catch (e) { setError((e as Error).message) } }} />
      <div className="pdf-actions"><button onClick={() => { setWorking(result.working); setError('') }}>Hoàn tác về bản chuẩn hóa</button><button onClick={() => { setWorking(result.raw); setError('') }}>Dùng bản trích xuất gốc</button></div>
      <details><summary>Bản trích xuất gốc theo trang · không chỉnh sửa</summary>{result.metadata.pages.map(p => <section key={p.number}><h3>Trang {p.number}</h3><pre>{result.raw.slice(p.start, p.end) || '(Không có chữ)'}</pre></section>)}</details>
      <button className="primary" disabled={!working.trim()} onClick={() => { try { onAccept(result, working) } catch (e) { setError((e as Error).message) } }}>Lưu và tiếp tục đến trình đọc</button>
    </>}
  </section></div>
}
