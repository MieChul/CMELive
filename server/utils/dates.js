/**
 * SQLite datetime('now') and DEFAULT values are UTC in 'YYYY-MM-DD HH:MM:SS'
 * form with no timezone suffix. Treat as UTC in ISO-8601 so clients don't
 * interpret the wall-clock as local time (which breaks relative "ago" in IST and elsewhere).
 */
export function sqliteDateTimeAsUtcIso(value) {
  if (value == null || value === '') return value
  const s = String(value)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/)
  if (m) return `${m[1]}T${m[2]}Z`
  return s
}
