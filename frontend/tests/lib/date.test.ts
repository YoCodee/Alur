import { describe, it, expect } from 'vitest';
import {
  getBusinessDate,
  getYesterday,
  getRelativeBusinessDate,
  formatDateId,
  formatDateTimeId,
  isFutureWib,
} from '@/lib/date';

describe('getBusinessDate (WIB Asia/Jakarta - PRD D5)', () => {
  it('correctly maps UTC late evening to the NEXT day in WIB (UTC+7)', () => {
    // 2026-10-19T20:00:00Z in UTC is 2026-10-20T03:00:00+07:00 in WIB
    const utcDate = new Date('2026-10-19T20:00:00Z');
    expect(getBusinessDate(utcDate)).toBe('2026-10-20');
  });

  it('correctly maps UTC early morning to the SAME day in WIB', () => {
    // 2026-10-19T02:00:00Z in UTC is 2026-10-19T09:00:00+07:00 in WIB
    const utcDate = new Date('2026-10-19T02:00:00Z');
    expect(getBusinessDate(utcDate)).toBe('2026-10-19');
  });

  it('returns valid YYYY-MM-DD pattern when called without args', () => {
    const today = getBusinessDate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getYesterday', () => {
  it('returns exactly one day before the business date in WIB', () => {
    // Test for a specific date: 2026-11-04
    const baseDate = new Date('2026-11-04T05:00:00+07:00');
    expect(getYesterday(baseDate)).toBe('2026-11-03');
  });

  it('handles month boundary correctly', () => {
    // 1st of November in WIB -> Yesterday is 31st of October
    const firstOfNov = new Date('2026-11-01T08:00:00+07:00');
    expect(getYesterday(firstOfNov)).toBe('2026-10-31');
  });
});

describe('getRelativeBusinessDate', () => {
  it('calculates D-30 correctly', () => {
    const baseDate = new Date('2026-11-01T08:00:00+07:00');
    expect(getRelativeBusinessDate(-30, baseDate)).toBe('2026-10-02');
  });

  it('calculates D+6 correctly for 7-day forecast horizon', () => {
    const baseDate = new Date('2026-11-01T08:00:00+07:00');
    expect(getRelativeBusinessDate(6, baseDate)).toBe('2026-11-07');
  });
});

describe('formatDateId', () => {
  it('formats date in Indonesian locale', () => {
    const date = new Date('2026-11-03T10:00:00+07:00');
    expect(formatDateId(date, 'd MMM yyyy')).toBe('3 Nov 2026');
  });
});

describe('formatDateTimeId', () => {
  it('renders a date-only business date without a fake 00:00', () => {
    expect(formatDateTimeId('2026-11-10')).toBe('10 Nov');
    expect(formatDateTimeId('2026-11-10')).not.toMatch(/:\d{2}/);
  });

  it('keeps the year when the pattern includes one', () => {
    expect(formatDateTimeId('2026-11-10', 'd MMM yyyy, HH:mm')).toBe('10 Nov 2026');
  });

  it('keeps the exact time of a real timestamp (unchanged behaviour)', () => {
    const ts = '2026-11-10T07:15:00.000Z';
    expect(formatDateTimeId(ts)).toBe(formatDateId(ts, 'd MMM, HH:mm'));
    expect(formatDateTimeId(ts)).toMatch(/, \d{2}:\d{2}$/);
    expect(formatDateTimeId(ts, 'd MMM yyyy, HH:mm')).toBe(
      formatDateId(ts, 'd MMM yyyy, HH:mm')
    );
  });
});

describe('isFutureWib', () => {
  it('identifies past dates as not future', () => {
    expect(isFutureWib('2020-01-01')).toBe(false);
  });

  it('identifies far future dates as future', () => {
    expect(isFutureWib('2099-12-31')).toBe(true);
  });
});
