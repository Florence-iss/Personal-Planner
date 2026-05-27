import { create } from 'zustand';
import { CalendarEvent } from '../types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface EventsState {
  events: CalendarEvent[];
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface EventsActions {
  // ---- loading ----
  setLoading: (loading: boolean) => void;

  // ---- events ----
  /** Replace the entire event list (e.g. after fetching from Firestore). */
  setEvents: (events: CalendarEvent[]) => void;
  /** Append a new event. */
  addEvent: (event: CalendarEvent) => void;
  /** Merge updated fields into an existing event matched by id. */
  updateEvent: (id: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => void;
  /** Remove an event by id. */
  removeEvent: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEventsStore = create<EventsState & EventsActions>((set) => ({
  // --- initial state ---
  events: [],
  loading: false,

  // --- loading ---
  setLoading: (loading) => set({ loading }),

  // --- events ---
  setEvents: (events) => set({ events }),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  updateEvent: (id, updates) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    })),

  removeEvent: (id) =>
    set((state) => ({ events: state.events.filter((e) => e.id !== id) })),
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Events that start on a given ISO date string ('YYYY-MM-DD'). */
export const selectEventsByDate =
  (date: string) =>
  (state: EventsState): CalendarEvent[] =>
    state.events.filter((e) => e.startTime.startsWith(date));

/**
 * Events overlapping a given time range [rangeStart, rangeEnd) (ISO timestamps).
 * An event overlaps if its startTime < rangeEnd AND its endTime > rangeStart.
 */
export const selectEventsInRange =
  (rangeStart: string, rangeEnd: string) =>
  (state: EventsState): CalendarEvent[] =>
    state.events.filter(
      (e) => e.startTime < rangeEnd && e.endTime > rangeStart,
    );

/** Find a single event by id. */
export const selectEventById =
  (id: string) =>
  (state: EventsState): CalendarEvent | undefined =>
    state.events.find((e) => e.id === id);

/** All-day events only. */
export const selectAllDayEvents = (state: EventsState): CalendarEvent[] =>
  state.events.filter((e) => e.allDay);

/** Events imported from Google Calendar. */
export const selectGoogleCalendarEvents = (state: EventsState): CalendarEvent[] =>
  state.events.filter((e) => !!e.googleCalendarEventId);
