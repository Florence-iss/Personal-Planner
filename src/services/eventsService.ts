/**
 * Firestore CRUD service for Calendar Events.
 *
 * Collection path: users/{userId}/events/{eventId}
 *
 * Recurring events are stored as a single document; their expanded occurrences
 * are computed on the client via `recurrenceUtils.getOccurrencesInRange`.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { CalendarEvent } from '../types';
import { getOccurrencesInRange, toDateString } from '../utils/recurrenceUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

/** Convert today's date to the midnight ISO timestamps for start/end range. */
function todayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function docToEvent(id: string, data: Record<string, unknown>): CalendarEvent {
  return {
    id,
    userId:                data.userId as string,
    title:                 data.title as string,
    description:           data.description as string | undefined,
    startTime:             data.startTime as string,
    endTime:               data.endTime as string,
    allDay:                (data.allDay as boolean) ?? false,
    recurring:             data.recurring as CalendarEvent['recurring'] | undefined,
    googleCalendarEventId: data.googleCalendarEventId as string | undefined,
    googleCalendarId:      data.googleCalendarId as string | undefined,
    color:                 data.color as string,
    createdAt:             data.createdAt as string,
    updatedAt:             data.updatedAt as string,
  };
}

// ---------------------------------------------------------------------------
// Real-time subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to all calendar events for a user.
 * Fires immediately and on each subsequent change.
 *
 * @returns Unsubscribe function.
 */
export function subscribeToEvents(
  userId: string,
  onUpdate: (events: CalendarEvent[]) => void,
): () => void {
  const eventsRef = collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.EVENTS,
  );
  const q = query(eventsRef, orderBy('startTime', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const events: CalendarEvent[] = snapshot.docs.map((d) =>
      docToEvent(d.id, d.data() as Record<string, unknown>),
    );
    onUpdate(events);
  });
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Create a new calendar event.
 */
export async function createEvent(
  userId: string,
  data: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<CalendarEvent> {
  const eventsRef = collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.EVENTS,
  );
  const timestamp = now();
  const payload = { ...data, userId, createdAt: timestamp, updatedAt: timestamp };
  const docRef = await addDoc(eventsRef, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Update fields on an existing event.
 * `data.userId` must be present to resolve the Firestore path.
 */
export async function updateEvent(
  eventId: string,
  data: Partial<CalendarEvent>,
): Promise<void> {
  const userId = data.userId;
  if (!userId) {
    throw new Error('updateEvent: data.userId is required.');
  }
  const eventRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.EVENTS,
    eventId,
  );
  const { id: _id, ...rest } = data as CalendarEvent;
  await updateDoc(eventRef, { ...rest, updatedAt: now() });
}

/**
 * Permanently delete an event.
 */
export async function deleteEvent(
  eventId: string,
  userId: string,
): Promise<void> {
  const eventRef = doc(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.EVENTS,
    eventId,
  );
  await deleteDoc(eventRef);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch all events (including expanded recurring occurrences) that overlap
 * the given date range [start, end].
 *
 * Strategy:
 *  1. Fetch all events whose `startTime` falls within the range (simple
 *     non-recurring events and the seed of recurring ones).
 *  2. Also fetch all recurring events regardless of `startTime` so that their
 *     occurrences can be expanded into the range.
 *  3. Deduplicate, expand recurrences, and return a flat list of
 *     `CalendarEvent` objects — one per concrete occurrence.
 *
 * Each synthetic occurrence shares the original event's metadata but has its
 * `startTime`, `endTime`, and `id` (suffixed with `_<ISO-date>`) adjusted to
 * the specific occurrence date.
 */
export async function getEventsForDateRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<CalendarEvent[]> {
  const eventsRef = collection(
    db,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.EVENTS,
  );

  // Query 1: non-recurring events whose startTime is in range
  const rangeQuery = query(
    eventsRef,
    where('startTime', '>=', start.toISOString()),
    where('startTime', '<=', end.toISOString()),
  );

  // Query 2: all recurring events (small collection; fine to fetch all)
  const recurringQuery = query(
    eventsRef,
    where('recurring', '!=', null),
  );

  const [rangeSnap, recurringSnap] = await Promise.all([
    getDocs(rangeQuery),
    getDocs(recurringQuery),
  ]);

  // Merge, deduplicate by id
  const eventMap = new Map<string, CalendarEvent>();

  for (const d of rangeSnap.docs) {
    eventMap.set(d.id, docToEvent(d.id, d.data() as Record<string, unknown>));
  }
  for (const d of recurringSnap.docs) {
    if (!eventMap.has(d.id)) {
      eventMap.set(d.id, docToEvent(d.id, d.data() as Record<string, unknown>));
    }
  }

  const result: CalendarEvent[] = [];

  for (const event of eventMap.values()) {
    if (!event.recurring) {
      // Non-recurring: include as-is (already in range from query 1)
      result.push(event);
      continue;
    }

    // Expand occurrences
    const seedStart = new Date(event.startTime);
    const seedEnd   = new Date(event.endTime);
    const duration  = seedEnd.getTime() - seedStart.getTime();

    const occurrences = getOccurrencesInRange(
      event.recurring,
      seedStart,
      start,
      end,
    );

    for (const occStart of occurrences) {
      const occEnd = new Date(occStart.getTime() + duration);
      result.push({
        ...event,
        id:        `${event.id}_${toDateString(occStart)}`,
        startTime: occStart.toISOString(),
        endTime:   occEnd.toISOString(),
      });
    }
  }

  // Sort by startTime ascending
  result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return result;
}

/**
 * Convenience wrapper — fetch all events for today (midnight → 23:59:59).
 */
export async function getTodayEvents(userId: string): Promise<CalendarEvent[]> {
  const { start, end } = todayRange();
  return getEventsForDateRange(userId, start, end);
}
