import { useState } from 'react'
import { deleteQuestion, saveQuestion, saveQuiz, type Quiz, type QuizQuestion } from '../application/quiz-content'
import { updatePack, type StudyPack } from '../application/study-pack'

export function QuizEditor({ pack, quiz, onSave, onExit, busy }: { pack: StudyPack; quiz?: Quiz; onSave: (pack: StudyPack) => Promise<void>; onExit: () => void; busy: boolean }) {
  const [title, setTitle] = useState(quiz?.title ?? ''), [description, setDescription] = useState(quiz?.description ?? '')
  const [question, setQuestion] = useState<QuizQuestion | null>(null), [message, setMessage] = useState('')
  async function save(next: StudyPack) { setMessage(''); try { await onSave(next); return true } catch (error) { setMessage((error as Error).message); return false } }
  function report(action: () => Promise<void>) { void action().catch(e => setMessage((e as Error).message)) }
  return <section aria-label="Soạn quiz"><h2>{quiz ? 'Sửa quiz' : 'Tạo quiz'}</h2>{message && <p role="alert">{message}</p>}
    {!question && <>
      <form onSubmit={e => { e.preventDefault(); report(async () => { if (await save(saveQuiz(pack, title, description, quiz?.id))) onExit() }) }}>
        <fieldset disabled={busy}><label>Tên quiz<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label><label>Mô tả quiz<textarea maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} /></label><button type="submit">Lưu quiz</button></fieldset>
      </form>
      {quiz && <><h3>Câu hỏi theo thứ tự</h3><ol>{quiz.questionIds.map((key, index) => { const q = pack.questions!.find(q => q.id === key)!; return <li key={key}><p>{q.prompt || q.image?.alt}</p><div className="study-actions"><button disabled={busy} onClick={() => setQuestion(q)}>Sửa câu {index + 1}</button><button disabled={busy || index === 0} onClick={() => report(async () => { const ids = [...quiz.questionIds]; [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; await save(updatePack(pack, { quizzes: pack.quizzes!.map(q => q.id === quiz.id ? { ...q, questionIds: ids } : q) })) })}>Đưa câu {index + 1} lên</button><button disabled={busy} onClick={() => { if (window.confirm('Xóa câu hỏi khỏi nội dung? Lượt làm bài đã lưu vẫn giữ bản chụp cũ.')) report(async () => { await save(deleteQuestion(pack, key)) }) }}>Xóa câu {index + 1}</button></div></li> })}</ol>
        <button disabled={busy} onClick={() => { const choices = [0, 1].map(() => ({ id: crypto.randomUUID(), text: '' })); setQuestion({ id: crypto.randomUUID(), revision: 1, prompt: '', choices, correctChoiceId: choices[0].id, explanation: '' }) }}>Thêm câu hỏi</button></>}
      <button disabled={busy} onClick={onExit}>Đóng trình soạn</button>
    </>}
    {question && quiz && <QuestionEditor key={question.id} question={question} busy={busy} onCancel={() => setQuestion(null)} onSave={async q => { if (await save(saveQuestion(pack, quiz.id, q))) setQuestion(null) }} />}
    <p>Thay đổi nội dung không sửa bản chụp trong các lượt làm bài cũ. Lưu tên/mô tả trước khi soạn câu hỏi.</p>
  </section>
}
function QuestionEditor({ question, onSave, onCancel, busy }: { question: QuizQuestion; onSave: (question: QuizQuestion) => Promise<void>; onCancel: () => void; busy: boolean }) {
  const [value, setValue] = useState(question), [error, setError] = useState('')
  return <form aria-label="Soạn câu hỏi" onSubmit={e => { e.preventDefault(); setError(''); void onSave(value).catch(e => setError((e as Error).message)) }}><fieldset disabled={busy}>
    <label>Câu hỏi<textarea required maxLength={10000} value={value.prompt} onChange={e => setValue({ ...value, prompt: e.target.value })} /></label>
    <fieldset><legend>Lựa chọn — chọn một đáp án đúng</legend>{value.choices.map((choice, index) => <div className="quiz-choice-editor" key={choice.id}><label><input type="radio" name="correct" checked={value.correctChoiceId === choice.id} onChange={() => setValue({ ...value, correctChoiceId: choice.id })} />Đáp án đúng {index + 1}</label><label>Lựa chọn {index + 1}<input required maxLength={2000} value={choice.text} onChange={e => setValue({ ...value, choices: value.choices.map(c => c.id === choice.id ? { ...c, text: e.target.value } : c) })} /></label><button type="button" disabled={value.choices.length <= 2} onClick={() => { const choices = value.choices.filter(c => c.id !== choice.id); setValue({ ...value, choices, correctChoiceId: value.correctChoiceId === choice.id ? choices[0].id : value.correctChoiceId }) }}>Bỏ lựa chọn {index + 1}</button></div>)}
      <button type="button" disabled={value.choices.length >= 6} onClick={() => setValue({ ...value, choices: [...value.choices, { id: crypto.randomUUID(), text: '' }] })}>Thêm lựa chọn</button>
    </fieldset>
    <label>Giải thích<textarea maxLength={10000} value={value.explanation ?? ''} onChange={e => setValue({ ...value, explanation: e.target.value })} /></label>
    <label>URL ảnh câu hỏi HTTPS<input type="url" maxLength={2048} value={value.image?.url ?? ''} onChange={e => setValue({ ...value, image: e.target.value ? { alt: '', ...value.image, url: e.target.value } : undefined })} /></label>
    {value.image && <><label>Mô tả ảnh câu hỏi<input required maxLength={1000} value={value.image.alt} onChange={e => setValue({ ...value, image: { ...value.image!, alt: e.target.value } })} /></label><label className="study-check"><input type="checkbox" checked={!!value.image.essential} onChange={e => setValue({ ...value, image: { ...value.image!, essential: e.target.checked } })} />Ảnh thiết yếu cho câu hỏi</label></>}
    {error && <p role="alert">{error}</p>}<div className="study-actions"><button type="submit">Lưu câu hỏi</button><button type="button" onClick={onCancel}>Hủy sửa câu hỏi</button></div>
  </fieldset></form>
}
