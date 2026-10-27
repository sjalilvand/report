// دریافت و بررسی فایل اکسل — بخش‌های ۳ و ۷ سند
// شناسایی شیت‌ها، نواحی داده، سرستون‌های احتمالی، سلول‌های ادغام‌شده و اشکالات اولیه

import * as XLSX from 'xlsx'
import { createHash } from 'crypto'
import { toLatinDigits } from './digits'

export interface SheetDetection {
  name: string
  rows: number
  cols: number
  dataStartRow: number      // شاخص صفرمبنا نخستین سطر داده
  dataEndRow: number        // شاخص صفرمبنا آخرین سطر داده
  headerCandidate: number   // شاخص صفرمبنا سطر سرستون پیشنهادی
  headerCandidates: { row: number; score: number }[]
  titleRows: string[]       // متن سطرهای عنوان بالای جدول
  mergedCells: number       // تعداد ناحیه‌های ادغام‌شده
  totalRowCandidates: number[] // سطرهای احتمالی جمع کل
  hiddenRows: number[]
  hiddenCols: number[]
  emptyRowsInside: number
  warnings: string[]
  preview: string[][]       // پیش‌نمایش ۱۲ سطر اول (مقدار خام)
}

export interface FileDetection {
  sheets: SheetDetection[]
  warnings: string[]
}

export function fingerprintBuffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex').slice(0, 32)
}

// خواندن ورک‌بوک با نگه‌داشتن اطلاعات سلول‌های ادغام‌شده و قالب
export function detectWorkbook(buf: Buffer): FileDetection {
  const warnings: string[] = []
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buf, { cellDates: true, cellStyles: true, cellNF: false, sheetStubs: true })
  } catch (e) {
    throw new Error('فایل قابل خواندن نیست. ممکن است خراب، رمزگذاری‌شده یا با فرمت پشتیبانی‌نشده باشد (بخش ۳.۳ سند).')
  }

  const sheets: SheetDetection[] = []
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    if (!ws || !ws['!ref']) {
      warnings.push(`شیت «${name}» خالی است.`)
      continue
    }
    sheets.push(detectSheet(name, ws, warnings))
  }
  if (sheets.length === 0) warnings.push('هیچ شیت دارای داده‌ای یافت نشد.')
  return { sheets, warnings }
}

