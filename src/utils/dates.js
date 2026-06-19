/** Display survey-related timestamps in India Standard Time (per product default). */
export const SURVEY_DISPLAY_TZ = 'Asia/Kolkata'

/**
 * SQLite/legacy APIs may return UTC as "YYYY-MM-DD HH:MM:SS" without a timezone.
 * ECMAScript treats that as local time; append Z to interpret as UTC.
 */
export function parseServerUtc(iso) {
  if (!iso) return new Date(NaN)
  const s = String(iso)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    return new Date(s.replace(' ', 'T') + 'Z')
  }
  return new Date(s)
}

export function formatIstDate(iso) {
  const d = parseServerUtc(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', {
    timeZone: SURVEY_DISPLAY_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function timeAgoIstLabel(iso) {
  if (!iso) return ''
  const then = parseServerUtc(iso)
  const d = (Date.now() - then) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return formatIstDate(iso)
}
