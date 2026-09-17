import { currentText, type TextDocument } from './document'
import { defaultSettings, segment, type ReaderSettings } from '../domain/reader'
import type { StudyPack } from './study-pack'

export interface Preferences { reader: ReaderSettings; glow: boolean; progress: boolean; fontSize: number }
export const defaultPreferences: Preferences = { reader: defaultSettings, glow: true, progress: true, fontSize: 48 }
export interface ReadingPosition { documentId: string; revisionId: string; offset: number; settings: ReaderSettings; updatedAt: string }
export interface Draft { documentId: string | null; text: string }
export interface LibraryData {
  packs: readonly StudyPack[]
  documents: readonly TextDocument[]
  positions: readonly ReadingPosition[]
  preferences: Preferences
  activeDocumentId: string | null
  draft: Draft | null
}
export const emptyLibrary = (): LibraryData => ({ packs: [], documents: [], positions: [], preferences: structuredClone(defaultPreferences), activeDocumentId: null, draft: null })
export interface StoredLibrary { data: LibraryData; generation: number }
export interface ReaderStorage {
  read(): Promise<StoredLibrary>
  save(data: LibraryData, expectedGeneration: number): Promise<number>
  close(): void
}
export function resumePosition(doc: TextDocument, position?: ReadingPosition) {
  const revision = doc.revisions[doc.revision]
  if (!position) return { offset: 0, warning: '' }
  const valid = position.revisionId === revision.id && segment(currentText(doc), position.settings).some(c => c.start === position.offset)
  if (position.offset === 0 && !currentText(doc).trim() && position.revisionId === revision.id) return { offset: 0, warning: '' }
  return valid ? { offset: position.offset, warning: '' } : { offset: 0, warning: 'Vị trí cũ không còn khớp bản sửa. Đã về đầu để tránh đọc nhầm.' }
}

/** Serial saves with a bounded checkpoint interval, not a trailing debounce that
 * can starve during continuous playback. Errors retain the latest memory state. */
export class Persistence {
  private generation = 0
  private data = emptyLibrary()
  private pending = false
  private timer?: ReturnType<typeof setTimeout>
  private running?: Promise<boolean>
  private blocked = false
  private loadFailed = false
  constructor(private storage: ReaderStorage, private report: (status: 'saving' | 'saved' | 'error', message?: string) => void) {}
  async open() {
    try { const saved = await this.storage.read(); this.generation = saved.generation; this.data = saved.data; return saved.data }
    catch { this.blocked = true; this.loadFailed = true; this.report('error', 'Không mở được dữ liệu cục bộ. Phiên vẫn dùng trong bộ nhớ; hãy xuất sao lưu trước khi đóng. Không tự ghi đè kho dữ liệu.'); return this.data }
  }
  update(data: LibraryData, immediate = false) {
    this.data = data; this.pending = true
    if (this.blocked) return
    this.report('saving')
    if (immediate) { void this.flush(); return }
    if (!this.timer) this.timer = setTimeout(() => { this.timer = undefined; void this.flush() }, 1000)
  }
  flush(): Promise<boolean> {
    clearTimeout(this.timer); this.timer = undefined
    if (this.blocked) return Promise.resolve(false)
    // An immediate update can arrive after drain finishes but before its promise
    // clears. Chain another drain instead of leaving that update without a timer.
    if (this.running) return this.running.then(success => success && this.pending ? this.flush() : success)
    this.running = this.drain().finally(() => { this.running = undefined })
    return this.running
  }
  private async drain() {
    while (this.pending) {
      const snapshot = this.data; this.pending = false
      try { this.generation = await this.storage.save(snapshot, this.generation) }
      catch { this.pending = true; this.blocked = true; this.report('error', 'Chưa lưu được: kho đầy, lỗi lưu trữ hoặc dữ liệu đã đổi ở tab khác. Phiên được giữ trong bộ nhớ. Xuất sao lưu trước khi tải lại; không ghi đè thay đổi của tab khác.'); return false }
    }
    this.report('saved'); return true
  }
  async retry() { if (this.loadFailed) { this.report('error', 'Không đọc được kho dữ liệu ban đầu. Hãy xuất sao lưu phiên rồi tải lại để thử mở kho; chưa ghi thay đổi.'); return false }; this.blocked = false; return this.flush() }
  async restore(data: LibraryData) {
    if (!await this.flush()) throw new Error('Cần giải quyết lỗi lưu trữ trước khi khôi phục. Hãy xuất sao lưu phiên hiện tại.')
    // Publish the restored memory state only after the atomic transaction commits.
    const generation = await this.storage.save(data, this.generation)
    this.generation = generation; this.data = data; this.report('saved')
  }
  dispose() { clearTimeout(this.timer); this.storage.close() }
}
