/**
 * Recurrence utilities for tasks and calendar events.
 *
 * Uses the `rrule` library (already in dependencies) to expand recurrence rules
 * defined by our `RecurrenceRule` type into concrete dates.
 */

import { RRule, Weekday } from 'rrule';
import { RecurrenceRule } from '../types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Map our 0=Sun…6=Sat day indices to RRule weekday constants. */
const DAY_TO_RRULE: Weekday[] = [
  RRule.SU,
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
];

function buildRRule(rule: RecurrenceRule, dtstart: Date): RRule {
  let freq: number;
  switch (rule.frequency) {
    case 'daily':
      freq = RRule.DAILY;
      break;
    case 'weekly':
      freq = RRule.WEEKLY;
      break;
    case 'monthly':
      freq = RRule.MONTHLY;
      break;
    case 'custom':
      // Custom falls back to weekly with specific byweekday
      freq = RRule.WEEKLY;
      break;
    default:
      freq = RRule.DAILY;
  }

  const byweekday =
    rule.days && rule.days.length > 0
      ? rule.days.map((d) => DAY_TO_RRULE[d])
      : undefined;

  const until = rule.until ? new Date(rule.until) : undefined;

  return new RRule({
    freq,
    interval: rule.interval ?? 1,
    byweekday,
    until,
    dtstart,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Given a recurring task/event at `currentDate`, return the next occurrence
 * date after it. Returns `null` if there is no further occurrence (recurrence
 * has ended or the rule is invalid).
 *
 * @param rule       The recurrence rule attached to the task/event.
 * @param currentDate  The date of the instance being completed (ISO string or Date).
 */
export function getNextOccurrence(
  rule: RecurrenceRule,
  currentDate: string | Date,
): Date | null {
  const dtstart = typeof currentDate === 'string' ? new Date(currentDate) : currentDate;

  try {
    const rrule = buildRRule(rule, dtstart);
    // `after` returns the next occurrence strictly after dtstart
    return rrule.after(dtstart, false);
  } catch {
    return null;
  }
}

/**
 * Return all occurrences of a recurrence rule that fall within [start, end].
 *
 * @param rule   The recurrence rule.
 * @param seed   The original start date/time of the first occurrence (ISO or Date).
 * @param start  Range start (inclusive).
 * @param end    Range end (inclusive).
 */
export function getOccurrencesInRange(
  rule: RecurrenceRule,
  seed: string | Date,
  start: Date,
  end: Date,
): Date[] {
  const dtstart = typeof seed === 'string' ? new Date(seed) : seed;

  try {
    const rrule = buildRRule(rule, dtstart);
    return rrule.between(start, end, true /* inclusive */);
  } catch {
    return [];
  }
}

/**
 * Format a Date to 'YYYY-MM-DD'.
 */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Return true if `date` falls on one of the weekdays listed in the habit's
 * targetDays array (0=Sun…6=Sat). If targetDays is empty the habit is
 * considered applicable every day.
 */
export function isHabitDueOnDate(targetDays: number[], date: Date): boolean {
  if (targetDays.length === 0) return true;
  return targetDays.includes(date.getDay());
}
