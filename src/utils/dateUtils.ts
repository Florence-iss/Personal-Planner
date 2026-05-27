import {
  format as dateFnsFormat,
  isToday as dateFnsIsToday,
  isTomorrow as dateFnsIsTomorrow,
  startOfDay as dateFnsStartOfDay,
  endOfDay as dateFnsEndOfDay,
  startOfWeek,
  addDays,
  getDaysInMonth,
  getDay,
} from 'date-fns';

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format a date (Date object or ISO string) using a date-fns format string.
 * Defaults to 'MMM d, yyyy' → e.g. "Jan 15, 2025".
 */
export function formatDate(date: Date | string, fmt = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dateFnsFormat(d, fmt);
}

/**
 * Format a date/time as a 12-hour clock string.
 * e.g. new Date() → "9:30 AM"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dateFnsFormat(d, 'h:mm a');
}

/**
 * Format a date/time as both date and time.
 * e.g. "Jan 15, 2025, 9:30 AM"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dateFnsFormat(d, 'MMM d, yyyy, h:mm a');
}

// ---------------------------------------------------------------------------
// Day checks
// ---------------------------------------------------------------------------

/**
 * Returns true if the date falls on today (local time).
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dateFnsIsToday(d);
}

/**
 * Returns true if the date falls on tomorrow (local time).
 */
export function isTomorrow(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dateFnsIsTomorrow(d);
}

// ---------------------------------------------------------------------------
// Day boundaries
// ---------------------------------------------------------------------------

/**
 * Returns a new Date set to 00:00:00.000 of the given day.
 */
export function startOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dateFnsStartOfDay(d);
}

/**
 * Returns a new Date set to 23:59:59.999 of the given day.
 */
export function endOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dateFnsEndOfDay(d);
}

// ---------------------------------------------------------------------------
// Week helpers
// ---------------------------------------------------------------------------

/**
 * Returns an array of 7 Date objects for the week that contains `date`.
 * The week starts on Sunday (locale index 0).
 *
 * e.g. getWeekDates(new Date('2025-01-15')) →
 *   [Sun Jan 12, Mon Jan 13, …, Sat Jan 18]
 */
export function getWeekDates(date: Date | string): Date[] {
  const d = typeof date === 'string' ? new Date(date) : date;
  const sunday = startOfWeek(d, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

// ---------------------------------------------------------------------------
// Month helpers
// ---------------------------------------------------------------------------

/**
 * Returns an array of all Date objects in the given month.
 * `month` is 0-indexed (0 = January, 11 = December), matching JS Date convention.
 *
 * e.g. getMonthDates(2025, 0) → [Jan 1 … Jan 31]
 */
export function getMonthDates(year: number, month: number): Date[] {
  const count = getDaysInMonth(new Date(year, month, 1));
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
}

// ---------------------------------------------------------------------------
// Day name helpers
// ---------------------------------------------------------------------------

/** Full day name for a 0-indexed day (0 = Sunday). */
const FULL_DAY_NAMES: readonly string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Short day name for a 0-indexed day (0 = Sunday). */
const SHORT_DAY_NAMES: readonly string[] = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

/**
 * Returns the full day name for a 0-indexed day index.
 * e.g. getDayName(1) → 'Monday'
 * Throws a RangeError for out-of-range indices.
 */
export function getDayName(dayIndex: number): string {
  if (dayIndex < 0 || dayIndex > 6) {
    throw new RangeError(`dayIndex must be 0–6, received ${dayIndex}`);
  }
  return FULL_DAY_NAMES[dayIndex];
}

/**
 * Returns the abbreviated day name for a 0-indexed day index.
 * e.g. getShortDayName(1) → 'Mon'
 * Throws a RangeError for out-of-range indices.
 */
export function getShortDayName(dayIndex: number): string {
  if (dayIndex < 0 || dayIndex > 6) {
    throw new RangeError(`dayIndex must be 0–6, received ${dayIndex}`);
  }
  return SHORT_DAY_NAMES[dayIndex];
}

// ---------------------------------------------------------------------------
// Additional convenience helpers used across the app
// ---------------------------------------------------------------------------

/**
 * Convert a Date to an ISO date string in local time ('YYYY-MM-DD').
 * `new Date().toISOString()` uses UTC — this uses local time instead.
 */
export function toLocalDateString(date: Date): string {
  return dateFnsFormat(date, 'yyyy-MM-dd');
}

/**
 * Convert a Date to an ISO timestamp string in local time.
 * e.g. "2025-01-15T09:30:00.000"
 */
export function toLocalISOString(date: Date): string {
  return dateFnsFormat(date, "yyyy-MM-dd'T'HH:mm:ss.SSS");
}

/**
 * Returns a human-readable relative label for a date string or Date.
 * Returns 'Today', 'Tomorrow', or the formatted date.
 */
export function getRelativeDayLabel(date: Date | string, fmt = 'MMM d, yyyy'): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return formatDate(date, fmt);
}

/**
 * Returns the 0-indexed day of week (0=Sun … 6=Sat) for a given date.
 */
export function getDayOfWeek(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return getDay(d);
}

/**
 * Given a 'YYYY-MM' string, returns the first day (Date) of that month.
 */
export function monthStringToDate(month: string): Date {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1);
}

/**
 * Returns the current month as a 'YYYY-MM' string.
 */
export function getCurrentMonth(): string {
  return dateFnsFormat(new Date(), 'yyyy-MM');
}
