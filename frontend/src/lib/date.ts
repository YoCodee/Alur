import { format, subDays, addDays, parseISO } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { id as idLocale } from 'date-fns/locale';

export const TIMEZONE_WIB = 'Asia/Jakarta';

/**
 * Returns current Date adjusted to Asia/Jakarta (WIB) time.
 */
export function nowWib(): Date {
  return toZonedTime(new Date(), TIMEZONE_WIB);
}

/**
 * Converts a given Date, ISO string, or timestamp into WIB Date.
 */
export function toWib(date: Date | string | number): Date {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return toZonedTime(d, TIMEZONE_WIB);
}

/**
 * Gets the current business date as "YYYY-MM-DD" string in Asia/Jakarta timezone.
 * Follows PRD Locked Decision D5.
 */
export function getBusinessDate(date?: Date | string | number): string {
  const target = date ? toWib(date) : nowWib();
  return formatTz(target, 'yyyy-MM-dd', { timeZone: TIMEZONE_WIB });
}

/**
 * Gets yesterday's business date as "YYYY-MM-DD" string in Asia/Jakarta timezone.
 */
export function getYesterday(date?: Date | string | number): string {
  const target = date ? toWib(date) : nowWib();
  const yesterday = subDays(target, 1);
  return formatTz(yesterday, 'yyyy-MM-dd', { timeZone: TIMEZONE_WIB });
}

/**
 * Gets relative date (days delta) in "YYYY-MM-DD" WIB.
 * E.g. -30 for D-30, +6 for D+6
 */
export function getRelativeBusinessDate(daysDelta: number, baseDate?: Date | string | number): string {
  const target = baseDate ? toWib(baseDate) : nowWib();
  const result = daysDelta >= 0 ? addDays(target, daysDelta) : subDays(target, Math.abs(daysDelta));
  return formatTz(result, 'yyyy-MM-dd', { timeZone: TIMEZONE_WIB });
}

/**
 * Formats a date string/Date to human-readable Indonesian text.
 * Example: "3 Nov 2026" or "Senin, 3 November 2026"
 */
export function formatDateId(
  date: Date | string | number,
  formatPattern = 'd MMM yyyy'
): string {
  const target = toWib(date);
  return format(target, formatPattern, { locale: idLocale });
}

/**
 * Formats a value that may be either a full timestamp or a date-only string
 * (business dates such as `expense_date`, `briefing_date`, `business_date`).
 * A date-only input has no clock time, so the time segment is dropped instead
 * of rendering a fake "00:00".
 *
 * Example: "10 Nov, 14:32" for a timestamp, "10 Nov" for "2026-11-10".
 */
export function formatDateTimeId(date: Date | string | number, formatPattern = 'd MMM, HH:mm'): string {
  const isDateOnly = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim());
  if (!isDateOnly) return formatDateId(date, formatPattern);
  return formatDateId(date, formatPattern.replace(/,\s*HH:mm.*$/, ''));
}

/**
 * Checks if a given date string is in the future relative to today's WIB date.
 */
export function isFutureWib(dateString: string): boolean {
  const today = getBusinessDate();
  return dateString > today;
}
