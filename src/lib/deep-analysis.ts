// موتور تحلیل عمیق — «فهم واقعی ساختار اکسل فارسی» (فاز هجدهم)
// ---------------------------------------------------------------
// مشکل ریشه‌ای گزارش‌های سطحی قبلی: جدول‌های عریض با سرستون چندسطحی (ماه‌ها، مقدار/مبلغ،
// شیت هر سال، ردیف‌های مالی ترکیبی) به‌صورت مسطح خوانده می‌شدند و موتور عمومی فقط
// ستون‌های عددی را جمع می‌زد — نتیجه: دسته‌های بی‌معنی مثل «مقدار (7)» و درصدهای غلط.
//
// این موتور همان کاری را می‌کند که یک تحلیلگر انسانی می‌کند:
//   ۱) شیت‌ها را دسته‌بندی می‌کند (تفصیلی ماهانه / ماتریس سالانه / ماتریس قرارداد / عمومی)
//   ۲) سرستون‌های چندسطحی را باز می‌کند (ماه + مقدار/مبلغ) و به رکورد معنایی تبدیل می‌کند
//   ۳) ردیف‌های مالی ویژه (تجهیز ۷۰٪، مدیریت پیمان ۳۰٪، مالیات، مجموع‌ها) را جدا می‌کند
//   ۴) سلول‌های پوشانده‌شده (.......) و سطرهای جمع را از محاسبات حذف و صحت‌سنجی می‌کند
//   ۵) تحلیل‌های سالانه/ماهانه/فصلی/ترکیب/مالی/واحد + SWOT + نقشه راه با اعداد واقعی می‌سازد
//
// خروجی (DeepAnalysis) به رندرکنندهٔ گزارش جامع (smart-report) و داشبورد درون‌برنامه‌ای می‌رود.

import * as XLSX from 'xlsx'
import { toLatinDigits } from './digits'

// ─────────────────────────── انواع خروجی ───────────────────────────

export interface DeepAnnual {
  year: number
  revenue: number          // جمع مبلغ خدمات (ریال)
  volume: number           // جمع مقدار خدمات
  revenueGrowth: number | null  // رشد نسبت به سال قبل کامل (٪) — فقط وقتی هر دو سال کامل‌اند
  volumeGrowth: number | null
  share: number            // سهم از کل درآمد (٪)
  monthsInYear: number     // تعداد ماه‌های دارای داده — سال‌های ناقص با کسری از ۱۲
  partial: boolean         // بازه ناقص (کمتر از ۱۲ ماه)
}

export interface DeepMonthlyPoint {
  key: string              // «1403-08»
  y: number
  m: number                // ۱ تا ۱۲ شمسی
  label: string            // «آبان ۱۴۰۳»
  revenue: number
  volume: number
  growth: number | null    // رشد نسبت به ماه قبل (٪)
}

export interface DeepSeasonal {
  m: number
  label: string
  totalRevenue: number
  avgRevenue: number       // میانگین درآمد همین ماه در سال‌های دارای داده
  yearsCovered: number
}

export interface DeepItem {
  label: string
  unit: string
  unitPrice: number | null // قیمت واحد اعلام‌شده (ریال)
  totalAmount: number
  totalQty: number
  share: number            // سهم از کل درآمد خدمات (٪)
  activeMonths: number     // تعداد ماه‌های دارای فعالیت
  avgPerUnit: number | null // درآمد به‌ازای هر واحد خدمت
  byYear: { year: number; amount: number; qty: number }[]
  growthFirstLast: number | null // رشد درآمد آخرین سال نسبت به نخستین سال
  growthLast: number | null      // رشد درآمد سال آخر نسبت به سال قبل
}

export interface DeepFinanceYear {
  year: number
  clinics: number | null        // تجهیز، راه‌اندازی و راهبری کلینیک‌ها
  clinicsShareLabel: string     // «۷۰٪»
  contractMgmt: number | null   // مدیریت پیمان
  clinicsTotal: number | null   // جمع کل ۱۰۰٪
  assoc: number | null          // راهبری انجمن روانشناسان
  servicesTotal: number | null  // مجموع ریالی خدمات انجام شده
  vat: number | null            // مالیات بر ارزش افزوده
  vatRateLabel: string          // «۹٪»
  grandTotal: number | null     // مجموع کل درآمد و مالیات
}

export interface DeepMatrix {
  title: string
  kind: 'year' | 'contract' | 'other'
  columns: { label: string; sub?: string; year?: number }[]
  items: { label: string; values: (number | null)[]; total: number }[]
  totalsRow: (number | null)[]
}

export interface DeepInsight {
  tone: 'good' | 'warn' | 'bad' | 'info'
  icon: string
  title: string
  text: string
}

export interface DeepKpi {
  id: string
  label: string
  value: number
  fmt: 'currency' | 'number' | 'percent' | 'compact'
  unitHint?: string
  sub?: string
  tone?: 'up' | 'down' | 'flat'
}

export interface DeepAnalysis {
  ok: boolean
  reason?: string           // اگر ok=false: چرا تحلیل عمیق ممکن نشد
  sourceName: string
  years: number[]
  monthsWithData: number
  kpis: DeepKpi[]
  annual: DeepAnnual[]
  monthly: DeepMonthlyPoint[]
  seasonal: DeepSeasonal[]
  items: DeepItem[]
  finance: DeepFinanceYear[]
  vatTotal: number
  grandTotalAll: number
  servicesTotalAll: number
  volumeAll: number
  matrices: DeepMatrix[]
  swot: { s: string[]; w: string[]; o: string[]; t: string[] }
  recommendations: { title: string; text: string }[]
  suggestedKpis: { label: string; target: string }[]
  insights: DeepInsight[]
  integrity: { year: number; computed: number; declared: number; diffPct: number }[]
  quality: { maskedCells: number; totalRowsSkipped: number; notes: string[] }
  sheetsUsed: { name: string; kind: string; rows: number }[]
  warnings: string[]
}

// ─────────────────────────── ابزارهای پایه ───────────────────────────

const MONTH_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

// تطبیق نام ماه با «مرز کلمه» — تا زیررشته‌هایی مثل «دی» در «مدیریت» یا «مهر» در «مهربان»
// به‌اشتباه ماه تشخیص داده نشوند. پسوند «ماه» نیز مرز مجاز است (مثل «تیرماه»).
const MONTH_RE = MONTH_FA.map(m => new RegExp(`(?:^|[^\\u0600-\\u06FF])${m}(?:$|[^\\u0600-\\u06FF]|ماه)`))

function monthNumber(text: string): number | null {
  const t = String(text ?? '')
  for (let i = 0; i < 12; i++) if (MONTH_RE[i].test(t)) return i + 1
  return null
}

function yearInText(text: string): number | null {
  const t = toLatinDigits(String(text))
  // فقط سال مستقل ۱۴xx — نه اعداد داخل کد قرارداد مثل «1/1248060»
  const m = t.match(/(?:^|[^\d])(1[34]\d{2})(?!\d)/)
  return m ? parseInt(m[1], 10) : null
}

const MASKED = /^[.·]{2,}$/
const PLACEHOLDER = /^[\s*ـ-]*$/

