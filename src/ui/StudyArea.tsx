import { Face } from './StudyFace'
import { ReviewPanel } from './ReviewPanel'
import type { ReviewGateway } from '../application/review'
import { useEffect, useRef, useState } from 'react'
import { addDeck, createPack, deleteCard, exportStudyPack, MAX_PACK_BYTES, mergeStudyPacks, parseStudyPack, saveCard, type CardFace, type CardImage, type Flashcard, type StudyPack } from '../application/study-pack'

function FaceEditor({ title, value, onChange }: { title: string; value: CardFace; onChange: (value: CardFace) => void }) {
  const image = value.image
  function changeImage(change: Partial<CardImage>) { onChange({ ...value, image: { url: '', alt: '', ...image, ...change } }) }
  return <fieldset><legend>{title}</legend>
    <label>{title} — chữ<textarea aria-label={`${title} — chữ`} value={value.text} maxLength={10_000} onChange={e => onChange({ ...value, text: e.target.value })} /></label>
    <label>{title} — URL ảnh HTTPS<input type="url" value={image?.url ?? ''} maxLength={2048} placeholder="https://… (tùy chọn)" onChange={e => e.target.value ? changeImage({ url: e.target.value }) : onChange({ text: value.text })} /></label>
    {image && <><label>{title} — mô tả ảnh<input value={image.alt} maxLength={1000} onChange={e => changeImage({ alt: e.target.value })} /></label>
      <label>{title} — chú thích<input value={image.caption ?? ''} maxLength={2000} onChange={e => changeImage({ caption: e.target.value })} /></label>
      <label className="study-check"><input type="checkbox" checked={image.essential ?? false} onChange={e => changeImage({ essential: e.target.checked })} />{title} — ảnh thiết yếu</label>
      <button type="button" onClick={() => onChange({ text: value.text })}>Bỏ ảnh {title.toLowerCase()}</button></>}
  </fieldset>
}
function CardEditor({ pack, card, deckId, onSave, onCancel, busy }: { pack: StudyPack; card?: Flashcard; deckId: string; onSave: (next: StudyPack) => Promise<void>; onCancel: () => void; busy: boolean }) {
  const [front, setFront] = useState<CardFace>(card?.front ?? { text: '' })
  const [back, setBack] = useState<CardFace>(card?.back ?? { text: '' })
  const [deck, setDeck] = useState(card?.deckId ?? deckId)
  const [tags, setTags] = useState(card?.tags?.join(', ') ?? '')
  const [source, setSource] = useState(card?.source ?? '')
  const [error, setError] = useState('')
  return <form aria-label="Biên tập thẻ" onSubmit={e => { e.preventDefault(); void (async () => { try { setError(''); await onSave(saveCard(pack, { deckId: deck, front, back, tags: tags.split(',').map(t => t.trim()).filter(Boolean), source }, card?.id)) } catch (error) { setError((error as Error).message) } })() }}>
    <h2>{card ? 'Sửa thẻ' : 'Thẻ mới'}</h2><p>Biên tập hai mặt. Khi học, đáp án luôn được che trước.</p>
    <fieldset disabled={busy} className="study-form-fields">
      <label>Bộ thẻ của thẻ<select aria-label="Bộ thẻ của thẻ" value={deck} onChange={e => setDeck(e.target.value)}>{pack.decks.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
      <div className="study-faces"><FaceEditor title="Mặt trước" value={front} onChange={setFront} /><FaceEditor title="Mặt sau" value={back} onChange={setBack} /></div>
      <label>Nhãn (cách nhau bằng dấu phẩy)<input value={tags} onChange={e => setTags(e.target.value)} maxLength={1300} /></label>
      <label>Nguồn / tham chiếu<input value={source} onChange={e => setSource(e.target.value)} maxLength={1000} /></label>
      {error && <p role="alert">{error}</p>}<div className="study-actions"><button className="primary" type="submit">Lưu thẻ</button><button type="button" onClick={onCancel}>Hủy sửa thẻ</button></div>
    </fieldset>
  </form>
}

export function StudyArea({ packs, onChange, onDirty, reviewGateway }: { reviewGateway: ReviewGateway; packs: readonly StudyPack[]; onChange: (packs: readonly StudyPack[]) => Promise<void>; onDirty: (dirty: boolean) => void }) {
  const [reviewing, setReviewing] = useState(false)
  const [selected, setSelected] = useState('')
  const [deckId, setDeckId] = useState('')
  const [newPack, setNewPack] = useState(false)
  const [packTitle, setPackTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deckTitle, setDeckTitle] = useState('')
  const [editor, setEditor] = useState<{ id?: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [json, setJson] = useState('')
  const [preview, setPreview] = useState<StudyPack | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const fileReadId = useRef(0)
  const [cardId, setCardId] = useState('')
  const [revealed, setRevealed] = useState(false)
  const pack = packs.find(p => p.id === selected) ?? packs[0]
  const decks = [...pack?.decks ?? []].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const deck = decks.find(d => d.id === deckId) ?? decks[0]
  const cards = (pack?.cards.filter(c => c.deckId === deck?.id) ?? []).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const card = cards.find(c => c.id === cardId) ?? cards[0]
  const conflict = preview ? mergeStudyPacks(packs, [preview]) : null
  const dirty = !!editor || newPack || !!deckTitle || importing
  useEffect(() => {
    onDirty(dirty)
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    if (dirty) window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, onDirty])
  useEffect(() => () => { fileReadId.current++ }, [])
  async function commit(next: readonly StudyPack[]) {
    if (lock.current) throw new Error('Đang lưu, vui lòng chờ.')
    lock.current = true; setBusy(true); setError(''); setMessage('')
    try { await onChange(next); setMessage('Đã lưu nội dung trên thiết bị.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function replace(next: StudyPack) { await commit(packs.map(p => p.id === next.id ? next : p)) }
  function resetStudy() { setCardId(''); setRevealed(false) }
  function report(action: () => Promise<void>) { void action().catch(e => setError((e as Error).message)) }
  function exportPack() {
    if (!pack) return
    try {
      const url = URL.createObjectURL(new Blob([exportStudyPack(pack)], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = `oneword-study-pack-${pack.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('Đã xuất Study Pack: chỉ nội dung, không vị trí đọc hoặc thiết lập cá nhân.')
    } catch (e) { setError((e as Error).message) }
  }
  function parse(value: string) { setError(''); setPreview(null); try { setPreview(parseStudyPack(value)) } catch (e) { setError((e as Error).message) } }
  async function readFile(file?: File) {
    if (!file) return
    const request = ++fileReadId.current
    setPreview(null); setError('')
    try {
      if (file.size > MAX_PACK_BYTES) throw new Error('Study Pack vượt giới hạn 8 MiB.')
      const value = await file.text()
      if (request !== fileReadId.current) return
      setJson(value); parse(value)
    } catch (e) { if (request === fileReadId.current) setError((e as Error).message) }
  }
  return <main id="study" className="study-area">
    <div className="study-heading"><div><p className="eyebrow">NỘI DUNG HỌC</p><h1>Học với thẻ</h1><p>Tạo nội dung, tự nhớ rồi mở đáp án. Chọn ôn theo lịch khi bạn sẵn sàng.</p></div>
      <div className="study-actions"><button disabled={dirty || busy || reviewing} onClick={() => { setNewPack(true); setError(''); setMessage('') }}>Tạo pack</button><button disabled={dirty || busy || reviewing} onClick={() => { setImporting(true); setError(''); setMessage('') }}>Nhập Study Pack</button><button disabled={!pack || dirty || busy || reviewing} onClick={exportPack}>Xuất Study Pack</button></div></div>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="error">{error}</p>}
    {newPack && <form aria-label="Tạo pack" onSubmit={e => { e.preventDefault(); report(async () => { const next = createPack(packTitle, description); await commit([...packs, next]); setSelected(next.id); setNewPack(false); setPackTitle(''); setDescription(''); resetStudy() }) }}><label>Tên pack<input autoFocus required maxLength={120} value={packTitle} disabled={busy} onChange={e => setPackTitle(e.target.value)} /></label><label>Mô tả pack<textarea aria-label="Mô tả pack" maxLength={2000} value={description} disabled={busy} onChange={e => setDescription(e.target.value)} /></label><div className="study-actions"><button disabled={busy} type="submit">Lưu pack mới</button><button disabled={busy} type="button" onClick={() => { setNewPack(false); setPackTitle(''); setDescription('') }}>Hủy tạo pack</button></div></form>}
    {importing && <section className="study-import" aria-label="Nhập Study Pack">
      <h2>Nhập nội dung Study Pack</h2><p>Chọn JSON hoặc dán nội dung. Ảnh chưa được tải; xác nhận sau khi kiểm tra.</p>
      <label>Chọn tệp Study Pack<input type="file" accept=".json,application/json" disabled={busy} onChange={e => { void readFile(e.target.files?.[0]); e.target.value = '' }} /></label>
      <label>JSON Study Pack<textarea aria-label="JSON Study Pack" value={json} disabled={busy} onChange={e => { fileReadId.current++; setJson(e.target.value); setPreview(null) }} /></label>
      <div className="study-actions"><button disabled={busy} onClick={() => { fileReadId.current++; parse(json) }}>Kiểm tra và xem trước</button><button disabled={busy} onClick={() => { fileReadId.current++; setImporting(false); setPreview(null); setJson(''); setError('') }}>Hủy nhập Study Pack</button></div>
      {preview && conflict && <section className="study-import-preview" aria-label="Xem trước Study Pack"><h3>{preview.title}</h3><p>{preview.description}</p><p>{preview.decks.length} bộ thẻ · {preview.cards.length} thẻ · {conflict.added} pack mới · {conflict.duplicates} pack đã có.</p>
        <ul>{preview.decks.map(d => <li key={d.id}>{d.title}: {preview.cards.filter(c => c.deckId === d.id).length} thẻ</li>)}</ul>
        {preview.cards[0] && <details><summary>Nội dung thẻ mẫu (hai mặt)</summary><p className="card-content">{preview.cards[0].front.text}</p><p className="card-content">{preview.cards[0].back.text}</p><p>Ảnh là tham chiếu, không tải trong preview import.</p></details>}
        {conflict.conflicts.map(message => <p role="alert" key={message}>{message}</p>)}
        <button disabled={busy || !!conflict.conflicts.length} onClick={() => report(async () => {
          const checked = mergeStudyPacks(packs, [preview])
          if (checked.conflicts.length) throw new Error(checked.conflicts.join(' '))
          if (checked.added) await commit(checked.packs)
          setSelected(preview.id); setImporting(false); setPreview(null); setJson(''); resetStudy(); setMessage(checked.added ? 'Đã nhập Study Pack.' : 'Pack trùng hoàn toàn: đã bỏ qua, không ghi đè.')
        })}>Xác nhận nhập Study Pack</button></section>}
    </section>}
    {!newPack && !importing && <div className="study-workspace">
      <aside aria-label="Thư viện học"><h2>Packs</h2>{!packs.length && <p>Chưa có nội dung. Tạo pack hoặc nhập Study Pack để bắt đầu.</p>}
        <label>Chọn pack<select aria-label="Chọn pack" disabled={reviewing || !!editor || busy || !!deckTitle} value={pack?.id ?? ''} onChange={e => { setSelected(e.target.value); setDeckId(''); resetStudy(); setError('') }}>{!packs.length && <option value="">Chưa có pack</option>}{packs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        {pack && <><p>{pack.description}</p>{pack.author && <p>Tác giả: {pack.author}</p>}{pack.source && <p>Nguồn: {pack.source}</p>}
          <label>Chọn bộ thẻ<select aria-label="Chọn bộ thẻ" disabled={reviewing || !!editor || busy} value={deck?.id ?? ''} onChange={e => { setDeckId(e.target.value); resetStudy() }}>{!decks.length && <option value="">Chưa có bộ thẻ</option>}{decks.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
          <form aria-label="Tạo bộ thẻ" onSubmit={e => { e.preventDefault(); report(async () => { const next = addDeck(pack, deckTitle); await replace(next); setDeckId(next.decks.find(d => !pack.decks.some(old => old.id === d.id))!.id); setDeckTitle(''); resetStudy() }) }}><label>Tên bộ thẻ mới<input value={deckTitle} maxLength={120} required disabled={reviewing || !!editor || busy} onChange={e => setDeckTitle(e.target.value)} /></label><button disabled={reviewing || !!editor || busy} type="submit">Tạo bộ thẻ</button></form>
          <button disabled={dirty || busy || reviewing} onClick={() => { if (window.confirm(`Xóa pack “${pack.title}” cùng ${pack.cards.length} thẻ? Lịch ôn hiện tại của các thẻ sẽ bị xóa, lịch sử lượt ôn vẫn giữ. Hãy xuất sao lưu trước nếu cần giữ bản sao.`)) report(async () => { await commit(packs.filter(p => p.id !== pack.id)); setSelected(''); setDeckId(''); resetStudy() }) }}>Xóa pack</button></>}
      </aside>
      <section className="study-detail" aria-label="Nội dung bộ thẻ">
        {pack && deck && <>{reviewing ? <ReviewPanel gateway={reviewGateway} deckId={deck.id} onExit={() => setReviewing(false)} /> : <>{!editor && <><div className="study-heading"><h2>{deck.title}</h2><button disabled={busy || !!deckTitle} onClick={() => setReviewing(true)}>Ôn theo lịch</button><button disabled={busy || !!deckTitle} onClick={() => { setEditor({}); setRevealed(false); setError('') }}>Tạo thẻ</button></div>{deck.description && <p>{deck.description}</p>}
          {!cards.length && <p>Bộ thẻ chưa có thẻ. Tạo thẻ đầu tiên bằng chữ hoặc URL ảnh.</p>}
          {card && <><label>Chọn thẻ<select aria-label="Chọn thẻ" value={card.id} disabled={busy} onChange={e => { setCardId(e.target.value); setRevealed(false) }}>{cards.map((c, i) => <option key={c.id} value={c.id}>{i + 1}. {c.front.text.slice(0, 60) || c.front.image?.alt}</option>)}</select></label>
            <article className="study-card" aria-label="Thẻ đang học" key={`${card.id}-${card.revision}`}><p className="eyebrow">{revealed ? 'ĐÁP ÁN' : 'TỰ NHỚ TRƯỚC KHI MỞ ĐÁP ÁN'}</p><Face key={revealed ? 'back' : 'front'} face={revealed ? card.back : card.front} />
              <div className="study-actions">{!revealed && <button className="primary" onClick={() => setRevealed(true)}>Xem đáp án</button>}<button onClick={() => { setCardId(cards[(cards.findIndex(c => c.id === card.id) + 1) % cards.length].id); setRevealed(false) }}>Thẻ tiếp theo</button></div>
            </article>
            {card.tags?.length ? <p>Nhãn: {card.tags.join(', ')}</p> : null}{card.source && <p>Nguồn: {card.source}</p>}
            <div className="study-actions"><button disabled={busy || !!deckTitle} onClick={() => { setEditor({ id: card.id }); setRevealed(false) }}>Sửa thẻ</button><button disabled={busy || !!deckTitle} onClick={() => { if (window.confirm('Xóa thẻ này? Nội dung và lịch ôn hiện tại của thẻ sẽ bị xóa. Lịch sử lượt ôn vẫn được giữ.')) report(async () => { await replace(deleteCard(pack, card.id)); resetStudy() }) }}>Xóa thẻ</button></div>
          </>}</>}
          {editor && <CardEditor key={editor.id ?? 'new'} pack={pack} card={pack.cards.find(c => c.id === editor.id)} deckId={deck.id} busy={busy} onCancel={() => setEditor(null)} onSave={async next => { await replace(next); setEditor(null); resetStudy() }} />}
        </>}</>}
      </section>
    </div>}
    <p className="study-note">Study Pack chỉ chứa nội dung chia sẻ. Personal Backup giữ cả dữ liệu đọc và thư viện học. Ảnh ngoài chỉ tải từng ảnh khi bạn chọn, không upload/proxy hay lưu media vào IndexedDB.</p>
  </main>
}
