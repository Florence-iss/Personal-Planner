import { create } from 'zustand';
import { Habit, HabitLog } from '../types';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface HabitsState {
  habits: Habit[];
  habitLogs: HabitLog[];
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface HabitsActions {
  // ---- loading ----
  setLoading: (loading: boolean) => void;

  // ---- habits ----
  /** Replace the full habits list. */
  setHabits: (habits: Habit[]) => void;
  /** Append a new habit. */
  addHabit: (habit: Habit) => void;
  /** Merge updated fields into an existing habit matched by id. */
  updateHabit: (id: string, updates: Partial<Omit<Habit, 'id'>>) => void;
  /** Remove a habit by id (also removes all associated logs). */
  removeHabit: (id: string) => void;

  // ---- habit logs ----
  /** Replace the full habit-log list. */
  setHabitLogs: (logs: HabitLog[]) => void;
  /** Append a single habit log entry. */
  addHabitLog: (log: HabitLog) => void;
  /** Remove a habit-log entry by id. */
  removeHabitLog: (id: string) => void;

  // ---- helpers ----
  /**
   * Returns all HabitLog entries whose `date` field matches today
   * in 'yyyy-MM-dd' format (local time).
   */
  getTodayLogs: () => HabitLog[];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useHabitsStore = create<HabitsState & HabitsActions>((set, get) => ({
  // --- initial state ---
  habits: [],
  habitLogs: [],
  loading: false,

  // --- loading ---
  setLoading: (loading) => set({ loading }),

  // --- habits ---
  setHabits: (habits) => set({ habits }),

  addHabit: (habit) =>
    set((state) => ({ habits: [...state.habits, habit] })),

  updateHabit: (id, updates) =>
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id ? { ...h, ...updates } : h,
      ),
    })),

  removeHabit: (id) =>
    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
      // Cascade — remove orphaned logs
      habitLogs: state.habitLogs.filter((l) => l.habitId !== id),
    })),

  // --- habit logs ---
  setHabitLogs: (habitLogs) => set({ habitLogs }),

  addHabitLog: (log) =>
    set((state) => ({ habitLogs: [...state.habitLogs, log] })),

  removeHabitLog: (id) =>
    set((state) => ({
      habitLogs: state.habitLogs.filter((l) => l.id !== id),
    })),

  // --- helpers ---
  getTodayLogs: () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return get().habitLogs.filter((l) => l.date === todayStr);
  },
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Habits that have not been archived. */
export const selectActiveHabits = (state: HabitsState): Habit[] =>
  state.habits.filter((h) => !h.archivedAt);

/** Archived habits. */
export const selectArchivedHabits = (state: HabitsState): Habit[] =>
  state.habits.filter((h) => !!h.archivedAt);

/** Find a habit by id. */
export const selectHabitById =
  (id: string) =>
  (state: HabitsState): Habit | undefined =>
    state.habits.find((h) => h.id === id);

/** All logs for a specific habit. */
export const selectLogsByHabit =
  (habitId: string) =>
  (state: HabitsState): HabitLog[] =>
    state.habitLogs.filter((l) => l.habitId === habitId);

/** All logs for a specific date string ('yyyy-MM-dd'). */
export const selectLogsByDate =
  (date: string) =>
  (state: HabitsState): HabitLog[] =>
    state.habitLogs.filter((l) => l.date === date);

/**
 * Returns the set of habitIds that have been completed today.
 * Useful for checking a checkbox state without iterating inside render.
 */
export const selectTodayCompletedHabitIds = (state: HabitsState): Set<string> => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  return new Set(
    state.habitLogs
      .filter((l) => l.date === todayStr)
      .map((l) => l.habitId),
  );
};

/**
 * Streak count for a given habit — consecutive days (back from today)
 * on which at least one log entry exists.
 */
export const selectStreakForHabit =
  (habitId: string) =>
  (state: HabitsState): number => {
    const logs = state.habitLogs.filter((l) => l.habitId === habitId);
    if (logs.length === 0) return 0;

    const logDates = new Set(logs.map((l) => l.date));
    let streak = 0;
    const cursor = new Date();

    // Walk backwards from today
    while (true) {
      const key = format(cursor, 'yyyy-MM-dd');
      if (!logDates.has(key)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  };
