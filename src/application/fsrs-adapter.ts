import { createEmptyCard, fsrs, Rating, State, type Card } from 'ts-fsrs'
import type { RecallRating, SchedulerState } from './review'

// Versioned profile uses the package's pinned FSRS-6 weights. No optimizer/fuzz.
export const schedulerParameters = { request_retention: 0.9, maximum_interval: 36500, enable_fuzz: false, enable_short_term: true, learning_steps: ['1m', '10m'], relearning_steps: ['10m'] } as const
const scheduler = fsrs(schedulerParameters)
const states = { learning: State.Learning, review: State.Review, relearning: State.Relearning }
const grades = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy } as const
function toLibrary(state: SchedulerState | null, now: Date): Card {
  if (!state) return createEmptyCard(now)
  return { state: states[state.state], due: new Date(state.due), last_review: new Date(state.lastReview), stability: state.stability, difficulty: state.difficulty, elapsed_days: state.elapsedDays, scheduled_days: state.scheduledDays, learning_steps: state.learningSteps, reps: state.reps, lapses: state.lapses }
}
export function scheduleRecall(state: SchedulerState | null, rating: RecallRating, now: Date): SchedulerState {
  if (!grades[rating] || !Number.isFinite(now.getTime()) || state && now.getTime() < Date.parse(state.lastReview)) throw new Error('Thời điểm hoặc đánh giá không hợp lệ.')
  const card = scheduler.next(toLibrary(state, now), now, grades[rating]).card
  if (card.state === State.New || !card.last_review) throw new Error('Scheduler trả trạng thái không hợp lệ.')
  return { state: card.state === State.Learning ? 'learning' : card.state === State.Review ? 'review' : 'relearning', due: card.due.toISOString(), lastReview: card.last_review.toISOString(), stability: card.stability, difficulty: card.difficulty, elapsedDays: card.elapsed_days, scheduledDays: card.scheduled_days, learningSteps: card.learning_steps, reps: card.reps, lapses: card.lapses }
}
