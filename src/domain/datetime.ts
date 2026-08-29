export const PH_TIMEZONE = 'Asia/Manila'
export const PH_LOCALE = 'en-PH'

/**
 * Parses a date value safely. If the string is in raw SQL datetime format (e.g. "2026-08-29 05:59:00"
 * without a timezone or 'Z' indicator), it is parsed as UTC so that timezone conversion to
 * Asia/Manila (GMT+8) is computed accurately.
 */
export function parseDate(value: string | Date | number): Date {
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  if (!value || typeof value !== 'string') return new Date(NaN)

  const trimmed = value.trim()
  // Matches SQL format like "2026-08-29 05:59:00" or "2026-08-29 05:59:00.123456" or "2026-08-29T05:59:00"
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(trimmed)) {
    return new Date(trimmed.replace(' ', 'T') + 'Z')
  }
  return new Date(trimmed)
}

/**
 * Get Philippines (Asia/Manila) hour (0-23) for a given Date or string
 */
export function getPhHour(value: string | Date | number): number {
  const date = parseDate(value)
  if (isNaN(date.getTime())) return 0
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  })
  const hourStr = formatter.format(date)
  const hour = parseInt(hourStr, 10)
  return isNaN(hour) ? 0 : hour % 24
}

/**
 * Format time in Philippines Time (e.g. "01:23 PM")
 */
export function formatPhTime(value: string | Date | number): string {
  const date = parseDate(value)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(PH_LOCALE, {
    timeZone: PH_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * Format full date & time in Philippines Time (e.g. "Aug 29, 2026, 01:23 PM")
 */
export function formatPhDateTime(value: string | Date | number): string {
  const date = parseDate(value)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(PH_LOCALE, {
    timeZone: PH_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * Format date in Philippines Time (e.g. "Aug 29, 2026")
 */
export function formatPhDate(value: string | Date | number): string {
  const date = parseDate(value)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(PH_LOCALE, {
    timeZone: PH_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}
