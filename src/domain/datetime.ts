export const PH_TIMEZONE = 'Asia/Manila'
export const PH_LOCALE = 'en-PH'

export interface TimezoneOption {
  value: string
  label: string
  offset: string
  region: string
}

export const AVAILABLE_TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Manila', label: 'Philippines Time (PST)', offset: 'GMT+8', region: 'Manila, Philippines' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)', offset: 'GMT+8', region: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: 'GMT+9', region: 'Tokyo, Japan' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT)', offset: 'GMT+8', region: 'Hong Kong' },
  { value: 'Asia/Bangkok', label: 'Indochina Time (ICT)', offset: 'GMT+7', region: 'Bangkok, Thailand' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: 'GMT+4', region: 'Dubai, UAE' },
  { value: 'Europe/London', label: 'Greenwich / London Time', offset: 'GMT+0/+1', region: 'London, UK' },
  { value: 'America/New_York', label: 'US Eastern Time (EST/EDT)', offset: 'GMT-5/-4', region: 'New York, US' },
  { value: 'America/Chicago', label: 'US Central Time (CST/CDT)', offset: 'GMT-6/-5', region: 'Chicago, US' },
  { value: 'America/Los_Angeles', label: 'US Pacific Time (PST/PDT)', offset: 'GMT-8/-7', region: 'Los Angeles, US' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)', offset: 'GMT+0', region: 'UTC (Standard)' },
]

export function getActiveTimezone(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('kiosk_active_timezone')
    if (saved && AVAILABLE_TIMEZONES.some((t) => t.value === saved)) {
      return saved
    }
  }
  return PH_TIMEZONE
}

export function setActiveTimezone(tz: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('kiosk_active_timezone', tz)
    window.dispatchEvent(new CustomEvent('kiosk:timezone-changed', { detail: { timezone: tz } }))
  }
}

/**
 * Parses a date value safely. If the string is in raw SQL datetime format (e.g. "2026-08-29 05:59:00"
 * without a timezone or 'Z' indicator), it is parsed as UTC so that timezone conversion to
 * the selected timezone is computed accurately.
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
 * Get hour (0-23) for a given Date or string in the active/specified timezone
 */
export function getPhHour(value: string | Date | number, tz?: string): number {
  const date = parseDate(value)
  if (isNaN(date.getTime())) return 0
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz || getActiveTimezone(),
    hour: 'numeric',
    hour12: false,
  })
  const hourStr = formatter.format(date)
  const hour = parseInt(hourStr, 10)
  return isNaN(hour) ? 0 : hour % 24
}

/**
 * Format time in active/specified timezone (e.g. "01:23 PM")
 */
export function formatPhTime(value: string | Date | number, tz?: string): string {
  const date = parseDate(value)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(PH_LOCALE, {
    timeZone: tz || getActiveTimezone(),
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * Format full date & time in active/specified timezone (e.g. "Aug 29, 2026, 01:23 PM")
 */
export function formatPhDateTime(value: string | Date | number, tz?: string): string {
  const date = parseDate(value)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(PH_LOCALE, {
    timeZone: tz || getActiveTimezone(),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * Format date in active/specified timezone (e.g. "Aug 29, 2026")
 */
export function formatPhDate(value: string | Date | number, tz?: string): string {
  const date = parseDate(value)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(PH_LOCALE, {
    timeZone: tz || getActiveTimezone(),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * Format date as YYYY-MM-DD in active or specified timezone for accurate date comparisons
 */
export function getTzDateString(value: string | Date | number, tz?: string): string {
  const date = parseDate(value)
  if (isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || getActiveTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${d}`
}
