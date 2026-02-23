/**
 * SLA Work Hours Calculator
 * Calculates deadlines counting only business hours, excluding lunch breaks.
 */

export interface WorkHoursConfig {
  workStartHour: number;    // e.g. 9 (9:00 AM)
  workStartMinute: number;  // e.g. 0
  workEndHour: number;      // e.g. 18 (6:00 PM)
  workEndMinute: number;    // e.g. 0
  lunchStartHour: number;   // e.g. 12
  lunchStartMinute: number; // e.g. 0
  lunchEndHour: number;     // e.g. 13 (1:00 PM)
  lunchEndMinute: number;   // e.g. 0
  timezone: string;         // e.g. 'Europe/Lisbon'
  workDays: number[];       // e.g. [1,2,3,4,5] (Mon-Fri)
}

export const DEFAULT_WORK_HOURS: WorkHoursConfig = {
  workStartHour: 9,
  workStartMinute: 0,
  workEndHour: 18,
  workEndMinute: 0,
  lunchStartHour: 12,
  lunchStartMinute: 0,
  lunchEndHour: 13,
  lunchEndMinute: 0,
  timezone: 'Europe/Lisbon',
  workDays: [1, 2, 3, 4, 5],
};

function toMinutes(h: number, m: number): number {
  return h * 60 + m;
}

/**
 * Get the total work minutes per day (excluding lunch)
 */
function getWorkMinutesPerDay(config: WorkHoursConfig): number {
  const workStart = toMinutes(config.workStartHour, config.workStartMinute);
  const workEnd = toMinutes(config.workEndHour, config.workEndMinute);
  const lunchStart = toMinutes(config.lunchStartHour, config.lunchStartMinute);
  const lunchEnd = toMinutes(config.lunchEndHour, config.lunchEndMinute);

  const totalWork = workEnd - workStart;
  const lunchDuration = lunchEnd - lunchStart;

  // Only subtract lunch if it falls within work hours
  if (lunchStart >= workStart && lunchEnd <= workEnd && lunchDuration > 0) {
    return totalWork - lunchDuration;
  }
  return totalWork;
}

/**
 * Convert a Date to the configured timezone and return hours/minutes
 */
function getTimeInTimezone(date: Date, timezone: string): { hours: number; minutes: number; dayOfWeek: number; dateStr: string } {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  };
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const hourPart = parts.find(p => p.type === 'hour');
  const minutePart = parts.find(p => p.type === 'minute');
  const hours = parseInt(hourPart?.value || '0');
  const minutes = parseInt(minutePart?.value || '0');

  // Get day of week (0=Sun, 1=Mon, ... 6=Sat)
  const dayStr = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = dayMap[dayStr] ?? 0;

  const dateStr = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

  return { hours, minutes, dayOfWeek, dateStr };
}

/**
 * Calculate a deadline by adding N work hours from a given start time.
 * Only counts hours within business hours on work days, excluding lunch.
 */
export function addWorkHours(startDate: Date, workHoursToAdd: number, config: WorkHoursConfig): Date {
  const workMinutesToAdd = Math.round(workHoursToAdd * 60);

  const workStart = toMinutes(config.workStartHour, config.workStartMinute);
  const workEnd = toMinutes(config.workEndHour, config.workEndMinute);
  const lunchStart = toMinutes(config.lunchStartHour, config.lunchStartMinute);
  const lunchEnd = toMinutes(config.lunchEndHour, config.lunchEndMinute);
  const hasLunch = lunchStart >= workStart && lunchEnd <= workEnd && lunchEnd > lunchStart;

  let remainingMinutes = workMinutesToAdd;
  let current = new Date(startDate.getTime());

  // Safety limit to prevent infinite loops
  let iterations = 0;
  const maxIterations = workMinutesToAdd + 1000;

  while (remainingMinutes > 0 && iterations < maxIterations) {
    iterations++;
    const tz = getTimeInTimezone(current, config.timezone);
    const currentMinutes = toMinutes(tz.hours, tz.minutes);
    const isWorkDay = config.workDays.includes(tz.dayOfWeek);

    if (!isWorkDay) {
      // Skip to next day's work start
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      // Set to beginning of day then add work start
      const nextTz = getTimeInTimezone(current, config.timezone);
      const diffToStart = toMinutes(config.workStartHour, config.workStartMinute) - toMinutes(nextTz.hours, nextTz.minutes);
      current = new Date(current.getTime() + diffToStart * 60 * 1000);
      continue;
    }

    if (currentMinutes < workStart) {
      // Before work hours — skip to work start
      const diff = workStart - currentMinutes;
      current = new Date(current.getTime() + diff * 60 * 1000);
      continue;
    }

    if (currentMinutes >= workEnd) {
      // After work hours — skip to next day's work start
      const minutesToMidnight = 24 * 60 - currentMinutes;
      current = new Date(current.getTime() + (minutesToMidnight + workStart) * 60 * 1000);
      continue;
    }

    // During lunch break — skip to lunch end
    if (hasLunch && currentMinutes >= lunchStart && currentMinutes < lunchEnd) {
      const diff = lunchEnd - currentMinutes;
      current = new Date(current.getTime() + diff * 60 * 1000);
      continue;
    }

    // We are in valid work time — calculate available minutes until next break
    let availableMinutes: number;
    if (hasLunch && currentMinutes < lunchStart) {
      // Before lunch — available until lunch start
      availableMinutes = lunchStart - currentMinutes;
    } else {
      // After lunch (or no lunch) — available until work end
      availableMinutes = workEnd - currentMinutes;
    }

    if (remainingMinutes <= availableMinutes) {
      // We can finish within this block
      current = new Date(current.getTime() + remainingMinutes * 60 * 1000);
      remainingMinutes = 0;
    } else {
      // Consume available minutes and move to next block
      current = new Date(current.getTime() + availableMinutes * 60 * 1000);
      remainingMinutes -= availableMinutes;
    }
  }

  return current;
}

/**
 * Parse work hours config from system settings (stored as individual key-value pairs)
 */
export function parseWorkHoursFromSettings(settings: Record<string, any>): WorkHoursConfig {
  return {
    workStartHour: parseInt(settings.slaWorkStartHour) || DEFAULT_WORK_HOURS.workStartHour,
    workStartMinute: parseInt(settings.slaWorkStartMinute) || DEFAULT_WORK_HOURS.workStartMinute,
    workEndHour: parseInt(settings.slaWorkEndHour) || DEFAULT_WORK_HOURS.workEndHour,
    workEndMinute: parseInt(settings.slaWorkEndMinute) || DEFAULT_WORK_HOURS.workEndMinute,
    lunchStartHour: parseInt(settings.slaLunchStartHour) || DEFAULT_WORK_HOURS.lunchStartHour,
    lunchStartMinute: parseInt(settings.slaLunchStartMinute) || DEFAULT_WORK_HOURS.lunchStartMinute,
    lunchEndHour: parseInt(settings.slaLunchEndHour) || DEFAULT_WORK_HOURS.lunchEndHour,
    lunchEndMinute: parseInt(settings.slaLunchEndMinute) || DEFAULT_WORK_HOURS.lunchEndMinute,
    timezone: settings.slaTimezone || DEFAULT_WORK_HOURS.timezone,
    workDays: settings.slaWorkDays ? JSON.parse(settings.slaWorkDays) : DEFAULT_WORK_HOURS.workDays,
  };
}
