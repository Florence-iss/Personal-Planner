/**
 * Firestore CRUD service for Habits and Habit Logs.
 *
 * Collection paths:
 *   users/{userId}/habits/{habitId}
 *   users/{userId}/habitLogs/{logId}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { Habit, HabitLog } from '../types';
import { isHabitDueOnDate, toDateString } from '../utils/recurrenceUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

function docToHabit(id: string, data: Record<string, unknown>): Habit {
  return {
    id,
    userId:      data.userId as string,
    name:        data.name as string,
    description: data.description as string | undefined,
    icon:        data.icon as string,
    color:       data.color as string,
    frequency:   data.frequency as Habit['frequency'],
    targetDays:  (data.targetDays as number[]) ?? [],
    targetCount: (data.targetCount as number) ?? 1,
    createdAt:   data.createdAt as string,
    archivedAt:  data.archivedAt as string | undefined,
  };
}

function docToHabitLog(id: string, data: Record<string, unknown>): HabitLog {
  return {
    id,
    habitId:     data.habitId as string,
    userId:      data.userId as string,
    date:        data.date as string,
    completedAt: data.completedAt as string,
  };
}

// ---------------------------------------------------------------------------
// Habits — real-time subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to all non-archived habits for a user.
 * Fires immediately and on every subsequent change.
 *
 * @returns Unsubscribe function.
 */
export function subscribeToHabits(
  userId: string,
  callback: (habits: Habit[]) => void,
): () => void {
  const habitsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.HABITS);
  // Order by createdAt; filter out archived on the client to avoid a composite index.
  const q = query(habitsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const habits: Habit[] = snapshot.docs
      .map((d) => docToHabit(d.id, d.data() as Record<string, unknown>))
      .filter((h) => !h.archivedAt);
    callback(habits);
  });
}

// ---------------------------------------------------------------------------
// Habits — writes
// ---------------------------------------------------------------------------

/**
 * Create a new habit.
 */
export async function createHabit(
  userId: string,
  data: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'archivedAt'>,
): Promise<Habit> {
  const habitsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.HABITS);
  const timestamp = now();
  const payload = { ...data, userId, createdAt: timestamp };
  const docRef = await addDoc(habitsRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Update fields on an existing habit.
 * `data.userId` must be present to resolve the Firestore path.
 */
export async function updateHabit(
  habitId: string,
  data: Partial<Habit>,
): Promise<void> {
  const userId = data.userId;
  if (!userId) {
    throw new Error('updateHabit: data.userId is required.');
  }
  const habitRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.HABITS, habitId);
  const { id: _id, ...rest } = data as Habit;
  await updateDoc(habitRef, rest);
}

/**
 * Soft-archive a habit by setting `archivedAt`.
 * `userId` must be supplied to resolve the document path.
 * The habit is no longer returned by `subscribeToHabits` after archiving.
 */
export async function archiveHabit(habitId: string, userId: string): Promise<void> {
  const habitRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.HABITS, habitId);
  await updateDoc(habitRef, { archivedAt: now() });
}

// ---------------------------------------------------------------------------
// Habit Logs — real-time subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to all habit logs for a user in a given month.
 *
 * @param month - 'YYYY-MM' string, e.g. '2025-06'
 * @returns Unsubscribe function.
 */
export function subscribeToHabitLogs(
  userId: string,
  month: string,
  callback: (logs: HabitLog[]) => void,
): () => void {
  const logsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.HABIT_LOGS);

  // All dates in `month` fall within ['YYYY-MM-01', 'YYYY-MM-31'].
  // We filter with a >= / <= range on the stored 'YYYY-MM-DD' date strings.
  const monthStart = `${month}-01`;
  const monthEnd   = `${month}-31`; // Firestore string compare handles shorter months correctly

  const q = query(
    logsRef,
    where('date', '>=', monthStart),
    where('date', '<=', monthEnd),
    orderBy('date', 'asc'),
  );

  return onSnapshot(q, (snapshot) => {
    const logs: HabitLog[] = snapshot.docs.map((d) =>
      docToHabitLog(d.id, d.data() as Record<string, unknown>),
    );
    callback(logs);
  });
}

