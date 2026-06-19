import { sqliteDateTimeAsUtcIso } from './dates.js'

/**
 * @param {object} s
 * @param {string} [nowIso]
 */
export function isSurveyActive(s, nowIso = new Date().toISOString()) {
  const nowT = new Date(nowIso).getTime()

  const t = (v) => {
    if (v == null || v === '') return null
    const ms = new Date(sqliteDateTimeAsUtcIso(v)).getTime()
    return Number.isNaN(ms) ? null : ms
  }

  if (s.status === 'inactive') return false
  if (s.status === 'active') {
    const fromT = t(s.activeFromDate)
    const toT = t(s.activeToDate)
    if (fromT != null && fromT > nowT) return false
    if (toT != null && toT < nowT) return false
    return true
  }
  if (s.status === 'scheduled') {
    if (s.activeFromDate && s.activeToDate) {
      const fromT = t(s.activeFromDate)
      const toT = t(s.activeToDate)
      if (fromT == null || toT == null) return s.status === 'active'
      return fromT <= nowT && nowT <= toT
    }
  }
  return s.status === 'active'
}
