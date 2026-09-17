import { dayFormatter, emptyReview, SCHEDULER_ID, ratings, studyDay, type CardSchedule, type ReviewData, type ReviewEvent, type ReviewSettings, type ReviewUndo, type SchedulerState } from './review'
import type { StudyPack } from './study-pack'

function invalid(): never { throw new Error('Dữ liệu lịch ôn/lịch sử không hợp lệ hoặc không tương thích.') }
function object(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
  const o = value as Record<string, unknown>
  if (Object.keys(o).length !== keys.length || keys.some(k => !Object.hasOwn(o, k))) return invalid()
  return o
}
function num(value: unknown, min = 0, max = 1_000_000, integer = true): number { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || integer && !Number.isSafeInteger(value)) return invalid(); return value }
function id(value: unknown): string { if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(value)) return invalid(); return value }
function instant(value: unknown): string { if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) return invalid(); return value }
function list(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) return invalid(); return value }
export function validateReviewSettings(value: unknown): ReviewSettings {
  const s = object(value, ['newPerDay', 'timeZone', 'desiredRetention', 'scheduler'])
  if (s.scheduler !== SCHEDULER_ID || s.desiredRetention !== 0.9 || typeof s.timeZone !== 'string' || s.timeZone.length > 100) return invalid()
  try { dayFormatter(s.timeZone) } catch { return invalid() }
  return { newPerDay: num(s.newPerDay, 0, 200), timeZone: s.timeZone, desiredRetention: 0.9, scheduler: SCHEDULER_ID }
}
function state(value: unknown): SchedulerState {
  const s = object(value, ['state', 'due', 'lastReview', 'stability', 'difficulty', 'elapsedDays', 'scheduledDays', 'learningSteps', 'reps', 'lapses'])
  if (s.state !== 'learning' && s.state !== 'review' && s.state !== 'relearning') return invalid()
  const result: SchedulerState = { state: s.state, due: instant(s.due), lastReview: instant(s.lastReview), stability: num(s.stability, 0.000001, 1e9, false), difficulty: num(s.difficulty, 1, 10, false), elapsedDays: num(s.elapsedDays), scheduledDays: num(s.scheduledDays, 0, 36500), learningSteps: num(s.learningSteps), reps: num(s.reps, 1), lapses: num(s.lapses) }
  if (result.due < result.lastReview || result.lapses > result.reps) return invalid()
  return result
}
function schedule(value: unknown): CardSchedule {
  const s = object(value, ['cardId', 'revision', 'state', 'lastEventId'])
  const result = { cardId: id(s.cardId), revision: num(s.revision, 1), state: s.state === null ? null : state(s.state), lastEventId: s.lastEventId === null ? null : id(s.lastEventId) }
  if (!!result.state !== !!result.lastEventId) return invalid()
  return result
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export function validateReview(value: unknown, packs: readonly StudyPack[]): ReviewData {
  const v = object(value, ['settings', 'schedules', 'events', 'undos']), settings = validateReviewSettings(v.settings)
  const cardIds = new Set(packs.flatMap(p => p.cards.map(c => c.id))), allIds = new Set<string>(), sequences = new Set<number>()
  const unique = (value: unknown) => { const result = id(value); if (allIds.has(result)) return invalid(); allIds.add(result); return result }
  const sequence = (value: unknown) => { const n = num(value, 1); if (sequences.has(n)) return invalid(); sequences.add(n); return n }
  const events: ReviewEvent[] = list(v.events, 20000).map(value => {
    const e = object(value, ['id', 'cardId', 'rating', 'reviewedAt', 'studyDay', 'contentRevision', 'before', 'after', 'settings', 'sequence'])
    if (!ratings.includes(e.rating as ReviewEvent['rating'])) return invalid()
    const result: ReviewEvent = { id: unique(e.id), cardId: id(e.cardId), rating: e.rating as ReviewEvent['rating'], reviewedAt: instant(e.reviewedAt), studyDay: String(e.studyDay), contentRevision: num(e.contentRevision, 1), before: e.before === null ? null : schedule(e.before), after: schedule(e.after), settings: validateReviewSettings(e.settings), sequence: sequence(e.sequence) }
    if (result.settings.timeZone !== settings.timeZone || result.studyDay !== studyDay(new Date(result.reviewedAt), settings.timeZone) || result.after.cardId !== result.cardId || result.before && result.before.cardId !== result.cardId || result.after.revision !== (result.before?.revision ?? 0) + 1 || result.after.lastEventId !== result.id || result.after.state?.lastReview !== result.reviewedAt) return invalid()
    return result
  }).sort((a, b) => a.sequence - b.sequence)
  const eventMap = new Map(events.map(e => [e.id, e])), undone = new Set<string>()
  const undos: ReviewUndo[] = list(v.undos, 20000).map(value => {
    const u = object(value, ['id', 'eventId', 'undoneAt', 'sequence', 'after'])
    const result = { id: unique(u.id), eventId: id(u.eventId), undoneAt: instant(u.undoneAt), sequence: sequence(u.sequence), after: schedule(u.after) }, event = eventMap.get(result.eventId)
    if (!event || undone.has(event.id) || result.undoneAt < event.reviewedAt || result.sequence <= event.sequence || result.after.cardId !== event.cardId || result.after.revision !== event.after.revision + 1 || !equal(result.after.state, event.before?.state ?? null) || result.after.lastEventId !== (event.before?.lastEventId ?? null)) return invalid()
    undone.add(event.id); return result
  }).sort((a, b) => a.sequence - b.sequence)
  const history = new Map<string, CardSchedule>(), actionTimes: string[] = []
  const actions = [...events.map(e => ({ sequence: e.sequence, at: e.reviewedAt, event: e, undo: null })), ...undos.map(u => ({ sequence: u.sequence, at: u.undoneAt, event: null, undo: u }))].sort((a, b) => a.sequence - b.sequence)
  for (const action of actions) {
    if (actionTimes.length && action.at < actionTimes[actionTimes.length - 1]) return invalid()
    actionTimes.push(action.at)
    if (action.event) {
      const e = action.event, previous = history.get(e.cardId)
      // A deleted/reimported card may start fresh; its earlier events stay audited.
      if (e.before && !equal(previous, e.before)) return invalid()
      history.set(e.cardId, e.after)
    } else {
      const u = action.undo!, event = eventMap.get(u.eventId)!
      if (!equal(history.get(event.cardId), event.after)) return invalid()
      history.set(event.cardId, u.after)
    }
  }
  const seen = new Set<string>(), schedules = list(v.schedules, 10000).map(value => {
    const s = schedule(value)
    if (!cardIds.has(s.cardId) || seen.has(s.cardId) || !equal(history.get(s.cardId), s)) return invalid()
    seen.add(s.cardId); return s
  }).sort((a, b) => a.cardId.localeCompare(b.cardId))
  return { settings, schedules, events, undos }
}
export function mergeReview(local: ReviewData, incoming: ReviewData, packs: readonly StudyPack[]) {
  const hasState = (d: ReviewData) => d.events.length || d.schedules.length || d.undos.length || d.settings.newPerDay !== 20
  if (!hasState(local)) return validateReview(incoming, packs)
  if (!hasState(incoming)) return validateReview(local, packs)
  if (!equal(local, incoming)) throw new Error('Lịch ôn cá nhân khác nhau. Đã chặn toàn bộ khôi phục; không ghi đè lịch sử.')
  return validateReview(local, packs)
}
export { emptyReview }