function isMasked(v: unknown): boolean {
  return typeof v === 'string' && (MASKED.test(v.trim()) || PLACEHOLDER.test(v.trim()))
}

/** تبدیل مقدار سلول به عدد — پشتیبانی از ارقام فارسی، جداکننده هزارگان و متن عددی */
function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  let s = toLatinDigits(v).trim()
  if (s === '' || s === '*' || s === '-') return null
  s = s.replace(/[,٬\s\u066C]/g, '')
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s)
  return null
}

function cleanLabel(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s = String(v).replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim()
  if (isMasked(s) || s === '*') return ''
  return s
}

export function faNum(n: number | string): string { return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]) }

const TOTAL_LABEL = /(جمع|مجموع|total)/i

/** استخراج نرخ‌های داخل برچسب مثل «مالیات بر ارزش افزوده (9%) و(10%)» → «۹٪ و ۱۰٪» */
function ratesInLabel(label: string): string | null {
  const t = toLatinDigits(label)
  const ms = [...t.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m => m[1])
  if (ms.length === 0) return null
  return ms.map(x => `${faNum(x)}٪`).join(' و ')
}

/** استخراج سهم داخل برچسب مثل «هزینه انجام شده (70%)» → «۷۰٪» */
function shareInLabel(label: string): string | null {
  const t = toLatinDigits(label)
  const m = t.match(/(\d+(?:\.\d+)?)\s*%/)
  return m ? `${faNum(m[1])}٪` : null
}

// ─────────────────────────── مدل میانی شیت ───────────────────────────

type Cell = unknown

interface SheetGrid {
  name: string
  grid: Cell[][]
  rowCount: number
  colCount: number
}

function readSheetGrid(ws: XLSX.WorkSheet, name: string): SheetGrid | null {
  if (!ws || !ws['!ref']) return null
  const range = XLSX.utils.decode_range(ws['!ref'])
  const grid: Cell[][] = []
  for (let R = range.s.r; R <= range.e.r; R++) {
    const row: Cell[] = []
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr] as XLSX.CellObject | undefined
      row.push(cell ? (cell.v ?? null) : null)
    }
    grid.push(row)
  }
  return { name, grid, rowCount: grid.length, colCount: grid[0]?.length ?? 0 }
}

// ─────────────────────────── پارس شیت تفصیلی ماهانه ───────────────────────────

interface MonthPair { col: number; month: number | null; year: number | null; isTotal: boolean; label: string }

export interface ParsedDetailSheet {
  kind: 'detail'
  name: string
  year: number
  pairs: MonthPair[]
  qtyTotalPair: MonthPair | null
  labelCol: number
  unitCol: number | null
  priceCol: number | null
  rows: {
    label: string
    kind: 'service' | 'clinics' | 'contractMgmt' | 'clinicsTotal' | 'assoc' | 'servicesTotal' | 'vat' | 'grandTotal' | 'other'
    unit: string
    unitPrice: number | null
    cells: { month: number | null; qty: number | null; amount: number | null; isTotal: boolean }[]
  }[]
  maskedCells: number
}

function classifyDetailRow(label: string): ParsedDetailSheet['rows'][number]['kind'] {
  const t = toLatinDigits(label)
  if (/مجموع کل درآمد/.test(t)) return 'grandTotal'
  if (/مجموع ریالی خدمات/.test(t)) return 'servicesTotal'
  if (/مالیات بر ارزش افزوده/.test(t)) return 'vat'
  if (/جمع کل.*(100|۱۰۰)/.test(t) || /\(100%\)/.test(t)) return 'clinicsTotal'
  if (/مدیریت پیمان/.test(t)) return 'contractMgmt'
  if (/تجهیز|راه.?اندازی|راهبری کلینیک/.test(t)) return 'clinics'
  if (/راهبری انجمن/.test(t)) return 'assoc'
  if (TOTAL_LABEL.test(t)) return 'other'
  return 'service'
}

function parseDetailSheet(sh: SheetGrid, sheetYear: number): ParsedDetailSheet | null {
  const { grid, rowCount, colCount } = sh

  // ۱) سطر زیرعنوان: سطری با بیشترین تکرار «مقدار/مبلغ» در ۸ سطر اول
  let subRow = -1
  let best = 0
  for (let r = 0; r < Math.min(rowCount, 8); r++) {
    let hits = 0
    for (let c = 0; c < colCount; c++) {
      const t = toLatinDigits(cleanLabel(grid[r][c]))
      if (/^(مقدار|مبلغ)/.test(t)) hits++
    }
    if (hits >= 4 && hits > best) { best = hits; subRow = r }
  }
  if (subRow < 0) return null

  // ۲) سطر ماه‌ها: نزدیک‌ترین سطر بالای زیرعنوان با ≥۲ نام ماه
  let monthRow = -1
  for (let r = subRow - 1; r >= 0; r--) {
    let months = 0
    for (let c = 0; c < colCount; c++) if (monthNumber(String(grid[r][c] ?? '')) !== null) months++
    if (months >= 2) { monthRow = r; break }
  }
  if (monthRow < 0) return null

  // ۳) جفت‌های مقدار/مبلغ — هر سلول «مقدار» آغاز یک جفت است
  const pairs: MonthPair[] = []
  let qtyTotalPair: MonthPair | null = null
  for (let c = 0; c < colCount; c++) {
    const t = toLatinDigits(cleanLabel(grid[subRow][c]))
    if (!/^مقدار/.test(t)) continue
    const amountLabel = cleanLabel(grid[subRow][c + 1] ?? '')
    if (!/^مبلغ/.test(toLatinDigits(amountLabel))) continue
    // ماه این جفت: در پنجره [c-1, c, c+1] سطر ماه‌ها
    let month: number | null = null
    let year: number | null = null
    let label = ''
    let isTotal = false
    for (const cc of [c, c - 1, c + 1]) {
      const raw = String(grid[monthRow][cc] ?? '')
      const txt = cleanLabel(raw)
      const m = monthNumber(txt)
      if (txt && m !== null) { month = m; label = txt; year = yearInText(txt); break }
      if (/مجموع/.test(toLatinDigits(txt)) && !isTotal) { isTotal = true; label = txt }
    }
    if (month === null && !isTotal) continue
    const p: MonthPair = { col: c, month, year, isTotal: isTotal && month === null, label }
    if (p.isTotal) qtyTotalPair = p
    else pairs.push(p)
  }
  if (pairs.length < 2) return null

  // ۴) ستون عنوان خدمت — سرستون حاوی شرح/عنوان یا ستون پرتکرار متنی
  let labelCol = -1
  for (let r = 0; r < Math.min(rowCount, 6); r++) {
    for (let c = 0; c < Math.min(colCount, pairs[0]?.col ?? colCount); c++) {
      const t = toLatinDigits(cleanLabel(grid[r][c]))
      if (/(شرح|عنوان|نام خدمت|اقلام)/.test(t)) { labelCol = c; break }
    }
    if (labelCol >= 0) break
  }
  if (labelCol < 0) labelCol = 1
  // ۵) ستون واحد و قیمت واحد
  let unitCol: number | null = null
  const priceCols: number[] = []
  const scanCols = Math.min(colCount, pairs[0]?.col ?? colCount)
  for (let r = 0; r < Math.min(rowCount, 6); r++) {
    for (let c = 0; c < scanCols; c++) {
      const t = toLatinDigits(cleanLabel(grid[r][c]))
      if (unitCol === null && /واحد سنجش/.test(t)) unitCol = c
      if (/قیمت واحد|نرخ واحد/.test(t) && !priceCols.includes(c)) priceCols.push(c)
    }
  }
  if (unitCol === null) {
    for (let r = 0; r < Math.min(rowCount, 6); r++) {
      for (let c = 0; c < scanCols; c++) {
        const t = toLatinDigits(cleanLabel(grid[r][c]))
        if (/واحد/.test(t) && !priceCols.includes(c) && c !== labelCol) { unitCol = c; break }
      }
      if (unitCol !== null) break
    }
  }
  const priceCol: number | null = priceCols.length ? priceCols[0] : null

  // ۶) سطرهای داده
  let maskedCells = 0
  const rows: ParsedDetailSheet['rows'] = []
  for (let r = subRow + 1; r < rowCount; r++) {
    const row = grid[r]
    const label = cleanLabel(row[labelCol])
    // برچسب جایگزین: نخستین سلول متنی معتبر قبل از اولین جفت
    const scanEnd = pairs[0]?.col ?? colCount
    let effLabel = label
    if (!effLabel) {
      for (let c = 0; c < Math.min(scanEnd, colCount); c++) {
        const t = cleanLabel(row[c])
        if (t && !isMasked(t) && t !== '*' && monthNumber(t) === null && toNumber(t) === null) { effLabel = t; break }
      }
    }
    if (!effLabel) continue
    const kind = classifyDetailRow(effLabel)
    if (kind === 'other' && TOTAL_LABEL.test(effLabel) && !/تجهیز|انجمن/.test(toLatinDigits(effLabel))) {
      // سطر جمع خدمات — محاسبه خودمان دقیق‌تر است؛ برای صحت‌سنجی نگه می‌داریم
    }
    const cells: ParsedDetailSheet['rows'][number]['cells'] = []
    const allPairs = qtyTotalPair ? [...pairs, qtyTotalPair] : pairs
    for (const p of allPairs) {
      const qRaw = row[p.col]
      const aRaw = row[p.col + 1]
      if (isMasked(qRaw)) maskedCells++
      if (isMasked(aRaw)) maskedCells++
      cells.push({
        month: p.month,
        qty: p.isTotal ? null : toNumber(qRaw),
        amount: toNumber(aRaw),
        isTotal: p.isTotal,
      })
    }
    const unit = unitCol !== null ? cleanLabel(row[unitCol]) : ''
    let unitPrice: number | null = null
    // فقط ستون‌های دارای سرستون «قیمت واحد» (ممکن است قدیم/جدید) — نه جفت‌های جمع
    for (const pc of priceCols) {
      const v = toNumber(row[pc])
      if (v !== null && v > 0) unitPrice = v
    }
    rows.push({ label: effLabel, kind, unit, unitPrice, cells })
  }

  const year = sheetYear > 0 ? sheetYear : (yearInText(String(grid[0]?.map(cleanLabel).join(' ') ?? '')) ?? 0)
  if (!year) return null
  return { kind: 'detail', name: sh.name, year, pairs, qtyTotalPair, labelCol, unitCol, priceCol, rows, maskedCells }
}