function detectSheet(name: string, ws: XLSX.WorkSheet, globalWarnings: string[]): SheetDetection {
  const range = ws['!ref']!
  const r = XLSX.utils.decode_range(range)
  const rowsCount = r.e.r - r.s.r + 1
  const colsCount = r.e.c - r.s.c + 1

  const warnings: string[] = []
  const merges: XLSX.Range[] = ws['!merges'] ?? []

  // ماتریس خام
  const grid: unknown[][] = []
  for (let R = r.s.r; R <= r.e.r; R++) {
    const row: unknown[] = []
    for (let C = r.s.c; C <= r.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr] as XLSX.CellObject | undefined
      row.push(cell ? (cell.v ?? null) : null)
    }
    grid.push(row)
  }

  // سطرها و ستون‌های مخفی — بخش ۳.۲ و ۷.۱
  const hiddenRows: number[] = []
  const hiddenCols: number[] = []
  const rowsSpec = (ws['!rows'] ?? []) as ({ hidden?: boolean } | undefined)[]
  rowsSpec.forEach((sp, i) => { if (sp?.hidden) hiddenRows.push(i) })
  const colsSpec = (ws['!cols'] ?? []) as ({ hidden?: boolean } | undefined)[]
  colsSpec.forEach((sp, i) => { if (sp?.hidden) hiddenCols.push(i) })

  // تراکم داده هر سطر و ستون
  const rowCount = grid.length
  const colCount = grid[0]?.length ?? 0
  const rowDensity = grid.map(row => row.filter(c => c !== null && String(c).trim() !== '').length)
  const colDensity: number[] = []
  for (let c = 0; c < colCount; c++) {
    let n = 0
    for (let rr = 0; rr < rowCount; rr++) {
      const v = grid[rr][c]
      if (v !== null && String(v).trim() !== '') n++
    }
    colDensity.push(n)
  }

  const TOTAL_PAT = /(جمع|مجموع|جمع کل|جمع جزء|total|sum)/i

  // سطرهای احتمالی جمع کل — بخش ۳.۲
  const totalRowCandidates: number[] = []
  for (let rr = 0; rr < rowCount; rr++) {
    let hits = 0
    for (let c = 0; c < colCount; c++) {
      const v = grid[rr][c]
      if (typeof v === 'string' && TOTAL_PAT.test(v)) hits++
    }
    if (hits > 0 && rowDensity[rr] <= Math.max(3, colCount * 0.4)) totalRowCandidates.push(rr)
  }

  // سطر سرستون پیشنهادی: نخستین سطرهای تراکم بالا که عمدتاً متنی‌اند و سطر بعدی آن داده دارد
  const candidates: { row: number; score: number }[] = []
  for (let rr = 0; rr < Math.min(rowCount, 25); rr++) {
    const density = rowDensity[rr]
    if (density < Math.max(2, colCount * 0.4)) continue
    let textCells = 0
    for (let c = 0; c < colCount; c++) {
      const v = grid[rr][c]
      if (typeof v === 'string' && v.trim() !== '' && !/^\d+([.,]\d+)?$/.test(toLatinDigits(v).trim())) textCells++
    }
    const textRatio = textCells / Math.max(1, density)
    const nextRowData = rr + 1 < rowCount ? rowDensity[rr + 1] : 0
    const score = textRatio * 0.6 + (density / colCount) * 0.2 + (nextRowData > 0 ? 0.2 : 0)
    candidates.push({ row: rr, score })
  }
  candidates.sort((a, b) => b.score - a.score)
  const headerCandidate = candidates.length > 0 ? candidates[0].row : 0

  // نخستین و آخرین سطر داده واقعی (پس از سرستون، حذف سطرهای خالی و جمع کل)
  let dataStart = headerCandidate + 1
  while (dataStart < rowCount && rowDensity[dataStart] === 0) dataStart++
  let dataEnd = rowCount - 1
  while (dataEnd > dataStart && rowDensity[dataEnd] === 0) dataEnd--
  // حذف سطر جمع کل انتهایی از دامنه پیشنهادی
  if (totalRowCandidates.includes(dataEnd) && dataEnd > dataStart) dataEnd--

  const emptyRowsInside = (() => {
    let n = 0
    for (let rr = dataStart; rr <= dataEnd; rr++) if (rowDensity[rr] === 0) n++
    return n
  })()

  // سطرهای عنوان بالای جدول — بخش ۳.۲
  const titleRows: string[] = []
  for (let rr = 0; rr < headerCandidate; rr++) {
    const line = grid[rr].filter(v => v !== null && String(v).trim() !== '').join(' | ').trim()
    if (line) titleRows.push(line)
  }

  if (merges.length > 0) warnings.push(`${merges.length} ناحیه سلول ادغام‌شده شناسایی شد؛ سیاست برخورد باید تعیین شود (بخش ۷.۲ سند).`)
  if (hiddenRows.length > 0) warnings.push(`${hiddenRows.length} سطر مخفی در شیت وجود دارد (بخش ۷.۱ سند).`)
  if (hiddenCols.length > 0) warnings.push(`${hiddenCols.length} ستون مخفی در شیت وجود دارد (بخش ۷.۱ سند).`)
  if (emptyRowsInside > 0) warnings.push(`${emptyRowsInside} سطر خالی در میانه داده‌ها شناسایی شد (بخش ۳.۲ سند).`)
  if (totalRowCandidates.length > 0) warnings.push('سطرهای احتمالی «جمع کل/جمع جزء» در دامنه داده وجود دارد (بخش ۳.۲ سند).')
  if (titleRows.length > 0) warnings.push('عنوان و توضیح در بالای جدول شناسایی شد (بخش ۳.۲ سند).')

  // پیش‌نمایش ۱۲ سطر
  const preview = grid.slice(0, 12).map(row => row.map(v => v === null || v === undefined ? '' : String(v)))

  return {
    name,
    rows: rowsCount,
    cols: colsCount,
    dataStartRow: dataStart,
    dataEndRow: dataEnd,
    headerCandidate,
    headerCandidates: candidates.slice(0, 5),
    titleRows,
    mergedCells: merges.length,
    totalRowCandidates,
    hiddenRows,
    hiddenCols,
    emptyRowsInside,
    warnings,
    preview,
  }
}

// استخراج جدول از شیت با پیکربندی مدیر — بخش‌های ۶ (مرحله چهارم) و ۷.۲
export interface ExtractConfig {
  headerRow: number           // شاخص صفرمبنا
  firstDataRow: number
  lastDataRow: number         // شاخص صفرمبنا؛ -1 تا پایان
  mergedPolicy: 'fill-down' | 'fill-right' | 'fill-both' | 'keep-original' // بخش ۷.۲
  skipTotalRows: boolean
  skipHiddenRows: boolean
}

export interface ExtractResult {
  headers: string[]           // نام اصلی ستون‌ها
  colWidths: number[]         // تعداد سلول پر در هر ستون
  records: Record<string, unknown>[]
  warnings: string[]
  totalRowsSkipped: number
  hiddenRowsSkipped: number
}

