import { useEffect, useRef, useState } from 'react'
import { grade, randomSeed, type AttemptItem, type QuizAction, type QuizAttempt, type QuizCommand, type QuizGateway, type QuizSnapshot } from '../application/quiz'
import type { StudyPack } from '../application/study-pack'
import { QuizEditor } from './QuizEditor'

const modeName = { practice: 'Luyện tập', test: 'Kiểm tra' }
export function QuizArea({ packs, gateway, onChange, onDirty, selectedPackId, onSelectPack }: { selectedPackId: string; onSelectPack: (id: string) => void; packs: readonly StudyPack[]; gateway: QuizGateway; onChange: (packs: readonly StudyPack[]) => Promise<void>; onDirty: (dirty: boolean) => void }) {
  const [quizId, setQuizId] = useState(''), [editor, setEditor] = useState<{ id?: string } | null>(null)
  const [snapshot, setSnapshot] = useState<QuizSnapshot | null>(null), [attemptId, setAttemptId] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [shuffleQuestions, setShuffleQuestions] = useState(false), [shuffleChoices, setShuffleChoices] = useState(false)
  const lock = useRef(false), startId = useRef(crypto.randomUUID()), seed = useRef(randomSeed())
  const pack = packs.find(p => p.id === selectedPackId) ?? packs[0], quiz = pack?.quizzes?.find(q => q.id === quizId) ?? pack?.quizzes?.[0]
  const attempt = snapshot?.attempts.find(a => a.id === attemptId)
  useEffect(() => { onDirty(!!editor || busy); return () => onDirty(false) }, [editor, busy, onDirty])
  useEffect(() => { let alive = true; void gateway.read().then(s => { if (alive) { setSnapshot(s); setAttemptId(s.activeAttemptId ?? '') } }).catch(() => { if (alive) setError('Không đọc được lịch sử quiz. Hãy thử mở lại; chưa ghi dữ liệu.') }); return () => { alive = false } }, [gateway])
  async function execute(command: QuizCommand) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { const s = await gateway.execute(command); setSnapshot(s); setAttemptId(s.activeAttemptId ?? ''); if (command.type === 'start') { startId.current = crypto.randomUUID(); seed.current = randomSeed() } }
    catch (e) { setError(`Chưa lưu thao tác. ${(e as Error).message}`); try { setSnapshot(await gateway.read()) } catch { /* Preserve visible state; never claim the write succeeded. */ } }
    finally { lock.current = false; setBusy(false) }
  }
  async function save(next: StudyPack) {
    if (lock.current) throw new Error('Đang lưu nội dung.')
    lock.current = true; setBusy(true)
    try { await onChange(packs.map(p => p.id === next.id ? next : p)); setSnapshot(await gateway.read()) }
    finally { lock.current = false; setBusy(false) }
  }
  return <section className="quiz-area" aria-label="Quiz"><h2>Quiz</h2><p>Luyện tập có phản hồi từng câu. Kiểm tra chỉ hiện đáp án sau khi nộp toàn bài.</p>
    {error && <p role="alert">{error}</p>}
    {attempt ? <QuizRunner key={attempt.id} attempt={attempt} busy={busy} onAction={action => execute({ type: 'update', id: attempt.id, expectedRevision: attempt.revision, action })} onExit={() => void execute({ type: 'open', id: null })} /> : <>
      <label>Pack cho quiz<select value={pack?.id ?? ''} disabled={!!editor || busy} onChange={e => { onSelectPack(e.target.value); setQuizId('') }}>{!packs.length && <option value="">Chưa có pack</option>}{packs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      {!pack && <p>Tạo pack trước để thêm quiz.</p>}
      {pack && (editor ? <QuizEditor key={editor.id ?? 'new'} pack={pack} quiz={pack.quizzes?.find(q => q.id === editor.id)} busy={busy} onSave={save} onExit={() => setEditor(null)} /> : <>
        <button disabled={busy} onClick={() => setEditor({})}>Tạo quiz</button>
        <label>Chọn quiz<select disabled={busy} value={quiz?.id ?? ''} onChange={e => setQuizId(e.target.value)}>{!pack.quizzes?.length && <option value="">Chưa có quiz</option>}{pack.quizzes?.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}</select></label>
        {quiz && <><h3>{quiz.title}</h3><p>{quiz.description}</p><p>{quiz.questionIds.length} câu hỏi</p><button disabled={busy} onClick={() => setEditor({ id: quiz.id })}>Sửa nội dung quiz</button>
          <label className="study-check"><input type="checkbox" checked={shuffleQuestions} disabled={busy} onChange={e => setShuffleQuestions(e.target.checked)} />Xáo thứ tự câu hỏi</label><label className="study-check"><input type="checkbox" checked={shuffleChoices} disabled={busy} onChange={e => setShuffleChoices(e.target.checked)} />Xáo thứ tự lựa chọn</label>
          <div className="study-actions">{(['practice', 'test'] as const).map(mode => <button key={mode} disabled={busy || !snapshot || !quiz.questionIds.length} onClick={() => void execute({ type: 'start', id: startId.current, seed: seed.current, quizId: quiz.id, mode, shuffleQuestions, shuffleChoices })}>Bắt đầu {modeName[mode].toLowerCase()}</button>)}</div>
        </>}
      </>)}
      {!editor && <section aria-label="Lịch sử quiz"><h3>Lịch sử trên thiết bị</h3>{!snapshot ? <p>Đang đọc lịch sử…</p> : !snapshot.attempts.length ? <p>Chưa có lượt làm bài.</p> : <ul>{[...snapshot.attempts].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map(a => <li key={a.id}><strong>{a.title}</strong> · {modeName[a.mode]} · {new Date(a.completedAt ?? a.startedAt).toLocaleString()} · {a.result ? `${a.result.correct} / ${a.result.total}` : 'Đang làm'} <button disabled={busy} onClick={() => void execute({ type: 'open', id: a.id })}>{a.completedAt ? 'Xem lại kết quả' : 'Tiếp tục bài'}</button></li>)}</ul>}</section>}
    </>}
    <p className="study-note">Bài quiz và lịch sử chỉ lưu trên thiết bị. Không tạo đánh giá hoặc thay đổi lịch FSRS. Hãy xuất Personal Backup để giữ cả các lượt làm bài.</p>
  </section>
}
function QuizRunner({ attempt, busy, onAction, onExit }: { attempt: QuizAttempt; busy: boolean; onAction: (action: QuizAction) => Promise<void>; onExit: () => void }) {
  const [confirm, setConfirm] = useState(false), [reviewIndex, setReviewIndex] = useState(attempt.current)
  const index = attempt.completedAt ? reviewIndex : attempt.current, item = attempt.items[index], summary = grade(attempt.items), completed = !!attempt.completedAt
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [index, completed])
  function navigate(index: number) { if (completed) setReviewIndex(index); else void onAction({ type: 'navigate', index }) }
  return <section aria-label="Lượt làm quiz"><div className="study-heading"><h3>{attempt.title}</h3><button disabled={busy} onClick={onExit}>Về danh sách quiz</button></div><p>{modeName[attempt.mode]} · Câu {index + 1} / {attempt.items.length} · {busy ? 'Đang lưu…' : 'Đã lưu trên thiết bị'}</p>
    {attempt.result && <section aria-label="Kết quả quiz"><h3>Kết quả lượt này: {attempt.result.correct} / {attempt.result.total}{attempt.result.total ? ` (${Math.round(100 * attempt.result.correct / attempt.result.total)}%)` : ' — không có câu đủ dữ liệu để chấm'}</h3><p>Đã trả lời: {attempt.result.answered} · Chưa trả lời: {attempt.result.unanswered} · Loại do ảnh không khả dụng: {attempt.result.excluded}</p><p>Điểm = số câu đúng / số câu có thể chấm; câu chưa trả lời tính sai. Đây chỉ là kết quả của lượt này.</p></section>}
    <h4 ref={heading} tabIndex={-1}>Câu {index + 1}{item.flagged ? ' — đã đánh dấu' : ''}</h4>
    <QuestionView key={`${attempt.id}-${index}`} item={item} reveal={completed || item.submitted} completed={completed} busy={busy} mode={attempt.mode} onAction={onAction} />
    <div className="study-actions"><button disabled={busy || index === 0} onClick={() => navigate(index - 1)}>Câu trước</button><button disabled={busy || index === attempt.items.length - 1} onClick={() => navigate(index + 1)}>Câu tiếp theo</button>{!completed && <button disabled={busy} onClick={() => void onAction({ type: 'flag' })}>{item.flagged ? 'Bỏ đánh dấu câu' : 'Đánh dấu câu'}</button>}</div>
    <label>Đi đến câu<select value={index} disabled={busy} onChange={e => navigate(Number(e.target.value))}>{attempt.items.map((i, n) => <option key={i.question.id} value={n}>Câu {n + 1}{i.flagged ? ' — đánh dấu' : ''}{i.unavailable ? ' — ảnh không khả dụng' : i.selectedChoiceId ? ' — đã chọn' : ' — chưa trả lời'}</option>)}</select></label>
    {!completed && <button disabled={busy} onClick={() => setConfirm(true)}>Nộp toàn bài</button>}
    {confirm && !completed && <section role="dialog" aria-modal="false" aria-label="Xác nhận nộp quiz"><h3>Nộp bài và chốt kết quả?</h3><p>Còn {summary.unanswered} câu chưa trả lời; trong chế độ Kiểm tra, các câu này sẽ tính sai. {summary.excluded} câu đã được loại do ảnh không khả dụng. Sau khi nộp không thể sửa đáp án.</p><button autoFocus disabled={busy} onClick={() => setConfirm(false)}>Quay lại làm bài</button><button disabled={busy} onClick={() => { void onAction({ type: 'finish' }); setConfirm(false) }}>Xác nhận nộp bài</button></section>}
  </section>
}
function QuestionView({ item, reveal, completed, busy, mode, onAction }: { item: AttemptItem; reveal: boolean; completed: boolean; busy: boolean; mode: 'practice' | 'test'; onAction: (action: QuizAction) => Promise<void> }) {
  const [load, setLoad] = useState(false), [imageState, setImageState] = useState<'idle' | 'ready' | 'failed'>('idle')
  const q = item.question, locked = completed || item.submitted || item.unavailable, mediaBlocked = !!q.image?.essential && (imageState !== 'ready' || !item.mediaReady)
  return <article className="study-card" aria-label="Câu quiz"><p className="card-content">{q.prompt}</p>
    {q.image && <figure className="study-image">{load && imageState !== 'failed' ? <img src={q.image.url} alt={q.image.alt} crossOrigin="anonymous" referrerPolicy="no-referrer" onLoad={() => { setImageState('ready'); if (!locked && !item.mediaReady) void onAction({ type: 'media', ready: true }) }} onError={() => { setImageState('failed'); if (!locked && item.mediaReady && q.image?.essential) void onAction({ type: 'media', ready: false }) }} /> : <p>{q.image.alt}</p>}{q.image.caption && <figcaption>{q.image.caption}</figcaption>}
      {!load && <><p>Ảnh từ {new URL(q.image.url).hostname}; chỉ tải khi bạn chọn. Máy chủ ảnh nhận địa chỉ IP.</p><button disabled={busy} onClick={() => setLoad(true)}>Tải ảnh câu hỏi</button></>}
      {imageState === 'ready' && q.image.essential && !item.mediaReady && !locked && <button disabled={busy} onClick={() => void onAction({ type: 'media', ready: true })}>Xác nhận dùng ảnh đã tải</button>}
      {imageState === 'failed' && <p role="status">Không tải được ảnh. {q.image.essential ? 'Hãy đánh dấu không khả dụng để loại câu này khỏi điểm.' : 'Có thể tiếp tục với phần chữ.'}</p>}
      {q.image.essential && !locked && <><p>Ảnh thiết yếu: cần tải thành công trước khi trả lời.</p><button disabled={busy} onClick={() => void onAction({ type: 'unavailable' })}>Đánh dấu ảnh không khả dụng</button></>}
    </figure>}
    {item.unavailable && <p role="status">Câu không khả dụng do ảnh thiết yếu; loại khỏi mẫu số, không tính sai.</p>}
    <fieldset disabled={busy || locked || mediaBlocked}><legend>Chọn một đáp án</legend>{item.choiceOrder.map(key => { const choice = q.choices.find(c => c.id === key)!; return <label className="quiz-choice" key={key}><input type="radio" name={`answer-${q.id}`} value={key} checked={item.selectedChoiceId === key} onChange={() => void onAction({ type: 'select', choiceId: key })} /><span>{choice.text}{reveal && !item.unavailable && key === q.correctChoiceId && <strong> — Đáp án đúng</strong>}{reveal && !item.unavailable && key === item.selectedChoiceId && key !== q.correctChoiceId && <strong> — Bạn chọn sai</strong>}</span></label> })}</fieldset>
    {reveal && !item.unavailable && <div role="status"><p>{item.selectedChoiceId === q.correctChoiceId ? 'Đúng' : item.selectedChoiceId === null ? 'Chưa trả lời — tính sai' : 'Sai'}</p>{q.explanation && <p className="card-content">Giải thích: {q.explanation}</p>}</div>}
    {!locked && mode === 'practice' && <button disabled={busy || item.selectedChoiceId === null || mediaBlocked} onClick={() => void onAction({ type: 'answer' })}>Kiểm tra câu trả lời</button>}
    {!locked && mode === 'test' && <button disabled={busy || item.selectedChoiceId === null} onClick={() => void onAction({ type: 'select', choiceId: null })}>Bỏ chọn đáp án</button>}
  </article>
}