// ─────────────────────────── پارس ماتریس (سال/قرارداد) ───────────────────────────

export interface ParsedMatrixSheet {
  kind: 'matrix'
  name: string
  title: string
  matrixKind: 'year' | 'contract' | 'other'
  columns: { label: string; sub?: string; year?: number }[]
  items: { label: string; values: (number | null)[] }[]
  totalsRow: (number | null)[]
  maskedCells: number
}

function parseMatrixSheet(sh: SheetGrid): ParsedMatrixSheet | null {
  const { grid, rowCount, colCount } = sh
  // سطر سرستون: سطری که ستون شرح را دارد و چند ستون نام‌دار دیگر
  let headerRow = -1
  let labelCol = -1
  for (let r = 0; r < Math.min(rowCount, 8); r++) {
    for (let c = 0; c < colCount; c++) {
      const t = toLatinDigits(cleanLabel(grid[r][c]))
      if (/(شرح|عنوان|نام)/.test(t)) { headerRow = r; labelCol = c; break }
    }
    if (headerRow >= 0) break
  }
  if (headerRow < 0) return null

  const title = grid.slice(0, headerRow).map(row => row.map(cleanLabel).filter(Boolean).join(' ')).find(t => t.length > 8) || sh.name

  const columns: ParsedMatrixSheet['columns'] = []
  const colIdx: number[] = []
  let totalColIdx = -1
  for (let c = labelCol + 1; c < colCount; c++) {
    const t = cleanLabel(grid[headerRow][c])
    if (!t || isMasked(t)) continue
    const tl = toLatinDigits(t)
    if (/^(جمع|مجموع)/.test(tl)) { totalColIdx = c; continue }
    const y = /^1[34]\d{2}$/.test(tl) ? parseInt(tl, 10) : yearInText(tl)
    columns.push({ label: t, year: y ?? undefined })
    colIdx.push(c)
  }
  if (columns.length < 2) return null

  // زیرعنوان (بازه تاریخ قراردادها یا «تعداد») — نباید برچسب قلم داشته باشد (سطر داده نیست)
  let subRow: number | null = null
  for (let r = headerRow + 1; r < Math.min(headerRow + 4, rowCount); r++) {
    if (cleanLabel(grid[r][labelCol])) continue // سطری با برچسب = سطر داده است
    const texts = grid[r].map(cleanLabel).filter(t => t && t !== '*' && !isMasked(t))
    if (texts.length === 0) continue
    const subish = texts.filter(t => {
      const tl = toLatinDigits(t)
      return toNumber(t) !== null || monthNumber(t) !== null || /^1[34]\d{2}/.test(tl) || /(از|الی)\s*1[34]\d{2}/.test(tl) || /^تعداد$/.test(tl)
    }).length
    if (subish >= texts.length * 0.6) { subRow = r; break }
  }

  let maskedCells = 0
  const items: ParsedMatrixSheet['items'] = []
  const totalsRow: (number | null)[] = columns.map(() => null)
  for (let r = headerRow + 1; r < rowCount; r++) {
    const row = grid[r]
    const label = cleanLabel(row[labelCol])
    if (!label) continue
    const values = colIdx.map(c => {
      const v = row[c]
      if (isMasked(v)) { maskedCells++; return null }
      return toNumber(v)
    })
    if (TOTAL_LABEL.test(toLatinDigits(label))) {
      for (let i = 0; i < values.length; i++) if (values[i] !== null) totalsRow[i] = values[i]
      continue
    }
    if (values.every(v => v === null)) continue
    items.push({ label, values })
  }
  if (items.length < 2) return null

  // نوع ماتریس: اگر ستون‌ها سال‌های شمسی باشند → ماتریس سالانه
  const yearCols = columns.filter(c => c.year !== undefined).length
  const matrixKind: ParsedMatrixSheet['matrixKind'] = yearCols >= 2 ? 'year' : /قرارداد/.test(toLatinDigits(title + ' ' + columns.map(c => c.label).join(' '))) ? 'contract' : 'other'

  // افزودن زیرعنوان به برچسب ستون (بازه تاریخ قرارداد)
  if (subRow !== null) {
    columns.forEach((col, i) => {
      const sub = cleanLabel(grid[subRow as number][colIdx[i]])
      if (sub && sub !== '*' && !isMasked(sub) && !/^1[34]\d{2}$/.test(toLatinDigits(sub)) && toNumber(sub) === null) col.sub = sub
    })
  }

  return { kind: 'matrix', name: sh.name, title, matrixKind, columns, items, totalsRow, maskedCells }
}

