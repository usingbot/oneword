import { useEffect, useRef, useState } from 'react'
import { latestReview, newCardsUsed, ratingHelp, ratingLabels, ratings, reviewQueue, ReviewConflict, systemClock, type RecallRating, type ReviewCommand, type ReviewGateway, type ReviewSnapshot } from '../application/review'
import { Face } from './StudyFace'

export function ReviewPanel({ gateway, deckId, onExit }: { gateway: ReviewGateway; deckId: string; onExit: () => void }) {
  const [snapshot, setSnapshot] = useState<ReviewSnapshot | null>(null)
  const [now, setNow] = useState(systemClock)
  const [selected, setSelected] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [limit, setLimit] = useState('20')
  const lock = useRef(false), operation = useRef(crypto.randomUUID()), alive = useRef(true)
  const pending = useRef<ReviewCommand | null>(null)
  const area = useRef<HTMLElement>(null)
  const cards = snapshot?.packs.flatMap(p => p.cards).filter(c => c.deckId === deckId) ?? []
  const queue = snapshot ? reviewQueue(cards, snapshot.data, now, skipped) : null
  const card = cards.find(c => c.id === selected) ?? queue?.cards[0]
  const schedule = snapshot?.data.schedules.find(s => s.cardId === card?.id)
  const undo = snapshot && latestReview(snapshot.data)
  function receive(next: ReviewSnapshot, restoreCard?: string) {
    setSnapshot(next); setNow(systemClock()); setSelected(restoreCard ?? ''); setRevealed(false); setLimit(String(next.data.settings.newPerDay)); operation.current = crypto.randomUUID()
  }
  useEffect(() => {
    alive.current = true
    void gateway.read().then(next => { if (alive.current) { receive(next); area.current?.focus() } }).catch(() => { if (alive.current) setMessage('Không mở được lịch ôn. Hãy giữ dữ liệu và thử tải lại.') })
    return () => { alive.current = false }
  }, [gateway, deckId])
  async function run(command: ReviewCommand) {
    if (lock.current) return
    lock.current = true; setBusy(true); setMessage(''); pending.current = command
    try {
      const next = await gateway.execute(command)
      if (!alive.current) return
      pending.current = null
      const restored = command.type === 'undo' ? next.data.events.find(e => e.id === command.eventId)?.cardId : undefined
      if (restored) setSkipped(old => new Set([...old].filter(id => id !== restored)))
      receive(next, restored); setMessage(command.type === 'undo' ? 'Đã hoàn tác lịch ôn và lượt thẻ mới; lịch sử vẫn giữ dấu hoàn tác.' : command.type === 'rate' ? 'Đã lưu đánh giá.' : 'Đã lưu giới hạn thẻ mới.')
      area.current?.focus()
    } catch (error) {
      if (!alive.current) return
      setMessage(error instanceof ReviewConflict ? error.message : 'Chưa lưu được thao tác. Không ghi một phần lịch ôn/lịch sử. Kiểm tra dung lượng rồi thử lại.')
      try { const next = await gateway.read(); if (alive.current) receive(next) } catch { /* Keep previous snapshot for retry; it never authorizes a write. */ }
    } finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  function rate(rating: RecallRating) {
    if (!revealed || !card || !snapshot || lock.current) return
    void run({ type: 'rate', id: operation.current, cardId: card.id, contentRevision: card.revision, expectedRevision: schedule?.revision ?? 0, rating, settings: snapshot.data.settings })
  }
  return <section className="scheduled-review" aria-label="Ôn theo lịch" ref={area} tabIndex={-1} onKeyDown={e => {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.target instanceof HTMLElement && e.target.closest('input,textarea,select,button,a,[contenteditable=true]')) return
    if (e.code === 'Space' && !revealed && card && !busy) { e.preventDefault(); setRevealed(true) }
    const index = ['1', '2', '3', '4'].indexOf(e.key)
    if (revealed && index >= 0) { e.preventDefault(); rate(ratings[index]) }
  }}>
    <div className="study-heading"><h2>Ôn theo lịch</h2><button disabled={busy} onClick={onExit}>Trở về nội dung</button></div>
    {message && <p role="status">{message}</p>}
    {!snapshot && <p>Đang đọc lịch ôn trên thiết bị…</p>}
    {snapshot && queue && <>
      <p data-testid="review-counts">Đến hạn: {queue.due.length} · Mới: {queue.fresh.length} · Còn được học mới hôm nay: {queue.remaining}</p>
      <details><summary>Thiết lập ôn</summary><form onSubmit={e => { e.preventDefault(); void run({ type: 'settings', expectedGeneration: snapshot.generation, newPerDay: Number(limit) }) }}>
        <label>Thẻ mới mỗi ngày<input type="number" min="0" max="200" required value={limit} disabled={busy} onChange={e => setLimit(e.target.value)} /></label><button disabled={busy} type="submit">Lưu giới hạn</button>
        <p>Toàn thư viện: đã dùng {newCardsUsed(snapshot.data, now)} lượt mới hôm nay. Ngày học từ 00:00 theo {snapshot.data.settings.timeZone}; timezone này được lưu cố định. Mục tiêu retention 0,90 là tham số lập lịch, không phải điểm trí nhớ đo được.</p>
      </form></details>
      {card ? <article className="study-card" aria-label="Thẻ ôn hiện tại" key={`${card.id}-${schedule?.revision ?? 0}`}>
        <p className="eyebrow">TỰ NHỚ TRƯỚC KHI MỞ ĐÁP ÁN</p><Face face={card.front} />
        {revealed ? <><hr /><p className="eyebrow">ĐÁP ÁN</p><Face face={card.back} /><div className="review-ratings">{ratings.map((r, i) => <button key={r} disabled={busy} onClick={() => rate(r)} title={ratingHelp[r]}><strong>{i + 1} · {ratingLabels[r]}</strong><span>{ratingHelp[r]}</span></button>)}</div><p>Quên hoặc sai đáng kể: chọn Quên. Khó chỉ dùng khi đã nhớ đúng.</p></> : <button className="primary" disabled={busy} onClick={() => setRevealed(true)}>Mở đáp án</button>}
        {(card.front.image?.essential || card.back.image?.essential) && <p>Ảnh thiết yếu thiếu hoặc không tải được: hãy bỏ qua thẻ, không tính là quên.</p>}
        <button disabled={busy} onClick={() => { setSkipped(old => new Set([...old, card.id])); setSelected(''); setRevealed(false); operation.current = crypto.randomUUID() }}>Bỏ qua trong phiên</button>
      </article> : <p>Chưa có thẻ có thể ôn lúc này. Thẻ đang học sẽ trở lại khi đến hạn; giới hạn chỉ áp dụng thẻ mới.</p>}
      <div className="study-actions"><button disabled={busy || !undo} onClick={() => undo && void run({ type: 'undo', id: crypto.randomUUID(), eventId: undo.id })}>Hoàn tác lượt ôn</button><button disabled={busy} onClick={() => { setSkipped(new Set()); pending.current = null; void gateway.read().then(receive).catch(() => setMessage('Không tải lại được lịch ôn.')) }}>Cập nhật hàng đợi</button>{pending.current && <button disabled={busy} onClick={() => pending.current && void run(pending.current)}>Thử lại thao tác</button>}</div>
      <p className="study-note">Space: mở đáp án. Sau khi mở: 1 Quên · 2 Khó · 3 Nhớ · 4 Dễ. Phím tắt chỉ hoạt động khi focus ở vùng ôn, ngoài ô nhập và nút.</p>
    </>}
  </section>
}
