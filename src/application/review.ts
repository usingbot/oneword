import type { Flashcard, StudyPack } from './study-pack'

export const SCHEDULER_ID = 'ts-fsrs@5.4.2/oneword-v1'
export type RecallRating = 'again' | 'hard' | 'good' | 'easy'
export const ratings: readonly RecallRating[] = ['again', 'hard', 'good', 'easy']
export const ratingLabels = { again: 'Quên', hard: 'Khó', good: 'Nhớ', easy: 'Dễ' }
export const ratingHelp = { again: 'Không nhớ hoặc trả lời sai.', hard: 'Nhớ đúng nhưng rất khó khăn.', good: 'Nhớ đúng với mức cố gắng bình thường.', easy: 'Nhớ đúng gần như ngay lập tức.' }
export interface SchedulerState {
  state: 'learning' | 'review' | 'relearning'
  due: string
  lastReview: string
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
}
// null state is a new card restored by undo; revision stays monotonic (no ABA).
export interface CardSchedule { cardId: string; revision: number; state: SchedulerState | null; lastEventId: string | null }
export interface ReviewSettings { newPerDay: number; timeZone: string; desiredRetention: 0.9; scheduler: typeof SCHEDULER_ID }
export interface ReviewEvent {
  id: string; cardId: string; rating: RecallRating; reviewedAt: string; studyDay: string; contentRevision: number
  before: CardSchedule | null; after: CardSchedule; settings: ReviewSettings; sequence: number
}
export interface ReviewUndo { id: string; eventId: string; undoneAt: string; sequence: number; after: CardSchedule }
export interface ReviewData { settings: ReviewSettings; schedules: readonly CardSchedule[]; events: readonly ReviewEvent[]; undos: readonly ReviewUndo[] }
export interface ReviewSnapshot { data: ReviewData; generation: number; packs: readonly StudyPack[] }
export type ReviewCommand =
  | { type: 'rate'; id: string; cardId: string; contentRevision: number; expectedRevision: number; rating: RecallRating; settings: ReviewSettings }
  | { type: 'undo'; id: string; eventId: string }
  | { type: 'settings'; expectedGeneration: number; newPerDay: number }
export interface ReviewGateway { read(): Promise<ReviewSnapshot>; execute(command: ReviewCommand): Promise<ReviewSnapshot> }
export class ReviewConflict extends Error {}
export const systemClock = () => new Date()
export function emptyReview(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'): ReviewData {
  return { settings: { newPerDay: 20, timeZone, desiredRetention: 0.9, scheduler: SCHEDULER_ID }, schedules: [], events: [], undos: [] }
}
const dayFormatters = new Map<string, Intl.DateTimeFormat>()
export function dayFormatter(timeZone: string) {
  let formatter = dayFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    if (dayFormatters.size >= 16) dayFormatters.delete(dayFormatters.keys().next().value!)
    dayFormatters.set(timeZone, formatter)
  }
  return formatter
}
export function studyDay(now: Date, timeZone: string) {
  const parts = dayFormatter(timeZone).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export function newCardsUsed(data: ReviewData, now: Date) {
  const day = studyDay(now, data.settings.timeZone), undone = new Set(data.undos.map(u => u.eventId))
  return data.events.filter(e => !e.before?.state && e.studyDay === day && !undone.has(e.id)).length
}
export function reviewQueue(cards: readonly Flashcard[], data: ReviewData, now: Date, skipped: ReadonlySet<string> = new Set()) {
  const schedules = new Map(data.schedules.map(s => [s.cardId, s])), eligible = cards.filter(c => !skipped.has(c.id))
  const due = eligible.filter(c => { const s = schedules.get(c.id)?.state; return s && Date.parse(s.due) <= now.getTime() }).sort((a, b) => schedules.get(a.id)!.state!.due.localeCompare(schedules.get(b.id)!.state!.due) || a.id.localeCompare(b.id))
  const fresh = eligible.filter(c => !schedules.get(c.id)?.state).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const remaining = Math.max(0, data.settings.newPerDay - newCardsUsed(data, now))
  return { due, fresh, remaining, cards: [...due, ...fresh.slice(0, remaining)] }
}
export function pruneReview(data: ReviewData, packs: readonly StudyPack[]): ReviewData {
  const ids = new Set(packs.flatMap(p => p.cards.map(c => c.id)))
  return { ...data, schedules: data.schedules.filter(s => ids.has(s.cardId)) }
}
export function latestReview(data: ReviewData) {
  const undone = new Set(data.undos.map(u => u.eventId))
  return [...data.events].reverse().find(e => !undone.has(e.id))
}