export function extractTable(buf: Buffer, sheetName: string, cfg: ExtractConfig): ExtractResult {
  const wb = XLSX.read(buf, { cellDates: true, cellStyles: true, sheetStubs: true })
  const ws = wb.Sheets[sheetName]
  if (!ws || !ws['!ref']) throw new Error('شیت موردنظر خالی است.')

  const range = XLSX.utils.decode_range(ws['!ref'])
  const merges: XLSX.Range[] = ws['!merges'] ?? []
  const rowsSpec = (ws['!rows'] ?? []) as ({ hidden?: boolean } | undefined)[]

  const rowsCount = range.e.r - range.s.r + 1
  const colCount = range.e.c - range.s.c + 1
  const grid: unknown[][] = []
  for (let R = range.s.r; R <= range.e.r; R++) {
    const row: unknown[] = []
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr] as XLSX.CellObject | undefined
      row.push(cell ? (cell.v ?? null) : null)
    }
    grid.push(row)
  }

  // اعمال سیاست سلول‌های ادغام‌شده — بخش ۷.۲
  const g = grid.map(row => [...row])
  if (cfg.mergedPolicy !== 'keep-original') {
    for (const m of merges) {
      const v = grid[m.s.r][m.s.c]
      if (v === null || v === undefined) continue
      const down = cfg.mergedPolicy === 'fill-down' || cfg.mergedPolicy === 'fill-both'
      const right = cfg.mergedPolicy === 'fill-right' || cfg.mergedPolicy === 'fill-both'
      for (let rr = m.s.r; rr <= m.e.r; rr++) {
        for (let cc = m.s.c; cc <= m.e.c; cc++) {
          if (rr === m.s.r && cc === m.s.c) continue
          if (down && rr > m.s.r) g[rr][cc] = v
          else if (right && cc > m.s.c) g[rr][cc] = v
        }
      }
    }
  }

  // نام سرستون‌ها — با مدیریت نام تکراری یا خالی (بخش ۳.۲)
  const headers: string[] = []
  const seen = new Map<string, number>()
  for (let c = 0; c < colCount; c++) {
    let h = g[cfg.headerRow]?.[c]
    if (h instanceof Date) h = h.toISOString().slice(0, 10)
    let name = h === null || h === undefined ? '' : String(h).trim()
    if (!name) name = `ستون ${XLSX.utils.encode_col(c)}`
    const count = seen.get(name) ?? 0
    seen.set(name, count + 1)
    if (count > 0) name = `${name} (${count + 1})`
    headers.push(name)
  }

  // سطرهای داده
  const lastRow = cfg.lastDataRow < 0 ? rowsCount - 1 : cfg.lastDataRow
  const records: Record<string, unknown>[] = []
  const warnings: string[] = []
  let totalSkipped = 0
  let hiddenSkipped = 0

  for (let rr = cfg.firstDataRow; rr <= lastRow && rr < rowsCount; rr++) {
    const isHidden = rowsSpec[rr]?.hidden === true
    if (isHidden && cfg.skipHiddenRows) { hiddenSkipped++; continue }
    const rowVals = g[rr]
    const filled = rowVals.filter(v => v !== null && String(v).trim() !== '').length
    if (filled === 0) continue // سطر خالی
    if (cfg.skipTotalRows) {
      const isTotal = rowVals.some(v => typeof v === 'string' && /(جمع|مجموع|total)/i.test(v)) && filled <= Math.max(3, colCount * 0.5)
      if (isTotal) { totalSkipped++; continue }
    }
    const rec: Record<string, unknown> = {}
    for (let c = 0; c < colCount; c++) {
      rec[headers[c]] = rowVals[c] ?? null
    }
    records.push(rec)
  }

  if (totalSkipped > 0) warnings.push(`${totalSkipped} سطر جمع کل/جزء کنار گذاشته شد.`)
  if (hiddenSkipped > 0) warnings.push(`${hiddenSkipped} سطر مخفی کنار گذاشته شد.`)
  if (cfg.mergedPolicy === 'keep-original' && merges.length > 0)
    warnings.push('سلول‌های ادغام‌شده به حالت اصلی حفظ شدند؛ مقدار فقط در سلول اصلی است (بخش ۷.۲ سند).')

  const colWidths = headers.map(h => records.filter(r => r[h] !== null && String(r[h]).trim() !== '').length)

  return { headers, colWidths, records, warnings, totalRowsSkipped: totalSkipped, hiddenRowsSkipped: hiddenSkipped }
}
