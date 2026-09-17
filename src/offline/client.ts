export interface OfflineState { ready: boolean; waiting: boolean; supported: boolean; error: string }
export function registerOffline(report: (state: OfflineState) => void) {
  const supported = 'serviceWorker' in navigator && window.isSecureContext
  let registration: ServiceWorkerRegistration | undefined, disposed = false, checked = 0
  const state: OfflineState = { ready: false, waiting: false, supported, error: '' }
  const publish = () => { if (!disposed) report({ ...state }) }
  async function check() {
    if (!registration || !navigator.onLine) return
    checked = Date.now()
    try { await registration.update(); state.error = ''; state.waiting = !!registration.waiting }
    catch { state.error = 'Chưa kiểm tra được bản cập nhật. Hãy thử lại khi có mạng.' }
    publish()
  }
  const onFocus = () => { if (Date.now() - checked > 60 * 60 * 1000) void check() }
  if (supported && import.meta.env.PROD) {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
      if (disposed) return
      registration = reg; state.ready = !!reg.active; state.waiting = !!reg.waiting && !!reg.active; publish()
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'activated') state.ready = true
          // The first installation also briefly enters waiting before activating.
          // It is not an update and must not leave a stale update notification.
          state.waiting = !!reg.waiting && !!reg.active
          if (worker.state === 'redundant') state.error = 'Chưa lưu đủ ứng dụng để dùng ngoại tuyến. Kết nối lại và thử kiểm tra cập nhật.'
          publish()
        })
      })
      void navigator.serviceWorker.ready.then(() => { state.ready = true; state.waiting = !!reg.waiting; publish() })
      window.addEventListener('focus', onFocus); window.addEventListener('online', onFocus)
    }).catch(() => { state.error = 'Không bật được ứng dụng ngoại tuyến. Bạn vẫn có thể dùng khi có mạng và xuất sao lưu.'; publish() })
  } else publish()
  return {
    check,
    async activate(): Promise<void> {
      const worker = registration?.waiting
      if (!worker) throw new Error('Chưa có bản mới sẵn sàng. Hãy kiểm tra lại.')
      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel()
        const cleanup = () => { clearTimeout(timeout); channel.port1.close(); navigator.serviceWorker.removeEventListener('controllerchange', changed) }
        const changed = () => { cleanup(); resolve() }
        const timeout = setTimeout(() => { cleanup(); reject(new Error('Chưa cập nhật được. Phiên hiện tại vẫn còn mở; hãy thử lại.')) }, 10000)
        navigator.serviceWorker.addEventListener('controllerchange', changed)
        channel.port1.onmessage = event => { if (!event.data?.ok) { cleanup(); reject(new Error('Hãy đóng các tab/cửa sổ OneWord khác rồi thử lại để bảo vệ phiên đang mở.')) } }
        worker.postMessage({ type: 'ACTIVATE_ONEWORD' }, [channel.port2])
      })
    },
    dispose() { disposed = true; window.removeEventListener('focus', onFocus); window.removeEventListener('online', onFocus) },
  }
}
