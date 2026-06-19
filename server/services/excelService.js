import ExcelJS from 'exceljs'

/**
 * @param {object[]} rows - one per response, columns include question keys
 */
export function buildResponseWorkbook(rows) {
  const wb = new ExcelJS.Workbook()
  const sheet = wb.addWorksheet('Responses')
  if (!rows.length) {
    sheet.addRow(['No data'])
    return wb
  }
  const keys = Object.keys(rows[0])
  sheet.addRow(keys)
  for (const r of rows) {
    sheet.addRow(keys.map((k) => r[k] ?? ''))
  }
  return wb
}
