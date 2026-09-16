import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createDocument, currentText, readTextFile, revise, undo, type TextDocument } from '../application/document'
import { defaultSettings, ReaderEngine, type ReaderSettings } from '../domain/reader'

const sample = 'Đọc chậm lại một chút.\n\nĐôi khi, điều ta cần không phải là thêm thông tin, mà là một khoảng lặng để chú ý. Hãy chọn nhịp đọc phù hợp, tạm dừng khi cần và quay lại với ngữ cảnh.\n\nBạn là người quyết định tốc độ của mình.'
const statusLabel = { empty: 'Sẵn sàng khi bạn sẵn sàng', ready: 'Sẵn sàng đọc', playing: 'Đang đọc', paused: 'Đã tạm dừng', completed: 'Đã đọc hết' }

export function App() {
  const [engine] = useState(() => new ReaderEngine())
  const reader = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const [doc, setDoc] = useState<TextDocument | null>(null)
  const [draft, setDraft] = useState('')
  const [settings, setSettings] = useState(defaultSettings)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [focus, setFocus] = useState(false)
  const [controls, setControls] = useState(true)
  const [context, setContext] = useState(false)
  const [glow, setGlow] = useState(true)
  const [progress, setProgress] = useState(true)
  const [fontSize, setFontSize] = useState(48)
  const stage = useRef<HTMLElement>(null)
  const editor = useRef<HTMLTextAreaElement>(null)
  const contextClose = useRef<HTMLButtonElement>(null)
  const focusButton = useRef<HTMLButtonElement>(null)
  const nativeFullscreen = useRef(false)
  const wasFocused = useRef(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const importId = useRef(0)
  const text = doc ? currentText(doc) : ''
  const dirty = doc ? draft !== text : draft.length > 0
  const available = reader.chunks.length > 0 && !dirty && !loading
  const chunk = reader.chunks[reader.index]

  useEffect(() => {
    const area = stage.current?.querySelector('.word-area')
    if (area) area.scrollTop = 0
  }, [chunk])

  useEffect(() => {
    if (wasFocused.current && !focus) focusButton.current?.focus()
    wasFocused.current = focus
  }, [focus])

  function revealControls() {
    setControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setControls(false), 2400)
  }

  useEffect(() => {
    const pause = () => engine.pause()
    const visibility = () => { if (document.hidden) pause() }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', visibility)
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); engine.dispose(); clearTimeout(hideTimer.current) }
  }, [engine])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (doc || draft) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [doc, draft])

  useEffect(() => {
    const changed = () => {
      if (document.fullscreenElement) nativeFullscreen.current = true
      else if (nativeFullscreen.current) {
        nativeFullscreen.current = false
        engine.pause(); setFocus(false); setContext(false)
      }
    }
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [engine])

  async function exitFocus() {
    engine.pause(); setContext(false)
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
    setFocus(false)
  }

  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (context) { setContext(false); stage.current?.focus(); return }
        if (focus) { event.preventDefault(); void exitFocus() }
        return
      }
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, select, button, a, [contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey || event.repeat || context || !available) return
      if (event.code === 'Space') { event.preventDefault(); engine.toggle() }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); engine.step(-1) }
      else if (event.key === 'ArrowRight') { event.preventDefault(); engine.step(1) }
      else return
      revealControls()
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  })

  useEffect(() => {
    if (!focus) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [focus])

  function openText(value: string, name: string) {
    const next = createDocument(value, name)
    setDoc(next); setDraft(value); setError(''); setContext(false)
    engine.load(value, settings)
    setNotice(value.trim() ? 'Văn bản đã sẵn sàng. Bản gốc được giữ riêng trong phiên này.' : 'Văn bản chưa có từ để đọc.')
  }

  async function importFile(file?: File) {
    if (!file) return
    engine.pause()
    if ((doc || draft) && !window.confirm('Mở tệp mới sẽ thay nội dung của phiên hiện tại. Tiếp tục?')) return
    const request = ++importId.current
    setLoading(true); setError('')
    try {
      const value = await readTextFile(file)
      if (request === importId.current) openText(value, file.name)
    } catch (e) { if (request === importId.current) setError(e instanceof Error ? e.message : 'Không thể đọc tệp. Hãy thử lại.') }
    finally { if (request === importId.current) setLoading(false) }
  }

  function applyDraft() {
    try {
      if (!doc) openText(draft, 'Văn bản đã dán')
      else {
        const next = revise(doc, draft)
        setDoc(next); engine.load(currentText(next), settings); setError('')
        setNotice('Đã áp dụng bản sửa. Vị trí đọc đặt về đầu để khớp văn bản mới.')
      }
    } catch (e) { setError((e as Error).message) }
  }

  function undoEdit() {
    engine.pause()
    if (doc && dirty) { setDraft(text); setNotice('Đã hoàn tác phần sửa chưa áp dụng.'); return }
    if (!doc) return
    const next = undo(doc)
    setDoc(next); setDraft(currentText(next)); engine.load(currentText(next), settings)
    setNotice('Đã trở về bản sửa trước. Vị trí đọc đặt về đầu.')
  }

  function changeSettings(change: Partial<ReaderSettings>) {
    const next = { ...settings, ...change }
    setSettings(next)
    engine.load(text, next, chunk?.start ?? 0)
  }

  async function enterFocus() {
    if (!available) return
    setFocus(true); setContext(false); revealControls()
    try {
      if (!stage.current?.requestFullscreen) throw new Error('Unavailable')
      await stage.current.requestFullscreen()
    } catch { setNotice('Trình duyệt không cho phép toàn màn hình. Chế độ tập trung vẫn dùng trong cửa sổ này.') }
    stage.current?.focus()
  }

  function showContext() {
    engine.pause(); setContext(true); revealControls()
    setTimeout(() => contextClose.current?.focus(), 0)
  }

  return <div className="app-shell">
    <header className="site-header" inert={focus}>
      <a className="wordmark" href="#main"><span className="brand-mark" aria-hidden="true">o<span /></span>oneword<span className="brand-period">.</span></a>
      <span className="header-note"><span className="status-dot" /> Một khoảng riêng để đọc</span>
    </header>

    <main id="main">
      <div className="intro" inert={focus}>
        <p className="eyebrow">ĐỌC TẬP TRUNG</p>
        <h1>Từng nhịp chữ.<br /><span>Theo nhịp của bạn.</span></h1>
        <p>Mở một văn bản, chọn nhịp đọc và dành sự chú ý cho điều trước mắt.</p>
      </div>

      <div className="workspace">
        <section className="editor-panel" aria-labelledby="source-title" inert={focus}>
          <div className="panel-heading"><div><span className="step">01</span><h2 id="source-title">Văn bản của bạn</h2></div>
            <label className={`file-button ${loading ? 'disabled' : ''}`}>Mở TXT <span aria-hidden="true">↗</span><input type="file" accept=".txt,text/plain" aria-label="Mở tệp TXT" disabled={loading} onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = '' }} /></label>
          </div>
          <div className="source-meta"><span>{doc?.name ?? 'Dán văn bản để bắt đầu'}</span><span>UTF-8 · tối đa 2 MB</span></div>
          <label className="sr-only" htmlFor="source-text">Nội dung văn bản</label>
          <textarea id="source-text" ref={editor} value={draft} disabled={loading} placeholder="Dán một đoạn văn, một bài viết, hay điều bạn muốn dành thời gian đọc…" spellCheck={false} onChange={(event) => { engine.pause(); setDraft(event.target.value); setError('') }} />
          <div className="editor-actions">
            <button className="primary" disabled={loading || (!dirty && !!doc) || (!doc && !draft.trim())} onClick={applyDraft}>{doc ? 'Áp dụng thay đổi' : 'Dùng văn bản'} <span aria-hidden="true">→</span></button>
            <button className="text-button" onClick={undoEdit} disabled={!doc || (!dirty && doc.revision === 0)}>↶ Hoàn tác</button>
          </div>
          {!doc && <button className="sample-button" disabled={loading} onClick={() => { if (!draft || window.confirm('Thay văn bản đang nhập bằng đoạn mẫu?')) openText(sample, 'Đoạn đọc thử') }}>Chưa có văn bản? <span>Thử một đoạn ngắn</span></button>}
          {loading && <div className="loading" role="status">Đang đọc tệp… <button onClick={() => { importId.current++; setLoading(false); setNotice('Đã hủy mở tệp.') }}>Hủy</button></div>}
          {doc && <details className="original"><summary>Xem bản gốc · không chỉnh sửa</summary><pre data-testid="original-text">{doc.original}</pre></details>}
          <p className="session-note">Chỉ giữ trong phiên này. Tải lại hoặc đóng trang sẽ mất nội dung. Chưa có lưu và sao lưu ở M1a.</p>
        </section>

        <div className="reader-column">
          <div className="panel-heading reader-heading" inert={focus}><div><span className="step">02</span><h2>Nhịp đọc</h2></div><span className="quiet-label">Xem trước</span></div>
          <section ref={stage} tabIndex={0} className={`reader-stage ${focus ? 'is-focus' : ''} ${glow ? 'has-glow' : ''} ${controls || reader.status !== 'playing' ? 'controls-visible' : ''}`} aria-label="Trình đọc" onPointerMove={revealControls} onPointerDown={revealControls} onKeyDown={(event) => { if (event.key === 'Tab') revealControls() }}>
            {focus && <button className="exit-focus" aria-label="Thoát toàn màn hình" onClick={() => void exitFocus()}><span aria-hidden="true">↙</span><span>Thoát</span></button>}
            {!focus && <p className="stage-status" role="status">{statusLabel[reader.status]}</p>}
            <div className="word-area" style={{ fontSize: `${fontSize}px` }}>
              <div className={`current-chunk ${!chunk ? 'placeholder-word' : ''}`} data-testid="current-chunk">{chunk?.text ?? 'Bắt đầu từ đây.'}</div>
            </div>
            {focus && reader.status === 'completed' && <p className="completion" role="status">Đã đọc hết · nhấn Space để đọc lại</p>}
            <div className="stage-toolbar" aria-label="Điều khiển đọc">
              <button aria-label="Lùi một lượt" title="Lùi một lượt (←)" disabled={!available} onClick={() => engine.step(-1)}>←</button>
              <button className="play-button" aria-label={reader.status === 'playing' ? 'Tạm dừng' : reader.status === 'completed' ? 'Đọc lại' : 'Đọc tiếp'} disabled={!available} onClick={() => { engine.toggle(); revealControls() }}>{reader.status === 'playing' ? 'Ⅱ' : '▶'}</button>
              <button aria-label="Tiến một lượt" title="Tiến một lượt (→)" disabled={!available} onClick={() => engine.step(1)}>→</button>
              <span className="toolbar-divider" />
              <button className="context-button" disabled={!available} onClick={showContext}>Ngữ cảnh</button>
              {!focus && <button ref={focusButton} className="expand-button" aria-label="Mở toàn màn hình" disabled={!available} onClick={() => void enterFocus()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5" /></svg></button>}
            </div>
            {progress && <div className="reading-progress" role="progressbar" aria-label="Tiến độ đọc" aria-valuemin={0} aria-valuemax={100} aria-valuenow={reader.chunks.length ? Math.round((reader.status === 'completed' ? reader.chunks.length : reader.index) / reader.chunks.length * 100) : 0}><span style={{ width: `${reader.chunks.length ? (reader.status === 'completed' ? reader.chunks.length : reader.index) / reader.chunks.length * 100 : 0}%` }} /></div>}
            {context && <div className="context-panel" role="dialog" aria-modal="true" aria-label="Ngữ cảnh văn bản" onKeyDown={(event) => { if (event.key === 'Tab') { event.preventDefault(); contextClose.current?.focus() } }}>
              <div className="context-heading"><h3>Đọc trong ngữ cảnh</h3><button ref={contextClose} onClick={() => { setContext(false); stage.current?.focus() }}>Đóng ngữ cảnh</button></div>
              <p>{text.slice(Math.max(0, (chunk?.start ?? 0) - 400), chunk?.start)}<mark>{chunk?.text}</mark>{text.slice(chunk?.end, (chunk?.end ?? 0) + 600)}</p>
              <small>Trình đọc đã dừng. Nhấn Space khi bạn muốn tiếp tục.</small>
            </div>}
          </section>

          <section className="settings-panel" aria-label="Thiết lập đọc" inert={focus}>
            <div className="speed-heading"><label htmlFor="wpm">Tốc độ</label><span><strong>{settings.wpm}</strong> WPM</span></div>
            <input id="wpm" type="range" min="30" max="1200" step="10" value={settings.wpm} onChange={(e) => changeSettings({ wpm: Number(e.target.value) })} />
            <div className="range-labels"><span>Chậm rãi</span><span>Nhanh hơn</span></div>
            <fieldset className="chunk-options"><legend>Mỗi lượt đọc</legend><div className="segmented">
              {[1, 2, 3, 4, 5].map((count) => <button key={count} aria-pressed={settings.mode === 'words' && settings.words === count} onClick={() => changeSettings({ mode: 'words', words: count })}>{count}</button>)}
              <button aria-pressed={settings.mode === 'sentence'} onClick={() => changeSettings({ mode: 'sentence' })}>Cả câu</button>
            </div></fieldset>
            <div className="custom-count"><label htmlFor="custom-count">Số từ tùy chỉnh</label><input id="custom-count" type="number" min="1" max="100" value={settings.words} onChange={(e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 1 && n <= 100) changeSettings({ mode: 'words', words: n }) }} /></div>
            <label className="check-row"><input type="checkbox" checked={settings.punctuation} onChange={(e) => changeSettings({ punctuation: e.target.checked })} /><span>Nghỉ thêm ở dấu câu</span></label>
            <details className="display-settings"><summary>Hiển thị & phím tắt</summary><label className="check-row"><input type="checkbox" checked={glow} onChange={(e) => setGlow(e.target.checked)} />Ánh sáng nhẹ</label><label className="check-row"><input type="checkbox" checked={progress} onChange={(e) => setProgress(e.target.checked)} />Thanh tiến độ</label><label className="font-label" htmlFor="font-size">Cỡ chữ · {fontSize}px</label><input id="font-size" type="range" min="28" max="80" step="2" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} /><p><kbd>Space</kbd> dừng / tiếp tục · <kbd>←</kbd> <kbd>→</kbd> chuyển lượt · <kbd>Esc</kbd> thoát tập trung. Phím tắt không chạy trong ô nhập liệu.</p></details>
            <p className="count-note">WPM tính theo đơn vị cách nhau bằng khoảng trắng, không phải tách từ ngôn ngữ học tiếng Việt.</p>
          </section>
        </div>
      </div>
      <div className="messages" inert={focus}>{error && <p className="error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{dirty && doc && <p>Văn bản có thay đổi. Áp dụng hoặc hoàn tác trước khi đọc.</p>}</div>
    </main>
    <footer inert={focus}><span>Văn bản ở trên thiết bị của bạn. Không gửi lên server.</span><span>ONEWORD / M1a</span></footer>
    {focus && notice.startsWith('Trình duyệt') && <span className="sr-only" role="status">{notice}</span>}
  </div>
}
