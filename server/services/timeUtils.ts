/**
 * Time utility functions for schedule and interval overlap detection
 */

// Converts formats like "09:00 AM", "9:00 AM", "14:30", "2:30 PM", "09:55" into total minutes from 00:00
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();

  const is12Hour = clean.includes('AM') || clean.includes('PM');

  if (is12Hour) {
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const withoutPeriod = clean.replace(/(AM|PM)/g, '').trim();
    const parts = withoutPeriod.split(':');
    let hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;

    if (isPM && hours < 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  } else {
    const parts = clean.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }
}

/**
 * Standard interval overlap logic:
 * Two time intervals [start1, end1) and [start2, end2) overlap if:
 * start1 < end2 && end1 > start2
 */
export function areIntervalsOverlapping(
  start1: string | number,
  end1: string | number,
  start2: string | number,
  end2: string | number
): boolean {
  const s1 = typeof start1 === 'number' ? start1 : parseTimeToMinutes(start1);
  const e1 = typeof end1 === 'number' ? end1 : parseTimeToMinutes(end1);
  const s2 = typeof start2 === 'number' ? start2 : parseTimeToMinutes(start2);
  const e2 = typeof end2 === 'number' ? end2 : parseTimeToMinutes(end2);

  return s1 < e2 && e1 > s2;
}

export function formatMinutesToTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
  const displayMins = mins < 10 ? `0${mins}` : `${mins}`;
  return `${displayHrs}:${displayMins} ${period}`;
}
