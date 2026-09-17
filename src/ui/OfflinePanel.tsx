import { useEffect, useRef, useState } from 'react'
import { registerOffline, type OfflineState } from '../offline/client'

export function OfflinePanel({ blocked, prepare, onBusyChange }: { blocked: boolean; prepare: () => Promise<boolean>; onBusyChange: (busy: boolean) => void }) {
  const [state, setState] = useState<OfflineState>({ ready: false, waiting: false, supported: true, error: '' }), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const client = useRef<ReturnType<typeof registerOffline> | null>(null), reloadRequested = useRef(false), safe = useRef(!blocked)
  safe.current = !blocked
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false) }, [busy, onBusyChange])
  useEffect(() => {
    client.current = registerOffline(setState)
    const changed = () => { if (reloadRequested.current) location.reload() }
    navigator.serviceWorker?.addEventListener('controllerchange', changed)
    return () => { client.current?.dispose(); navigator.serviceWorker?.removeEventListener('controllerchange', changed) }
  }, [])
  async function update() {
    if (!safe.current || busy) return
    setBusy(true); setMessage('')
    try {
      if (!await prepare() || !safe.current) throw new Error('Chưa lưu an toàn phiên hiện tại. Hãy xuất sao lưu, giải quyết lỗi lưu trữ rồi thử lại.')
      reloadRequested.current = true
      await client.current?.activate()
    } catch (error) { reloadRequested.current = false; setMessage((error as Error).message); setBusy(false) }
  }
  async function persist() {
    try { const granted = await navigator.storage?.persist?.(); setMessage(granted ? 'Trình duyệt đã ưu tiên giữ dữ liệu. Vẫn cần sao lưu: xóa dữ liệu trang hoặc mất thiết bị có thể làm mất nội dung.' : 'Trình duyệt chưa cấp ưu tiên lưu trữ. Ứng dụng vẫn hoạt động; hãy xuất Personal Backup thường xuyên.') }
    catch { setMessage('Không yêu cầu được ưu tiên lưu trữ. Hãy dùng Personal Backup để tự giữ bản sao.') }
  }
  return <section className="offline-panel" aria-label="Ứng dụng và lưu trữ">
    <p role="status" data-testid="offline-status">{state.ready ? 'Ứng dụng đã sẵn sàng ngoại tuyến trên trình duyệt này.' : state.supported ? 'Đang chuẩn bị ứng dụng ngoại tuyến…' : 'Trình duyệt này chưa hỗ trợ ứng dụng ngoại tuyến ở địa chỉ hiện tại.'}</p>
    {state.waiting && <div className="update-notice"><p>OneWord có bản cập nhật mới.</p><p>Hoàn tất chỉnh sửa/nhập dữ liệu, dừng đọc và trở về màn hình Đọc trước khi cập nhật. Bản đã lưu được giữ nguyên.</p><button disabled={blocked || busy} onClick={() => void update()}>Cập nhật an toàn</button>{blocked && <p>Tiếp tục phiên hiện tại hoặc hoàn tất thao tác trước; ứng dụng không tự tải lại.</p>}</div>}
    {(state.error || message) && <p role="status">{message || state.error}</p>}
    <details><summary>Ngoại tuyến, cài đặt và sao lưu</summary><p>Tài liệu đã lưu, flashcards và quiz dùng kho trên thiết bị. Ảnh HTTPS bên ngoài cần mạng nếu trình duyệt chưa có ảnh. Không lưu PDF gốc hoặc tự tải ảnh ngoài.</p><p>Dùng menu trình duyệt để cài OneWord khi được hỗ trợ. Bộ nhớ trình duyệt có thể bị xóa; Personal Backup là bản sao do bạn kiểm soát.</p><button onClick={() => void client.current?.check()}>Kiểm tra cập nhật</button><button onClick={() => void persist()}>Ưu tiên giữ dữ liệu trên thiết bị</button></details>
  </section>
}