// ---------------------------------------------------------------------------
// Habit Logs — writes
// ---------------------------------------------------------------------------

/**
 * Record a habit completion for a specific date.
 *
 * @param date - 'YYYY-MM-DD' string
 */
export async function logHabit(
  userId: string,
  habitId: string,
  date: string,
): Promise<HabitLog> {
  const logsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.HABIT_LOGS);
  const completedAt = now();
  const payload = { habitId, userId, date, completedAt };
  const docRef = await addDoc(logsRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Remove a habit log entry (un-log a completion).
 * The caller must know the log's document id (available in HabitLog.id).
 * Because habitLogs are stored at the user level, userId is required.
 */
export async function unlogHabit(logId: string, userId: string): Promise<void> {
  const logRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.HABIT_LOGS, logId);
  await deleteDoc(logRef);
}

// ---------------------------------------------------------------------------
// Analytics helpers (pure — no Firestore calls)
// ---------------------------------------------------------------------------

/**
 * Compute the current and best streak for a habit given its log entries.
 *
 * A "streak" is defined as the maximum consecutive sequence of *scheduled* days
 * (days on which the habit is due according to `habit.targetDays`) on which at
 * least one log entry exists.  Days on which the habit is not scheduled are
 * skipped (they neither break nor extend a streak).
 *
 * Streak calculation walks backwards from today.
 */
export function getHabitStreak(
  habitId: string,
  logs: HabitLog[],
  habit: Habit,
): { current: number; best: number } {
  // Build a Set of dates on which the habit was logged
  const loggedDates = new Set(
    logs.filter((l) => l.habitId === habitId).map((l) => l.date),
  );

  if (loggedDates.size === 0) {
    return { current: 0, best: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let current = 0;
  let best = 0;
  let runLength = 0;
  let streakBroken = false;

  // Walk backwards from today for up to 365 days
  const MAX_DAYS = 365;

  for (let i = 0; i < MAX_DAYS; i++) {
    const cursor = new Date(today.getTime() - i * 86_400_000);
    const dateStr = toDateString(cursor);
    const isDue = isHabitDueOnDate(habit.targetDays, cursor);

    if (!isDue) {
      // Not a scheduled day — skip without breaking streak
      continue;
    }

    if (loggedDates.has(dateStr)) {
      runLength++;
      best = Math.max(best, runLength);
      if (!streakBroken) {
        current = runLength;
      }
    } else {
      // Scheduled but not logged: breaks the current streak
      if (!streakBroken) {
        streakBroken = true;
      }
      // Reset run counter for best-streak tracking
      runLength = 0;
    }
  }

  return { current, best };
}

/**
 * Compute the completion rate (as a percentage 0–100) for a habit over the
 * last `days` calendar days (including today).
 *
 * Only days on which the habit is *scheduled* (per `habit.targetDays`) are
 * counted in the denominator.  Returns 0 if no scheduled days exist in the
 * window.
 */
export function getCompletionRate(
  habitId: string,
  logs: HabitLog[],
  habit: Habit,
  days: number,
): number {
  const loggedDates = new Set(
    logs.filter((l) => l.habitId === habitId).map((l) => l.date),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let scheduled = 0;
  let completed = 0;

  for (let i = 0; i < days; i++) {
    const cursor = new Date(today.getTime() - i * 86_400_000);
    const isDue  = isHabitDueOnDate(habit.targetDays, cursor);
    if (!isDue) continue;

    scheduled++;
    if (loggedDates.has(toDateString(cursor))) {
      completed++;
    }
  }

  if (scheduled === 0) return 0;
  return Math.round((completed / scheduled) * 100);
}