// ─────────────────────────── تحلیل اصلی ───────────────────────────

interface ServiceCell { item: string; unit: string; unitPrice: number | null; year: number; month: number; qty: number | null; amount: number | null }
interface FinanceCell { year: number; month: number | null; kind: string; amount: number | null; label: string; hint: string }

const FIN_KINDS = ['clinics', 'contractMgmt', 'clinicsTotal', 'assoc', 'servicesTotal', 'vat', 'grandTotal'] as const

export function buildDeepAnalysis(sourceName: string, workbookBuffers: { name: string; buffer: Buffer }[]): DeepAnalysis {
  const warnings: string[] = []
  const qualityNotes: string[] = []
  let maskedTotal = 0
  let totalRowsSkipped = 0
  const sheetsUsed: DeepAnalysis['sheetsUsed'] = []

  const serviceCells: ServiceCell[] = []
  const finCells: FinanceCell[] = []
  const matrices: DeepMatrix[] = []
  const itemMeta = new Map<string, { unit: string; unitPrice: number | null }>()

  for (const wbEntry of workbookBuffers) {
    let wb: XLSX.WorkBook
    try {
      wb = XLSX.read(wbEntry.buffer, { cellDates: true, sheetStubs: true })
    } catch {
      warnings.push(`فایل «${wbEntry.name}» قابل خواندن نبود.`)
      continue
    }
    for (const sheetName of wb.SheetNames) {
      const sh = readSheetGrid(wb.Sheets[sheetName], sheetName)
      if (!sh || sh.rowCount < 3) continue
      const sheetYear = /^1[34]\d{2}$/.test(toLatinDigits(sheetName).trim()) ? parseInt(toLatinDigits(sheetName).trim(), 10) : 0

      const detail = parseDetailSheet(sh, sheetYear)
      if (detail) {
        let serviceRows = 0
        let specialRows = 0
        for (const row of detail.rows) {
          if (row.kind === 'service') {
            serviceRows++
            for (const cell of row.cells) {
              if (cell.isTotal || cell.month === null) continue
              if (cell.qty === null && cell.amount === null) continue
              serviceCells.push({
                item: row.label, unit: row.unit, unitPrice: row.unitPrice,
                year: detail.year, month: cell.month, qty: cell.qty, amount: cell.amount,
              })
              const prev = itemMeta.get(row.label)
              if (!prev || (row.unitPrice && !prev.unitPrice)) itemMeta.set(row.label, { unit: row.unit, unitPrice: row.unitPrice ?? prev?.unitPrice ?? null })
            }
          } else if ((FIN_KINDS as readonly string[]).includes(row.kind)) {
            specialRows++
            for (const cell of row.cells) {
              if (cell.amount === null) continue
              finCells.push({ year: detail.year, month: cell.isTotal ? null : cell.month, kind: row.kind, amount: cell.amount, label: row.label, hint: row.unit })
            }
          }
        }
        maskedTotal += detail.maskedCells
        totalRowsSkipped += specialRows
        if (serviceRows >= 3) sheetsUsed.push({ name: sheetName, kind: 'تفصیلی ماهانه', rows: serviceRows })
        continue
      }

      const matrix = parseMatrixSheet(sh)
      if (matrix) {
        matrices.push({
          title: matrix.title, kind: matrix.matrixKind,
          columns: matrix.columns,
          items: matrix.items.map(it => ({ label: it.label, values: it.values, total: it.values.reduce((s: number, v) => s + (v ?? 0), 0) })),
          totalsRow: matrix.totalsRow,
        })
        maskedTotal += matrix.maskedCells
        sheetsUsed.push({ name: sheetName, kind: matrix.matrixKind === 'year' ? 'ماتریس سالانه' : matrix.matrixKind === 'contract' ? 'ماتریس قراردادها' : 'ماتریس', rows: matrix.items.length })
      }
      // سایر شیت‌ها: موتور عمومی پوشش می‌دهد
    }
  }

  // ── آیا داده کافی برای تحلیل عمیق داریم؟ ──
  const itemsSet = new Set(serviceCells.map(c => c.item))
  const yearsSet = new Set(serviceCells.map(c => c.year))
  const years = [...yearsSet].sort((a, b) => a - b)
  const hasMonthly = serviceCells.length >= 6
  const enough = (itemsSet.size >= 2 && (yearsSet.size >= 2 || hasMonthly)) || matrices.length > 0

  const base: DeepAnalysis = {
    ok: enough, sourceName, years, monthsWithData: 0,
    kpis: [], annual: [], monthly: [], seasonal: [], items: [], finance: [],
    vatTotal: 0, grandTotalAll: 0, servicesTotalAll: 0, volumeAll: 0,
    matrices, swot: { s: [], w: [], o: [], t: [] },
    recommendations: [], suggestedKpis: [], insights: [], integrity: [],
    quality: { maskedCells: maskedTotal, totalRowsSkipped, notes: qualityNotes },
    sheetsUsed, warnings,
  }
  if (!enough) {
    base.reason = 'ساختار چندسطحی ماهانه/سالانه در فایل شناسایی نشد؛ گزارش عمومی سامانه ارائه می‌شود.'
    return base
  }

  // ── تجمیع اقلام ──
  const itemAgg = new Map<string, { amount: number; qty: number; activeMonths: number; byYear: Map<number, { amount: number; qty: number }> }>()
  for (const c of serviceCells) {
    let it = itemAgg.get(c.item)
    if (!it) { it = { amount: 0, qty: 0, activeMonths: 0, byYear: new Map() }; itemAgg.set(c.item, it) }
    if (c.amount !== null) it.amount += c.amount
    if (c.qty !== null && c.qty > 0) { it.qty += c.qty; it.activeMonths++ }
    let by = it.byYear.get(c.year)
    if (!by) { by = { amount: 0, qty: 0 }; it.byYear.set(c.year, by) }
    if (c.amount !== null) by.amount += c.amount
    if (c.qty !== null && c.qty > 0) by.qty += c.qty
  }
  const servicesTotalAll = [...itemAgg.values()].reduce((s, v) => s + v.amount, 0)
  const volumeAll = [...itemAgg.values()].reduce((s, v) => s + v.qty, 0)

  const items: DeepItem[] = [...itemAgg.entries()].map(([label, it]) => {
    const yearKeys = [...it.byYear.keys()].sort((a, b) => a - b)
    const first = yearKeys.length ? it.byYear.get(yearKeys[0])! : null
    const last = yearKeys.length ? it.byYear.get(yearKeys[yearKeys.length - 1])! : null
    const prev = yearKeys.length >= 2 ? it.byYear.get(yearKeys[yearKeys.length - 2])! : null
    const meta = itemMeta.get(label)
    return {
      label,
      unit: meta?.unit ?? '',
      unitPrice: meta?.unitPrice ?? null,
      totalAmount: it.amount,
      totalQty: it.qty,
      share: servicesTotalAll ? (it.amount / servicesTotalAll) * 100 : 0,
      activeMonths: it.activeMonths,
      avgPerUnit: it.qty > 0 ? it.amount / it.qty : null,
      byYear: yearKeys.map(y => ({ year: y, amount: it.byYear.get(y)!.amount, qty: it.byYear.get(y)!.qty })),
      growthFirstLast: first && last && first.amount > 0 ? ((last.amount - first.amount) / first.amount) * 100 : null,
      growthLast: prev && last && prev.amount > 0 ? ((last.amount - prev.amount) / prev.amount) * 100 : null,
    }
  }).sort((a, b) => b.totalAmount - a.totalAmount)

  // ── سالانه ──
  const yearAgg = new Map<number, { revenue: number; volume: number; months: Set<string> }>()
  for (const c of serviceCells) {
    let y = yearAgg.get(c.year)
    if (!y) { y = { revenue: 0, volume: 0, months: new Set() }; yearAgg.set(c.year, y) }
    if (c.amount !== null) y.revenue += c.amount
    if (c.qty !== null) y.volume += c.qty
    y.months.add(`${c.year}-${String(c.month).padStart(2, '0')}`)
  }
  const yearsSorted = [...yearAgg.keys()].sort((a, b) => a - b)
  let prevRev: number | null = null
  let prevVol: number | null = null
  let prevYearFull = false
  const annual: DeepAnnual[] = yearsSorted.map(y => {
    const a = yearAgg.get(y)!
    // سال کامل: هم ۱۲ ماه مجزا، هم پوشش از فروردین تا اسفند (حالت سرستون‌های ادغام‌شده)
    const full = a.months.size >= 12 || (a.months.has(`${y}-01`) && a.months.has(`${y}-12`))
    const row: DeepAnnual = {
      year: y, revenue: a.revenue, volume: a.volume,
      // رشد فقط وقتی معنادار است که هر دو سال کامل باشند (سال ناقص مقایسه را گمراه می‌کند)
      revenueGrowth: prevRev !== null && prevRev > 0 && prevYearFull && full ? ((a.revenue - prevRev) / prevRev) * 100 : null,
      volumeGrowth: prevVol !== null && prevVol > 0 && prevYearFull && full ? ((a.volume - prevVol) / prevVol) * 100 : null,
      share: servicesTotalAll ? (a.revenue / servicesTotalAll) * 100 : 0,
      monthsInYear: a.months.size,
      partial: !full,
    }
    prevRev = a.revenue
    prevVol = a.volume
    prevYearFull = full
    return row
  })

  // ── ماهانه ──
  const monthAgg = new Map<string, { y: number; m: number; revenue: number; volume: number }>()
  for (const c of serviceCells) {
    const key = `${c.year}-${String(c.month).padStart(2, '0')}`
    let mm = monthAgg.get(key)
    if (!mm) { mm = { y: c.year, m: c.month, revenue: 0, volume: 0 }; monthAgg.set(key, mm) }
    if (c.amount !== null) mm.revenue += c.amount
    if (c.qty !== null) mm.volume += c.qty
  }
  let prevM: { revenue: number } | null = null
  const monthly: DeepMonthlyPoint[] = [...monthAgg.entries()]
    .sort((a, b) => (a[1].y - b[1].y) || (a[1].m - b[1].m))
    .map(([key, mm]) => {
      const pt: DeepMonthlyPoint = {
        key, y: mm.y, m: mm.m,
        label: `${MONTH_FA[mm.m - 1]} ${faNum(mm.y)}`,
        revenue: mm.revenue, volume: mm.volume,
        growth: prevM && prevM.revenue > 0 ? ((mm.revenue - prevM.revenue) / prevM.revenue) * 100 : null,
      }
      prevM = { revenue: mm.revenue }
      return pt
    })

  // ── الگوی فصلی ──
  const seasonAgg = new Map<number, { total: number; years: Set<number> }>()
  for (const mm of monthly) {
    let s = seasonAgg.get(mm.m)
    if (!s) { s = { total: 0, years: new Set() }; seasonAgg.set(mm.m, s) }
    s.total += mm.revenue
    s.years.add(mm.y)
  }
  const seasonal: DeepSeasonal[] = MONTH_FA.map((label, i) => {
    const s = seasonAgg.get(i + 1)
    return {
      m: i + 1, label,
      totalRevenue: s?.total ?? 0,
      yearsCovered: s?.years.size ?? 0,
      avgRevenue: s && s.years.size ? s.total / s.years.size : 0,
    }
  })

  // ── ساختار مالی ──
  const finAgg = new Map<number, DeepFinanceYear>()
  for (const y of yearsSorted) {
    finAgg.set(y, {
      year: y, clinics: null, clinicsShareLabel: '۷۰٪', contractMgmt: null, clinicsTotal: null,
      assoc: null, servicesTotal: null, vat: null, vatRateLabel: '۹٪', grandTotal: null,
    })
  }
  for (const f of finCells) {
    const fy = finAgg.get(f.year)
    if (!fy) continue
    if (f.month !== null) continue // ساختار از ستون «مجموع تمامی ماه‌ها»
    const rates = ratesInLabel(f.label)
    switch (f.kind) {
      case 'clinics':
        fy.clinics = (fy.clinics ?? 0) + (f.amount ?? 0)
        { const sh = shareInLabel(f.hint); if (sh) fy.clinicsShareLabel = sh }
        break
      case 'contractMgmt': fy.contractMgmt = (fy.contractMgmt ?? 0) + (f.amount ?? 0); break
      case 'clinicsTotal': fy.clinicsTotal = (fy.clinicsTotal ?? 0) + (f.amount ?? 0); break
      case 'assoc': fy.assoc = (fy.assoc ?? 0) + (f.amount ?? 0); break
      case 'servicesTotal': fy.servicesTotal = (fy.servicesTotal ?? 0) + (f.amount ?? 0); break
      case 'vat':
        fy.vat = (fy.vat ?? 0) + (f.amount ?? 0)
        if (rates) fy.vatRateLabel = rates
        break
      case 'grandTotal': fy.grandTotal = (fy.grandTotal ?? 0) + (f.amount ?? 0); break
    }
  }
  const finance = [...finAgg.values()].sort((a, b) => a.year - b.year)
  const vatTotal = finance.reduce((s, f) => s + (f.vat ?? 0), 0)
  const grandTotalAll = finance.reduce((s, f) => s + (f.grandTotal ?? 0), 0)
  // اگر شیت تفصیلی موجود نبود ولی ردیف مجموع فایل هست، همان مبنا قرار می‌گیرد
  const declaredServices = finance.reduce((s, f) => s + (f.servicesTotal ?? 0), 0)
  if (servicesTotalAll === 0 && declaredServices > 0) base.servicesTotalAll = declaredServices

  // صحت‌سنجی: کل عملکرد ریالی (خدمات + تجهیز/مدیریت پیمان + انجمن) در برابر ردیف «مجموع ریالی خدمات» هر سال
  for (const f of finance) {
    if (f.servicesTotal === null || f.servicesTotal === 0) continue
    const infra = f.clinicsTotal ?? ((f.clinics ?? 0) + (f.contractMgmt ?? 0))
    const computed = (yearAgg.get(f.year)?.revenue ?? 0) + infra + (f.assoc ?? 0)
    const diffPct = Math.abs(computed - f.servicesTotal) / f.servicesTotal * 100
    base.integrity.push({ year: f.year, computed, declared: f.servicesTotal, diffPct })
  }

  // ── بازگشت (Fallback): فقط ماتریس سالانه موجود است — حجم سالانه از ماتریس ──
  if (annual.length === 0) {
    const yearMatrix = matrices.find(m => m.kind === 'year')
    if (yearMatrix) {
      const cols = yearMatrix.columns.map(c => c.year ?? 0).filter(y => y > 0)
      const yearTotals = cols.map((y, i) => ({
        year: y,
        volume: yearMatrix.items.reduce((s, it) => s + (it.values[i] ?? 0), 0),
      })).filter(r => r.volume > 0).sort((a, b) => a.year - b.year)
      let prev: number | null = null
      for (const r of yearTotals) {
        annual.push({
          year: r.year, revenue: 0, volume: r.volume,
          revenueGrowth: null,
          volumeGrowth: prev !== null && prev > 0 ? ((r.volume - prev) / prev) * 100 : null,
          share: 0,
          monthsInYear: 12,
          partial: false,
        })
        prev = r.volume
      }
      if (volumeAll === 0) base.volumeAll = yearTotals.reduce((s, r) => s + r.volume, 0)
    }
  }

  // ── KPIها ──
  const lastAnnual = annual[annual.length - 1]
  const kpis: DeepKpi[] = []
  kpis.push({
    id: 'd-kpi-revenue', label: 'درآمد کل خدمات', value: servicesTotalAll, fmt: 'currency', unitHint: 'ریال',
    sub: years.length ? `طی ${faNum(years.length)} سال ${faNum(years[0])} تا ${faNum(years[years.length - 1])}` : undefined,
  })
  if (lastAnnual?.revenueGrowth !== null && lastAnnual?.revenueGrowth !== undefined) {
    kpis.push({
      id: 'd-kpi-growth', label: `رشد درآمد ${faNum(lastAnnual.year)}`, value: lastAnnual.revenueGrowth, fmt: 'percent',
      tone: lastAnnual.revenueGrowth >= 0 ? 'up' : 'down',
      sub: `نسبت به سال ${faNum(lastAnnual.year - 1)}`,
    })
  }
  if (volumeAll > 0) {
    kpis.push({
      id: 'd-kpi-volume', label: 'حجم کل خدمات', value: volumeAll, fmt: 'number',
      sub: `در ${faNum(items.length)} خدمت و ${faNum(monthly.length)} ماه`,
    })
  }
  kpis.push({
    id: 'd-kpi-items', label: 'اقلام خدمتی فعال', value: items.filter(i => i.totalAmount > 0 || i.totalQty > 0).length, fmt: 'number',
    sub: `از مجموع ${faNum(items.length)} قلم شناسایی‌شده`,
  })
  if (grandTotalAll > 0) {
    kpis.push({
      id: 'd-kpi-grand', label: 'درآمد کل + مالیات', value: grandTotalAll, fmt: 'currency', unitHint: 'ریال',
      sub: vatTotal > 0 ? `شامل ${faGroupShort(vatTotal)} ریال مالیات بر ارزش افزوده` : undefined,
    })
  }
  if (servicesTotalAll > 0 && volumeAll > 0) {
    kpis.push({
      id: 'd-kpi-unit', label: 'میانگین درآمد هر واحد خدمت', value: servicesTotalAll / volumeAll, fmt: 'currency', unitHint: 'ریال',
      sub: 'کل درآمد تقسیم بر کل حجم خدمات',
    })
  }
  if (monthly.length >= 2) {
    const peak = monthly.reduce((a, b) => (b.revenue > a.revenue ? b : a))
    kpis.push({
      id: 'd-kpi-peak', label: 'اوج درآمد ماهانه', value: peak.revenue, fmt: 'currency', unitHint: 'ریال',
      sub: `در ${peak.label}`,
    })
  }
  base.kpis = kpis

  // ── بینش‌های عمیق ──
  const insights: DeepInsight[] = []
  const top = items[0]
  if (top && top.share > 0) {
    insights.push({
      tone: top.share > 50 ? 'warn' : 'good', icon: 'trophy',
      title: `موتور اصلی درآمد: ${top.label}`,
      text: `«${top.label}» با ${faPct1(top.share)} از کل درآمد (${faGroupShort(top.totalAmount)} ریال در ${faNum(top.activeMonths)} ماه فعالیت)، بزرگ‌ترین منبع درآمد شرکت است.`,
    })
  }
  const top3 = items.slice(0, 3).reduce((s, i) => s + i.share, 0)
  if (items.length >= 3) {
    insights.push({
      tone: top3 >= 70 ? 'warn' : 'info', icon: 'pie',
      title: 'تمرکز سبد خدمات',
      text: `سه خدمت نخست (${items.slice(0, 3).map(i => `«${i.label}»`).join('، ')}) در مجموع ${faPct1(top3)} از درآمد را می‌سازند؛ ${top3 >= 70 ? 'تمرکز بالا، ریسک وابستگی به محدود شدن این خدمات را افزایش می‌دهد.' : 'ترکیب سبد نسبتاً متعادل است.'}`,
    })
  }
  if (annual.length >= 2) {
    const validGrowth = annual.filter(a => a.revenueGrowth !== null)
    const best = validGrowth.sort((a, b) => (b.revenueGrowth ?? 0) - (a.revenueGrowth ?? 0))[0]
    const worst = validGrowth.sort((a, b) => (a.revenueGrowth ?? 0) - (b.revenueGrowth ?? 0))[0]
    if (best) insights.push({
      tone: 'good', icon: 'trend',
      title: `سال طلایی: ${faNum(best.year)}`,
      text: `درآمد در سال ${faNum(best.year)} با ${faPct1(best.revenueGrowth ?? 0)} رشد نسبت به سال قبل به ${faGroupShort(best.revenue)} ریال رسید — بالاترین رشد ثبت‌شده در میان سال‌های کامل.`,
    })
    if (worst && best && worst.year !== best.year) insights.push({
      tone: (worst.revenueGrowth ?? 0) < 0 ? 'bad' : 'info', icon: 'trend',
      title: `کندترین رشد: ${faNum(worst.year)}`,
      text: `درآمد این سال ${faPct1(Math.abs(worst.revenueGrowth ?? 0))} ${((worst.revenueGrowth ?? 0) >= 0 ? 'رشد' : 'کاهش')} داشته است؛ ${((worst.revenueGrowth ?? 0) >= 0 ? 'کند شدن شتاب رشد نیازمند بررسی عوامل (قیمت، حجم، قرارداد) است.' : 'بررسی عوامل کاهش (قیمت، حجم، قرارداد) پیشنهاد می‌شود.')}`,
    })
    const partials = annual.filter(a => a.partial)
    if (partials.length) {
      insights.push({
        tone: 'info', icon: 'calendar',
        title: 'سال‌های با بازه ناقص',
        text: `${partials.map(p => `${faNum(p.year)} (${faNum(p.monthsInYear)} ماه)`).join('، ')} کامل پوشش داده نشده‌اند؛ مقایسه مستقیم این سال‌ها با سال‌های کامل گمراه‌کننده است و از محاسبه نرخ رشد حذف شدند.`,
      })
    }
  }
  const seasonPeak = [...seasonal].filter(s => s.avgRevenue > 0).sort((a, b) => b.avgRevenue - a.avgRevenue)[0]
  const seasonLow = [...seasonal].filter(s => s.avgRevenue > 0).sort((a, b) => a.avgRevenue - b.avgRevenue)[0]
  if (seasonPeak && seasonLow && seasonPeak.m !== seasonLow.m) {
    insights.push({
      tone: 'info', icon: 'calendar',
      title: `الگوی فصلی: اوج در ${seasonPeak.label}`,
      text: `میانگین درآمد ${seasonPeak.label} ${faGroupShort(seasonPeak.avgRevenue)} ریال است — حدود ${faNum(Math.round(seasonPeak.avgRevenue / Math.max(1, seasonLow.avgRevenue)))} برابرِ کم‌درآمدترین ماه (${seasonLow.label}). برنامه‌ریزی ظرفیت و نقدینگی باید با این الگو هم‌راستا باشد.`,
    })
  }
  const risers = items.filter(i => i.growthLast !== null && i.growthLast > 20 && i.byYear.length >= 2 && i.byYear[i.byYear.length - 1].amount > 0)
  if (risers.length) {
    const r = risers.sort((a, b) => (b.growthLast ?? 0) - (a.growthLast ?? 0))[0]
    insights.push({
      tone: 'good', icon: 'spark',
      title: `خدمت صعودی: ${r.label}`,
      text: `درآمد این خدمت در آخرین سال ${faPct1(r.growthLast ?? 0)} رشد کرده و به ${faGroupShort(r.byYear[r.byYear.length - 1].amount)} ریال رسیده است؛ ظرفیت توسعه آن بررسی شود.`,
    })
  }
  const decliners = items.filter(i => i.growthLast !== null && i.growthLast < -20 && i.byYear.length >= 2)
  if (decliners.length) {
    const d = decliners.sort((a, b) => (a.growthLast ?? 0) - (b.growthLast ?? 0))[0]
    insights.push({
      tone: 'bad', icon: 'trend',
      title: `خدمت رو به افت: ${d.label}`,
      text: `درآمد «${d.label}» در آخرین سال ${faPct1(Math.abs(d.growthLast ?? 0))} کاهش یافته است؛ تداوم این روند سهم درآمد را جابه‌جا می‌کند.`,
    })
  }
  const zeros = items.filter(i => (i.byYear[i.byYear.length - 1]?.amount ?? 0) === 0 && i.totalAmount > 0)
  if (zeros.length) {
    insights.push({
      tone: 'warn', icon: 'shield',
      title: 'خدمات بدون فعالیت در سال جاری',
      text: `${faNum(zeros.length)} خدمت (${zeros.slice(0, 4).map(z => `«${z.label}»`).join('، ')}${zeros.length > 4 ? ' و …' : ''}) در آخرین سال هیچ درآمدی ثبت نکرده‌اند؛ بازنگری قرارداد یا حذف از سبد تصمیم‌گیری شود.`,
    })
  }
  const priceMismatch = items.filter(i => i.avgPerUnit !== null && i.unitPrice !== null && i.unitPrice > 0 && Math.abs(i.avgPerUnit - i.unitPrice) / i.unitPrice > 0.15)
  if (priceMismatch.length) {
    insights.push({
      tone: 'info', icon: 'shield',
      title: 'اختلاف قیمت واحد و عملکرد',
      text: `در ${faNum(priceMismatch.length)} خدمت، میانگین درآمد هر واحد بیش از ۱۵٪ با قیمت واحد اعلام‌شده فاصله دارد (مثل «${priceMismatch[0].label}»)؛ معمولاً نشانه تغییر نرخ در طول دوره یا اجرای ناقص است.`,
    })
  }
  if (base.integrity.length) {
    const okCount = base.integrity.filter(i => i.diffPct < 1).length
    insights.push({
      tone: okCount === base.integrity.length ? 'good' : 'warn', icon: 'shield',
      title: 'صحت‌سنجی محاسبات',
      text: okCount === base.integrity.length
        ? `کل عملکرد ریالی بازمحاسبه‌شده (خدمات + تجهیز و مدیریت پیمان + انجمن) در همه سال‌ها با ردیف «مجموع ریالی خدمات» فایل منطبق است (اختلاف کمتر از ۱٪)؛ پایه محاسبات قابل اعتماد است.`
        : `در ${faNum(base.integrity.length - okCount)} سال، کل عملکرد بازمحاسبه‌شده با ردیف مجموع فایل فاصله دارد؛ ترکیب ردیف‌های فایل باید بازبینی شود.`,
    })
  }
  if (maskedTotal > 0) {
    insights.push({
      tone: 'warn', icon: 'shield',
      title: 'سلول‌های پوشانده‌شده',
      text: `${faNum(maskedTotal)} سلول در فایل به‌صورت «.......» پوشانده شده است (معمولاً مقادیر ستون مقدارِ ردیف‌های هزینه‌ای)؛ این سلول‌ها از محاسبات حذف و فقط مبلغ آن‌ها لحاظ شد.`,
    })
  }
  base.insights = insights

  // ── SWOT ──
  const swot = { s: [] as string[], w: [] as string[], o: [] as string[], t: [] as string[] }
  if (lastAnnual && lastAnnual.revenueGrowth !== null && lastAnnual.revenueGrowth > 0)
    swot.s.push(`رشد ${faPct1(lastAnnual.revenueGrowth)} درآمد در سال ${faNum(lastAnnual.year)}`)
  if (items.length >= 8) swot.s.push(`تنوع ${faNum(items.length)} خدمتی و پوشش چند حوزه روانشناختی`)
  if (top) swot.s.push(`جایگاه تثبیت‌شده «${top.label}» با ${faPct1(top.share)} از درآمد`)
  if (decliners.length) swot.w.push(`افت درآمد در ${faNum(decliners.length)} خدمت (${decliners.slice(0, 3).map(d => d.label).join('، ')})`)
  if (zeros.length) swot.w.push(`${faNum(zeros.length)} خدمت بدون فعالیت در سال جاری`)
  const zeroMonths = seasonal.filter(s => s.avgRevenue === 0).map(s => s.label)
  if (zeroMonths.length) swot.w.push(`عدم پوشش درآمدی در ماه‌های ${zeroMonths.join('، ')}`)
  if (seasonLow && seasonPeak && seasonPeak.avgRevenue > 0) swot.o.push(`ظرفیت رشد در ${seasonLow.label}: اختلاف ${faPct1((1 - seasonLow.avgRevenue / seasonPeak.avgRevenue) * 100)} نسبت به اوج فصلی`)
  const smallButPricy = items.filter(i => i.share < 5 && i.avgPerUnit !== null && top?.avgPerUnit && i.avgPerUnit > top.avgPerUnit)
  if (smallButPricy.length) swot.o.push(`خدمات کم‌سهم با نرخ واحد بالا (${smallButPricy.slice(0, 2).map(i => i.label).join('، ')}) — پتانسیل توسعه`)
  if (matrices.some(m => m.kind === 'contract')) swot.o.push('چندقراردادی بودن کارنامه، فرصت مذاکره و تمدید پلکانی')
  if (top3 >= 70) swot.t.push(`وابستگی ${faPct1(top3)} درآمد به ۳ خدمت`)
  if (vatTotal > 0) swot.t.push(`مالیات بر ارزش افزوده ${faGroupShort(vatTotal)} ریال در بازه — فشار بر نقدینگی تسویه`)
  if (maskedTotal > 20) swot.t.push('شفافیت ناقص داده در ردیف‌های هزینه‌ای (سلول‌های پوشانده)')
  base.swot = swot

  // ── پیشنهادهای اجرایی ──
  const recs: { title: string; text: string }[] = []
  if (seasonLow && seasonPeak && seasonPeak.avgRevenue > 0) {
    recs.push({
      title: `فعال‌سازی ماه‌های کم‌درآمد (${seasonLow.label})`,
      text: `میانگین درآمد ${seasonLow.label} تنها ${faGroupShort(seasonLow.avgRevenue)} ریال در برابر ${faGroupShort(seasonPeak.avgRevenue)} ریال اوج (${seasonPeak.label}) است؛ تدوین برنامه خدماتی و پیشنهاد قرارداد برای این ماه می‌تواند تا ${faPct1(Math.min(50, (1 - seasonLow.avgRevenue / seasonPeak.avgRevenue) * 40))} درآمد ماهانه را جبران کند.`,
    })
  }
  if (decliners.length) {
    recs.push({
      title: 'بازنگری خدمات رو به افت',
      text: `برای ${faNum(decliners.length)} خدمت با افت بیش از ۲۰٪ (نخست: «${decliners[0].label}») جلسه بررسی علت (نرخ، تقاضا، ظرفیت) برگزار و برای هر یک تصمیم احیا/بازقیمت‌گذاری/حذف گرفته شود.`,
    })
  }
  if (top3 >= 70) {
    recs.push({
      title: 'کاهش ریسک تمرکز سبد',
      text: `با تکیه ${faPct1(top3)} درآمد بر ۳ خدمت، توسعه حداقل دو خدمت مکمل با نرخ واحد بالا (مانند ${smallButPricy[0]?.label ?? 'خدمات تخصصی'}) توصیه می‌شود تا سهم ۳ خدمت برتر طی دو سال به زیر ۶۰٪ برسد.`,
    })
  }
  if (finance.length >= 2 && vatTotal > 0) {
    recs.push({
      title: 'مدیریت نقدینگی مالیات ارزش افزوده',
      text: `مالیات محاسبه‌شده در بازه ${faGroupShort(vatTotal)} ریال است؛ زمان‌بندی وصول مطالبات قراردادها به‌گونه‌ای تنظیم شود که تعهد مالیات هر فصل با جریان ورودی هم‌پوشانی داشته باشد.`,
    })
  }
  if (priceMismatch.length) {
    recs.push({
      title: 'استانداردسازی ثبت قیمت و عملکرد',
      text: `اختلاف میانگین درآمد هر واحد با قیمت واحد در ${faNum(priceMismatch.length)} خدمت، از تغییر نرخ میانی دوره حکایت دارد؛ ثبت ستون «نرخ اعمال‌شده هر ماه» دقت تسویه و گزارش‌ها را تضمین می‌کند.`,
    })
  }
  base.recommendations = recs

  // ── اهداف کمّی پیشنهادی (KPI) ──
  const kpiSug: { label: string; target: string }[] = []
  if (lastAnnual) {
    const g = lastAnnual.revenueGrowth ?? 15
    kpiSug.push({ label: 'رشد سالانه درآمد', target: `حداقل ${faPct1(Math.max(10, Math.round(g)))} برای سال ${faNum(lastAnnual.year + 1)}` })
  }
  if (top3 > 0) kpiSug.push({ label: 'سقف تمرکز ۳ خدمت برتر', target: `کاهش از ${faPct1(top3)} به زیر ${faPct1(Math.max(50, top3 - 10))}` })
  if (servicesTotalAll > 0 && volumeAll > 0) kpiSug.push({ label: 'میانگین درآمد هر واحد خدمت', target: `افزایش ${faPct1(8)} از ${faGroupShort(servicesTotalAll / volumeAll)} ریال` })
  if (zeros.length) kpiSug.push({ label: 'احیای خدمات خاموش', target: `فعال‌سازی دست‌کم ${faNum(Math.max(2, Math.ceil(zeros.length / 2)))} خدمت از ${faNum(zeros.length)} خدمت بدون فعالیت` })
  if (base.integrity.length) kpiSug.push({ label: 'انطباق گزارش با مستندات', target: 'اختلاف جمع محاسباتی با ردیف مجموع فایل کمتر از ۱٪ در همه دوره‌ها' })
  base.suggestedKpis = kpiSug

  // ── نگاشت خروجی نهایی ──
  base.annual = annual
  base.monthly = monthly
  base.seasonal = seasonal
  base.items = items
  base.finance = finance
  base.servicesTotalAll = servicesTotalAll || declaredServices
  base.volumeAll = volumeAll
  base.vatTotal = vatTotal
  base.grandTotalAll = grandTotalAll
  base.monthsWithData = monthly.length

  // ── کیفیت داده ──
  if (maskedTotal > 0) qualityNotes.push(`${faNum(maskedTotal)} سلول پوشانده‌شده (.......) از محاسبات مقدار حذف شد`)
  if (totalRowsSkipped > 0) qualityNotes.push(`${faNum(totalRowsSkipped)} ردیف مالی ویژه (تجهیز، مدیریت پیمان، مالیات، مجموع‌ها) جداگانه شناسایی و در تحلیل ساختار مالی استفاده شد`)
  const monthsExpected = years.length * 12
  if (monthly.length < monthsExpected) qualityNotes.push(`${faNum(monthsExpected - monthly.length)} ماه از بازه ${faNum(years[0] ?? 0)} تا ${faNum(years[years.length - 1] ?? 0)} داده درآمدی ندارد`)

  return base
}

// ─────────────────────────── قالب‌بندی مشترک ───────────────────────────

export function faPct1(v: number): string {
  const r = Math.round(v * 10) / 10
  return `${faNum(r.toLocaleString('en-US', { maximumFractionDigits: 1 }).replace(/,/g, '٬'))}٪`
}

export function faGroupShort(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1e9) return `${faNum((Math.round(n / 1e8) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }).replace(/,/g, '٬'))} میلیارد`
  if (a >= 1e6) return `${faNum((Math.round(n / 1e5) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }).replace(/,/g, '٬'))} میلیون`
  if (a >= 1e3) return `${faNum(Math.round(n / 1e3).toLocaleString('en-US').replace(/,/g, '٬'))} هزار`
  return faNum(Math.round(n).toLocaleString('en-US').replace(/,/g, '٬'))
}
