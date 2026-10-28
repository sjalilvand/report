// موتور تحلیل‌های پیشرفته — بخش ۲۱.۲ و قواعد صحت ۲۱.۳ سند
// روند و پیش‌بینی سری زمانی، همبستگی، تحلیل گروه‌های زمانی (Cohort)،
// بخش‌بندی و تحلیل RFM، سناریوسازی (What-if) و تشخیص ناهنجاری
//
// قواعد الزامی ۲۱.۳ که در همه خروجی‌ها رعایت می‌شود:
// - رشد درصدی برای مبنای صفر/نامعتبر تعریف روشن دارد (null + هشدار)
// - دوره ناقص با دوره کامل مقایسه نمی‌شود مگر با هشدار صریح
// - تعداد نمونه و داده حذف‌شده در همه خروجی‌ها قابل مشاهده است
// - همبستگی به‌عنوان رابطه علّی گزارش نمی‌شود (یادداشت صریح)
// - پیش‌بینی همراه با روش، خطای ارزیابی و عدم قطعیت (بازه اطمینان) ارائه می‌شود

import { DataRow, FieldMeta, QueryFilter, QuerySpec } from './types'
import { num, matchFilter, runQuery } from './query'
import { parseDateValue } from './jalali'

export type Granularity = 'day' | 'month' | 'quarter' | 'year'

export interface SeriesPoint {
  key: string   // کلید مرتب‌پذیر دوره
  label: string // برچسب نمایشی شمسی
  value: number
}

export interface SeriesMeta {
  used: number          // تعداد رکورد وارد محاسبه
  skipped: number       // رکورد با تاریخ/مقدار نامعتبر کنار گذاشته‌شده (بخش ۲۱.۳)
  scannedRecords: number
  warnings: string[]
}

function pad(n: number): string { return String(n).padStart(2, '0') }

const QUARTER_FA = ['بهار', 'تابستان', 'پاییز', 'زمستان']

// دوره شمسی: کلید مرتب‌پذیر + برچسب فارسی — بخش ۱۵ سند
export function periodOf(jy: number, jm: number, jd: number, g: Granularity): { key: string; label: string } {
  switch (g) {
    case 'day': return { key: `${jy}-${pad(jm)}-${pad(jd)}`, label: `${jy}/${pad(jm)}/${pad(jd)}` }
    case 'month': return { key: `${jy}-${pad(jm)}`, label: `${jy}/${pad(jm)}` }
    case 'quarter': {
      const q = Math.floor((jm - 1) / 3) + 1
      return { key: `${jy}-Q${q}`, label: `${QUARTER_FA[q - 1]} ${jy}` }
    }
    case 'year': return { key: String(jy), label: `سال ${jy}` }
  }
}

// جابه‌جایی دوره به اندازه offset (برای دوره‌های پیش‌بینی)
export function shiftPeriod(jy: number, jm: number, g: Granularity, offset: number): { jy: number; jm: number } {
  const monthsPerUnit = g === 'year' ? 12 : g === 'quarter' ? 3 : 1
  const total = jy * 12 + (jm - 1) + offset * monthsPerUnit
  return { jy: Math.floor(total / 12), jm: (total % 12 + 12) % 12 + 1 }
}

// استخراج دوره شمسی از مقدار خام (رشته شمسی/میلادی/سریال اکسل)
function parsePeriod(raw: unknown, g: Granularity): { key: string; label: string; iso: string; jy: number; jm: number } | null {
  const p = parseDateValue(raw)
  if (!p.ok || p.jy === undefined || p.jm === undefined) return null
  const pr = periodOf(p.jy, p.jm, p.jd ?? 1, g)
  return { key: pr.key, label: pr.label, iso: p.iso ?? `${p.jy}-${pad(p.jm)}-${pad(p.jd ?? 1)}`, jy: p.jy, jm: p.jm }
}

// اعمال فیلترهای سراسری — همان قاعده پرس‌وجوی گزارش (بخش ۱۳)
function applyFilters(records: DataRow[], fields: FieldMeta[], filters: QueryFilter[], warnings: string[]): DataRow[] {
  let data = records
  for (const flt of filters) {
    if (!fields.some(f => f.id === flt.fieldId)) {
      warnings.push(`فیلتر برای ستون ناشناخته «${flt.fieldId}» نادیده گرفته شد.`)
      continue
    }
    data = data.filter(r => matchFilter(r[flt.fieldId], flt))
  }
  return data
}

// ساخت سری زمانی تجمیعی — پایه روند، پیش‌بینی و ناهنجاری
export function buildTimeSeries(
  records: DataRow[],
  fields: FieldMeta[],
  dateFieldId: string,
  measureFieldId: string | undefined,
  agg: string,
  g: Granularity,
  filters: QueryFilter[] = []
): { points: SeriesPoint[]; meta: SeriesMeta; lastPeriod: { jy: number; jm: number } | null } {
  const warnings: string[] = []
  const data = applyFilters(records, fields, filters, warnings)
  const scanned = data.length

  const byPeriod = new Map<string, { label: string; vals: number[]; jy: number; jm: number; isoMax: string }>()
  let skipped = 0
  for (const r of data) {
    const per = parsePeriod(r[dateFieldId], g)
    if (!per) { skipped++; continue }
    let v: number | null = null
    if (agg === 'count') {
      v = 1
    } else {
      v = num(r[measureFieldId ?? ''])
      if (v === null) { skipped++; continue }
    }
    const cur = byPeriod.get(per.key)
    if (cur) {
      cur.vals.push(v)
      if (per.iso > cur.isoMax) cur.isoMax = per.iso
    } else {
      byPeriod.set(per.key, { label: per.label, vals: [v], jy: per.jy, jm: per.jm, isoMax: per.iso })
    }
  }

  if (byPeriod.size === 0) {
    warnings.push('هیچ رکورد معتبری با تاریخ قابل خواندن یافت نشد؛ ستون تاریخ را در «ستون‌ها» تأیید کنید (بخش ۲۱.۳ سند).')
    return { points: [], meta: { used: 0, skipped, scannedRecords: scanned, warnings }, lastPeriod: null }
  }

  const points: SeriesPoint[] = [...byPeriod.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, cur]) => ({
      key,
      label: cur.label,
      value: aggValue(cur.vals, agg),
    }))

  if (skipped > 0) {
    warnings.push(`${skipped.toLocaleString('fa-IR')} رکورد با تاریخ یا مقدار نامعتبر از محاسبه کنار گذاشته شد (بخش ۲۱.۳ سند).`)
  }
  if (points.length < 3) {
    warnings.push('تعداد دوره‌های زمانی کمتر از ۳ است؛ روند و پیش‌بینی معنادار نخواهد بود.')
  }

  const last = points[points.length - 1]
  const lastMeta = byPeriod.get(last.key)
  return { points, meta: { used: scanned - skipped, skipped, scannedRecords: scanned, warnings }, lastPeriod: lastMeta ? { jy: lastMeta.jy, jm: lastMeta.jm } : null }
}

function aggValue(vals: number[], agg: string): number {
  switch (agg) {
    case 'count': return vals.length
    case 'sum': return vals.reduce((s, v) => s + v, 0)
    case 'avg': return vals.reduce((s, v) => s + v, 0) / vals.length
    case 'min': return Math.min(...vals)
    case 'max': return Math.max(...vals)
    case 'median': {
      const s = [...vals].sort((a, b) => a - b)
      const mid = Math.floor(s.length / 2)
      return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
    }
    default: return vals.reduce((s, v) => s + v, 0)
  }
}

// ---------------------------------------------------------------
// روند و پیش‌بینی سری زمانی — بخش ۲۱.۲ (پیش‌بینی سری زمانی)
// روش: رگرسیون خطی کمینه مربعات + بازه عدم قطعیت ۹۵٪ (۱٫۹۶ × خطای معیار باقیمانده)
// خطای ارزیابی: MAE و MAPE روی دوره‌های مشاهده‌شده (قاعده ۲۱.۳)
// ---------------------------------------------------------------

export interface ForecastPoint {
  label: string
  value: number
  lo: number
  hi: number
  isForecast: boolean
}

export interface TrendResult {
  history: SeriesPoint[]
  fit: ForecastPoint[]        // خط روند روی دوره‌های مشاهده‌شده
  forecast: ForecastPoint[]   // دوره‌های آینده با بازه عدم قطعیت
  slope: number
  intercept: number
  r2: number
  mae: number
  mape: number | null         // برای مبنای صفر تعریف ندارد → null + هشدار (بخش ۲۱.۳)
  direction: 'up' | 'down' | 'flat'
  method: string
  meta: SeriesMeta
}

export function trendForecast(
  records: DataRow[],
  fields: FieldMeta[],
  params: { dateField: string; measureField?: string; agg?: string; granularity?: Granularity; horizon?: number },
  filters: QueryFilter[] = []
): TrendResult {
  const g = params.granularity ?? 'month'
  const agg = params.agg ?? 'sum'
  const { points, meta, lastPeriod } = buildTimeSeries(records, fields, params.dateField, params.measureField, agg, g, filters)

  const n = points.length
  const empty: TrendResult = {
    history: points, fit: [], forecast: [], slope: 0, intercept: 0, r2: 0, mae: 0, mape: null,
    direction: 'flat', method: 'رگرسیون خطی کمینه مربعات', meta,
  }
  if (n < 3) return empty

  // رگرسیون خطی روی اندیس دوره‌ها
  const xs = points.map((_, i) => i)
  const ys = points.map(p => p.value)
  const meanX = xs.reduce((s, v) => s + v, 0) / n
  const meanY = ys.reduce((s, v) => s + v, 0) / n
  let sxy = 0, sxx = 0
  for (let i = 0; i < n; i++) { sxy += (xs[i] - meanX) * (ys[i] - meanY); sxx += (xs[i] - meanX) ** 2 }
  const slope = sxx === 0 ? 0 : sxy / sxx
  const intercept = meanY - slope * meanX

  const fit = points.map((p, i) => ({ label: p.label, value: intercept + slope * i, lo: intercept + slope * i, hi: intercept + slope * i, isForecast: false }))

  // باقیمانده‌ها و خطای معیار
  const residuals = ys.map((y, i) => y - (intercept + slope * i))
  const sse = residuals.reduce((s, r) => s + r * r, 0)
  const sst = ys.reduce((s, y) => s + (y - meanY) ** 2, 0)
  const r2 = sst === 0 ? 0 : Math.max(0, 1 - sse / sst)
  const dof = Math.max(1, n - 2)
  const sigma = Math.sqrt(sse / dof)

  // خطای ارزیابی — MAE همیشه؛ MAPE فقط وقتی هیچ مبنای صفر/نزدیک صفر نداریم (بخش ۲۱.۳)
  const mae = residuals.reduce((s, r) => s + Math.abs(r), 0) / n
  let mape: number | null = null
  if (ys.every(y => Math.abs(y) > 1e-9)) {
    mape = (ys.reduce((s, y, i) => s + Math.abs((y - (intercept + slope * i)) / y), 0) / n) * 100
  } else {
    meta.warnings.push('به دلیل وجود مبنای صفر یا نزدیک صفر، خطای MAPE تعریف‌نشده است؛ خطای MAE ملاک ارزیابی است (بخش ۲۱.۳ سند).')
  }

  // پیش‌بینی دوره‌های آینده با بازه عدم قطعیت ۹۵٪
  const horizon = Math.max(1, Math.min(12, Math.floor(params.horizon ?? 3)))
  const forecast: ForecastPoint[] = []
  if (lastPeriod) {
    for (let h = 1; h <= horizon; h++) {
      const shifted = shiftPeriod(lastPeriod.jy, lastPeriod.jm, g, h)
      const pr = periodOf(shifted.jy, shifted.jm, 1, g)
      // عدم قطعیت با فاصله از داده مشاهده‌شده افزایش می‌یابد (گسترش ساده خطا)
      const unc = 1.96 * sigma * Math.sqrt(1 + h / n)
      forecast.push({
        label: pr.label,
        value: intercept + slope * (n - 1 + h),
        lo: intercept + slope * (n - 1 + h) - unc,
        hi: intercept + slope * (n - 1 + h) + unc,
        isForecast: true,
      })
    }
  }

  // هشدار دوره ناقص — قاعده ۲۱.۳: مقایسه دوره ناقص با دوره کامل باید هشدار داشته باشد
  if (lastPeriod) {
    const now = new Date()
    const nowJ = parseDateValue(now.toISOString())
    if (nowJ.ok && nowJ.jy !== undefined && nowJ.jm !== undefined) {
      const nowKey = periodOf(nowJ.jy, nowJ.jm, 1, g).key
      const lastKey = points[n - 1].key
      if (nowKey === lastKey) {
        meta.warnings.push('آخرین دوره زمانی هنوز کامل نشده است؛ مقدار آن ناقص است و در مقایسه با دوره‌های کامل باید با احتیاط تفسیر شود (بخش ۲۱.۳ سند).')
      }
    }
  }

  const direction: 'up' | 'down' | 'flat' = slope > meanY * 0.001 + 1e-9 ? 'up' : slope < -1e-9 ? 'down' : 'flat'
  return {
    history: points, fit, forecast, slope, intercept, r2, mae, mape, direction,
    method: 'رگرسیون خطی کمینه مربعات + بازه عدم قطعیت ۹۵٪ (۱٫۹۶ × خطای معیار باقیمانده)',
    meta,
  }
}

// ---------------------------------------------------------------
// همبستگی پیرسون — بخش ۲۱.۲ (همبستگی) و قاعده ۲۱.۳ (نه رابطه علّی)
// ---------------------------------------------------------------

export interface CorrelationPair {
  fieldA: string
  fieldB: string
  labelA: string
  labelB: string
  r: number
  n: number
  strength: string
}

export interface CorrelationResult {
  fields: { id: string; label: string }[]
  matrix: number[][]
  topPairs: CorrelationPair[]
  method: string
  caveat: string
  meta: { used: number; skipped: number; scannedRecords: number; warnings: string[] }
}

export function correlation(
  records: DataRow[],
  fields: FieldMeta[],
  params: { fieldIds?: string[] },
  filters: QueryFilter[] = []
): CorrelationResult {
  const warnings: string[] = []
  const data = applyFilters(records, fields, filters, warnings)
  const scanned = data.length

  const numericTypes = new Set(['integer', 'decimal', 'amount', 'percent'])
  let numeric = fields.filter(f => numericTypes.has(f.type))
  if (params.fieldIds && params.fieldIds.length >= 2) {
    numeric = numeric.filter(f => params.fieldIds!.includes(f.id))
  }
  numeric = numeric.slice(0, 8) // حداکثر ۸ ستون برای خوانایی ماتریس

  const empty: CorrelationResult = {
    fields: [], matrix: [], topPairs: [],
    method: 'ضریب همبستگی پیرسون',
    caveat: 'همبستگی به معنای رابطه علّی نیست؛ صرفاً هم‌حرکتی خطی دو متغیر را نشان می‌دهد (بخش ۲۱.۳ سند).',
    meta: { used: 0, skipped: 0, scannedRecords: scanned, warnings },
  }
  if (numeric.length < 2) {
    warnings.push('حداقل دو ستون عددی برای محاسبه همبستگی لازم است.')
    return empty
  }

  // استخراج مقادیر هر ستون (مقدار نامعتبر = null)
  const cols: (number | null)[][] = numeric.map(f => data.map(r => num(r[f.id])))
  const used = data.filter((_, i) => cols.some(c => c[i] !== null)).length
  const skipped = scanned - used
  if (skipped > 0) warnings.push(`${skipped.toLocaleString('fa-IR')} رکورد بدون هیچ مقدار عددی معتبر کنار گذاشته شد (بخش ۲۱.۳ سند).`)

  // حذف جفتی (Pairwise deletion): هر جفت ستون فقط رکوردهایی که هر دو مقدار معتبر دارند را می‌سنجد — استاندارد ماتریس همبستگی
  const m = numeric.length
  const matrix: number[][] = Array.from({ length: m }, () => Array(m).fill(null))
  const pairs: CorrelationPair[] = []
  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      const xa: number[] = [], xb: number[] = []
      for (let i = 0; i < data.length; i++) {
        const va = cols[a][i], vb = cols[b][i]
        if (va !== null && vb !== null) { xa.push(va); xb.push(vb) }
      }
      if (xa.length < 3) {
        warnings.push(`همبستگی «${numeric[a].label}» و «${numeric[b].label}» محاسبه نشد: تعداد نمونه مشترک (${xa.length.toLocaleString('fa-IR')}) کمتر از ۳ است (بخش ۲۱.۳ سند).`)
        continue
      }
      const r = pearson(xa, xb)
      matrix[a][b] = r
      matrix[b][a] = r
      pairs.push({ fieldA: numeric[a].id, fieldB: numeric[b].id, labelA: numeric[a].label, labelB: numeric[b].label, r, n: xa.length, strength: strengthFa(r) })
    }
  }
  pairs.sort((p, q) => Math.abs(q.r) - Math.abs(p.r))

  return {
    fields: numeric.map(f => ({ id: f.id, label: f.label })),
    matrix,
    topPairs: pairs.slice(0, 10),
    method: 'ضریب همبستگی پیرسون با حذف جفتی مقادیر گمشده',
    caveat: 'همبستگی به معنای رابطه علّی نیست؛ صرفاً هم‌حرکتی خطی دو متغیر را نشان می‌دهد (بخش ۲۱.۳ سند).',
    meta: { used, skipped, scannedRecords: scanned, warnings },
  }
}

function pearson(x: number[], y: number[]): number {
  const n = x.length
  const mx = x.reduce((s, v) => s + v, 0) / n
  const my = y.reduce((s, v) => s + v, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return 0
  const r = sxy / Math.sqrt(sxx * syy)
  return Math.max(-1, Math.min(1, r))
}

function strengthFa(r: number): string {
  const a = Math.abs(r)
  if (a >= 0.8) return 'بسیار قوی'
  if (a >= 0.6) return 'قوی'
  if (a >= 0.4) return 'متوسط'
  if (a >= 0.2) return 'ضعیف'
  return 'بسیار ضعیف'
}

// ---------------------------------------------------------------
// تحلیل گروه‌های زمانی (Cohort) و حفظ/بازگشت مخاطبان — بخش ۲۱.۲
// شرط اجرا: وجود شناسه معتبر (بخش ۲۱.۲: «در صورت وجود شناسه معتبر»)
// ---------------------------------------------------------------

export interface CohortRow {
  cohort: string       // برچسب گروه (دوره نخست فعالیت)
  size: number         // اندازه گروه (تعداد شناسه متمایز)
  cells: { offset: number; count: number; pct: number | null }[]
}

export interface CohortResult {
  rows: CohortRow[]
  granularity: Granularity
  maxOffset: number
  method: string
  meta: { used: number; skipped: number; scannedRecords: number; warnings: string[] }
}

export function cohortAnalysis(
  records: DataRow[],
  fields: FieldMeta[],
  params: { idField: string; dateField: string; granularity?: Granularity },
  filters: QueryFilter[] = []
): CohortResult {
  const g = params.granularity ?? 'month'
  const warnings: string[] = []
  const data = applyFilters(records, fields, filters, warnings)
  const scanned = data.length

  // اعضای هر شناسه: دوره‌های فعالیت
  const idPeriods = new Map<string, Set<string>>()
  const periodLabel = new Map<string, string>()
  let skipped = 0
  const idVals = new Set<string>()
  for (const r of data) {
    const id = String(r[params.idField] ?? '').trim()
    const per = parsePeriod(r[params.dateField], g)
    if (!id || id === '—' || !per) { skipped++; continue }
    idVals.add(id)
    if (!idPeriods.has(id)) idPeriods.set(id, new Set())
    idPeriods.get(id)!.add(per.key)
    periodLabel.set(per.key, per.label)
  }

  if (skipped > 0) warnings.push(`${skipped.toLocaleString('fa-IR')} رکورد بدون شناسه یا تاریخ معتبر کنار گذاشته شد (بخش ۲۱.۳ سند).`)
  if (idPeriods.size === 0) {
    warnings.push('هیچ شناسه معتبری یافت نشد؛ تحلیل Cohort نیازمند ستون شناسه معتبر است (بخش ۲۱.۲ سند).')
    return { rows: [], granularity: g, maxOffset: 0, method: 'ماتریس حفظ مبتنی بر نخستین دوره فعالیت', meta: { used: 0, skipped, scannedRecords: scanned, warnings } }
  }

  // دوره نخست فعالیت هر شناسه = گروه (Cohort)
  const cohorts = new Map<string, Set<string>>() // cohortKey → ids
  for (const [id, periods] of idPeriods) {
    const first = [...periods].sort()[0]
    if (!cohorts.has(first)) cohorts.set(first, new Set())
    cohorts.get(first)!.add(id)
  }

  // فهرست مرتب همه دوره‌ها برای محاسبه offset
  const allPeriods = [...periodLabel.keys()].sort()
  const offsetOf = new Map(allPeriods.map((k, i) => [k, i]))

  const rows: CohortRow[] = [...cohorts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ck, ids]) => {
      const cells: CohortRow['cells'] = []
      const base = offsetOf.get(ck) ?? 0
      // اندازه گروه = شناسه‌هایی که در دوره نخست فعال بوده‌اند
      const size = ids.size
      for (let off = 0; off <= Math.min(12, allPeriods.length - 1 - base); off++) {
        const pk = allPeriods[base + off]
        // تعداد شناسه‌های این گروه که در دوره offset فعال بوده‌اند
        let count = 0
        for (const id of ids) {
          if (idPeriods.get(id)!.has(pk)) count++
        }
        cells.push({ offset: off, count, pct: off === 0 ? 100 : Math.round((count / size) * 1000) / 10 })
      }
      return { cohort: periodLabel.get(ck) ?? ck, size, cells }
    })

  if (rows.length > 12) {
    warnings.push(`تعداد گروه‌ها ${rows.length.toLocaleString('fa-IR')} گروه است؛ ۱۲ گروه نخست نمایش داده شد.`)
  }

  return {
    rows: rows.slice(0, 12),
    granularity: g,
    maxOffset: Math.max(0, ...rows.map(r => r.cells.length)) - 1,
    method: 'ماتریس حفظ مبتنی بر نخستین دوره فعالیت هر شناسه',
    meta: { used: scanned - skipped, skipped, scannedRecords: scanned, warnings },
  }
}

// ---------------------------------------------------------------
// بخش‌بندی و تحلیل RFM — بخش ۲۱.۲ («بخش‌بندی» و «تحلیل RFM، در صورت تناسب داده»)
// R = فاصله آخرین فعالیت تا مرجع (روز) | F = تعداد فعالیت | M = جمع مبلغ
// امتیازدهی: پنج‌ک (Quintile) ۱ تا ۵
// ---------------------------------------------------------------

export interface RfmCustomer {
  id: string
  recencyDays: number
  frequency: number
  monetary: number
  rScore: number
  fScore: number
  mScore: number
  segment: string
}

export interface RfmSegment {
  key: string
  label: string
  count: number
  pct: number
  avgFrequency: number
  avgMonetary: number
}

export interface RfmResult {
  customers: RfmCustomer[] // حداکثر ۱۰۰ ردیف برتر بر اساس مبلغ
  segments: RfmSegment[]
  totalCustomers: number
  referenceDate: string
  hasMonetary: boolean
  method: string
  meta: { used: number; skipped: number; scannedRecords: number; warnings: string[] }
}

const RFM_SEGMENTS: { key: string; label: string; test: (r: number, f: number) => boolean }[] = [
  { key: 'champion', label: 'قهرمان', test: (r, f) => r >= 4 && f >= 4 },
  { key: 'loyal', label: 'مشتری وفادار', test: (r, f) => r >= 3 && f >= 4 },
  { key: 'potential', label: 'وفادار بالقوه', test: (r, f) => r >= 4 && f === 3 },
  { key: 'new', label: 'مشتری جدید', test: (r, f) => r >= 4 && f <= 2 },
  { key: 'need_attention', label: 'نیازمند توجه', test: (r, f) => r === 3 && f <= 3 },
  { key: 'cannot_lose', label: 'نباید از دست برود', test: (r, f) => r === 2 && f >= 4 },
  { key: 'at_risk', label: 'در معرض خطر', test: (r, f) => r === 2 && f >= 1 }, // پوشش کامل r=2 (شامل f=1)
  { key: 'sleeping', label: 'خفته', test: (r, f) => r <= 1 && f >= 2 },
  { key: 'lost', label: 'از دست رفته', test: (r, f) => r <= 1 && f <= 1 },
]

export function rfmAnalysis(
  records: DataRow[],
  fields: FieldMeta[],
  params: { idField: string; dateField: string; amountField?: string },
  filters: QueryFilter[] = []
): RfmResult {
  const warnings: string[] = []
  const data = applyFilters(records, fields, filters, warnings)
  const scanned = data.length

  // تاریخ مرجع = جدیدترین تاریخ معتبر
  let maxIso = ''
  for (const r of data) {
    const p = parseDateValue(r[params.dateField])
    if (p.ok && p.iso && p.iso > maxIso) maxIso = p.iso
  }
  if (!maxIso) {
    warnings.push('هیچ تاریخ معتبری یافت نشد؛ تحلیل RFM قابل اجرا نیست.')
    return { customers: [], segments: [], totalCustomers: 0, referenceDate: '', hasMonetary: !!params.amountField, method: 'امتیازدهی پنج‌ک R/F/M و بخش‌بندی استاندارد', meta: { used: 0, skipped: 0, scannedRecords: scanned, warnings } }
  }
  const refMs = new Date(maxIso + 'T00:00:00Z').getTime()

  const agg = new Map<string, { last: string; freq: number; monetary: number }>()
  let skipped = 0
  for (const r of data) {
    const id = String(r[params.idField] ?? '').trim()
    const p = parseDateValue(r[params.dateField])
    if (!id || id === '—' || !p.ok || !p.iso) { skipped++; continue }
    let m = 0
    if (params.amountField) {
      const v = num(r[params.amountField])
      if (v === null) { skipped++; continue }
      m = v
    }
    const cur = agg.get(id)
    if (cur) {
      cur.freq++
      cur.monetary += m
      if (p.iso > cur.last) cur.last = p.iso
    } else {
      agg.set(id, { last: p.iso, freq: 1, monetary: m })
    }
  }

  if (skipped > 0) warnings.push(`${skipped.toLocaleString('fa-IR')} رکورد بدون شناسه، تاریخ یا مبلغ معتبر کنار گذاشته شد (بخش ۲۱.۳ سند).`)
  if (agg.size < 5) {
    warnings.push('تعداد شناسه متمایز کمتر از ۵ است؛ امتیازدهی پنج‌ک معنادار نیست (بخش ۲۱.۲ سند: تحلیل RFM در صورت تناسب داده).')
    return { customers: [], segments: [], totalCustomers: agg.size, referenceDate: maxIso, hasMonetary: !!params.amountField, method: 'امتیازدهی پنج‌ک R/F/M و بخش‌بندی استاندارد', meta: { used: scanned - skipped, skipped, scannedRecords: scanned, warnings } }
  }

  const items: RfmCustomer[] = [...agg.entries()].map(([id, v]) => ({
    id,
    recencyDays: Math.max(0, Math.round((refMs - new Date(v.last + 'T00:00:00Z').getTime()) / 86400000)),
    frequency: v.freq,
    monetary: v.monetary,
    rScore: 0,
    fScore: 0,
    mScore: 0,
    segment: '',
  }))

  // امتیاز پنج‌ک: مرتب‌سازی و نسبت رتبه — برای R مقدار کمتر = امتیاز بهتر
  const qScore = (vals: number[], v: number, invert: boolean): number => {
    const s = [...vals].sort((a, b) => a - b)
    const rank = s.filter(x => x < v).length // 0..n-1
    let score = 1 + Math.floor((5 * rank) / s.length)
    score = Math.max(1, Math.min(5, score))
    return invert ? 6 - score : score
  }
  const recencies = items.map(i => i.recencyDays)
  const freqs = items.map(i => i.frequency)
  const mons = items.map(i => i.monetary)
  for (const it of items) {
    it.rScore = qScore(recencies, it.recencyDays, true)
    it.fScore = qScore(freqs, it.frequency, false)
    it.mScore = params.amountField ? qScore(mons, it.monetary, false) : 0
    it.segment = RFM_SEGMENTS.find(s => s.test(it.rScore, it.fScore))?.label ?? 'سایر'
  }

  // بخش‌بندی — بخش ۲۱.۲
  const segMap = new Map<string, RfmSegment>()
  for (const it of items) {
    const key = RFM_SEGMENTS.find(s => s.label === it.segment)?.key ?? 'other'
    const cur = segMap.get(key)
    if (cur) {
      cur.count++
      cur.avgFrequency += it.frequency
      cur.avgMonetary += it.monetary
    } else {
      segMap.set(key, { key, label: it.segment, count: 1, pct: 0, avgFrequency: it.frequency, avgMonetary: it.monetary })
    }
  }
  const segments = [...segMap.values()].map(s => ({
    ...s,
    pct: Math.round((s.count / items.length) * 1000) / 10,
    avgFrequency: Math.round((s.avgFrequency / s.count) * 10) / 10,
    avgMonetary: Math.round((s.avgMonetary / s.count) * 10) / 10,
  })).sort((a, b) => b.count - a.count)

  const top = [...items].sort((a, b) => b.monetary - a.monetary).slice(0, 100)

  return {
    customers: top,
    segments,
    totalCustomers: items.length,
    referenceDate: maxIso,
    hasMonetary: !!params.amountField,
    method: 'امتیازدهی پنج‌ک R/F/M و بخش‌بندی استاندارد',
    meta: { used: scanned - skipped, skipped, scannedRecords: scanned, warnings },
  }
}

// ---------------------------------------------------------------
// سناریوسازی و What-if — بخش ۲۱.۲ («سناریوسازی و What-if»)
// اثر تغییر درصدی راننده‌ها (سراسری یا به تفکیک مقدار یک بُعد) روی سنجه‌ها
// یادداشت: خروجی سناریوی فرضی است، نه پیش‌بینی (بخش ۲۱.۳)
// ---------------------------------------------------------------

export interface WhatIfRow {
  dim: string
  label: string
  baseline: Record<string, number>
  scenario: Record<string, number>
  delta: Record<string, number>
  deltaPct: Record<string, number | null>
  factor: number
}

export interface WhatIfResult {
  rows: WhatIfRow[]
  measureAliases: string[]
  totals: { baseline: Record<string, number>; scenario: Record<string, number>; delta: Record<string, number>; deltaPct: Record<string, number | null> }
  globalPct: number
  note: string
  meta: { used: number; skipped: number; scannedRecords: number; warnings: string[] }
}

export function whatIf(
  records: DataRow[],
  fields: FieldMeta[],
  params: {
    dimensions: string[]
    measures: QuerySpec['measures']
    globalPct?: number
    perValue?: Record<string, number> // { مقدار بُعد: درصد تغییر }
    dimensionForPerValue?: string
  },
  filters: QueryFilter[] = []
): WhatIfResult {
  const warnings: string[] = []
  const spec: QuerySpec = {
    dimensions: params.dimensions ?? [],
    measures: params.measures && params.measures.length > 0 ? params.measures : [{ agg: 'count' }],
    filters,
  }
  const res = runQuery(records, fields, spec)
  warnings.push(...res.warnings)

  const globalPct = Number.isFinite(params.globalPct) ? params.globalPct! : 0
  const dimFor = params.dimensionForPerValue ?? params.dimensions?.[0]
  const measureAliases = Object.keys(res.totals).length > 0
    ? Object.keys(res.totals)
    : res.rows.length > 0 ? Object.keys(res.rows[0]).filter(k => !k.startsWith('__') && k !== (params.dimensions?.[0] ?? '')) : []

  const rows: WhatIfRow[] = res.rows.slice(0, 100).map(r => {
    const dimVal = dimFor ? String(r[dimFor] ?? '—') : '—'
    const pct = params.perValue && params.perValue[dimVal] !== undefined ? Number(params.perValue[dimVal]) : globalPct
    const factor = 1 + pct / 100
    const baseline: Record<string, number> = {}
    const scenario: Record<string, number> = {}
    const delta: Record<string, number> = {}
    const deltaPct: Record<string, number | null> = {}
    for (const alias of measureAliases) {
      const base = typeof r[alias] === 'number' ? r[alias] as number : 0
      const sc = base * factor
      baseline[alias] = base
      scenario[alias] = sc
      delta[alias] = sc - base
      deltaPct[alias] = base === 0 ? null : Math.round(((sc - base) / Math.abs(base)) * 1000) / 10 // مبنای صفر → null (بخش ۲۱.۳)
    }
    return { dim: dimVal, label: dimVal, baseline, scenario, delta, deltaPct, factor }
  })

  const totals = {
    baseline: {} as Record<string, number>,
    scenario: {} as Record<string, number>,
    delta: {} as Record<string, number>,
    deltaPct: {} as Record<string, number | null>,
  }
  for (const alias of measureAliases) {
    const b = rows.reduce((s, r) => s + (r.baseline[alias] ?? 0), 0)
    const sc = rows.reduce((s, r) => s + (r.scenario[alias] ?? 0), 0)
    totals.baseline[alias] = b
    totals.scenario[alias] = sc
    totals.delta[alias] = sc - b
    totals.deltaPct[alias] = b === 0 ? null : Math.round(((sc - b) / Math.abs(b)) * 1000) / 10
  }

  return {
    rows,
    measureAliases,
    totals,
    globalPct,
    note: 'این خروجی سناریوی فرضی (What-if) است و پیش‌بینی نیست؛ اثر تغییر درصدی فرضی روی سنجه‌های انتخابی بدون تغییر داده واقعی محاسبه شده است (بخش‌های ۲۱.۲ و ۲۱.۳ سند).',
    meta: { used: res.rowCount, skipped: 0, scannedRecords: res.scannedRecords, warnings },
  }
}

// ---------------------------------------------------------------
// تشخیص ناهنجاری پیشرفته — بخش ۲۱.۲ («تشخیص ناهنجاری پیشرفته»)
// روش: نمره Z مقاوم بر مبنای میانه و انحراف مطلق میانه (MAD) — آستانه ۳٫۵ (Iglewicz–Hoaglin)
// ---------------------------------------------------------------

export interface AnomalyResult {
  series: (SeriesPoint & { z: number; isAnomaly: boolean })[]
  threshold: number
  anomalies: (SeriesPoint & { z: number })[]
  method: string
  meta: { used: number; skipped: number; scannedRecords: number; warnings: string[] }
}

export function anomalyDetection(
  records: DataRow[],
  fields: FieldMeta[],
  params: { dateField: string; measureField?: string; agg?: string; granularity?: Granularity; threshold?: number },
  filters: QueryFilter[] = []
): AnomalyResult {
  const g = params.granularity ?? 'month'
  const { points, meta } = buildTimeSeries(records, fields, params.dateField, params.measureField, params.agg ?? 'sum', g, filters)
  const threshold = Math.max(1.5, Math.min(6, params.threshold ?? 3.5))

  const values = points.map(p => p.value)
  const n = values.length
  const empty: AnomalyResult = { series: [], threshold, anomalies: [], method: 'نمره Z مقاوم (میانه/MAD) — آستانه ۳٫۵', meta }
  if (n < 5) {
    meta.warnings.push('حداقل ۵ دوره زمانی برای تشخیص ناهنجاری لازم است.')
    return empty
  }

  const median = (() => {
    const s = [...values].sort((a, b) => a - b)
    const mid = Math.floor(n / 2)
    return n % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
  })()
  const mad = (() => {
    const devs = values.map(v => Math.abs(v - median)).sort((a, b) => a - b)
    const mid = Math.floor(n / 2)
    return n % 2 === 0 ? (devs[mid - 1] + devs[mid]) / 2 : devs[mid]
  })()

  let series: AnomalyResult['series']
  if (mad > 1e-9) {
    series = points.map(p => {
      const z = 0.6745 * (p.value - median) / mad
      return { ...p, z: Math.round(z * 100) / 100, isAnomaly: Math.abs(z) >= threshold }
    })
  } else {
    // MAD صفر → fallback به میانگین/انحراف معیار
    meta.warnings.push('پراکندگی داده صفر است (MAD=۰)؛ از میانگین و انحراف معیار استاندارد استفاده شد.')
    const mean = values.reduce((s, v) => s + v, 0) / n
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n)
    series = points.map(p => {
      const z = std > 1e-9 ? (p.value - mean) / std : 0
      return { ...p, z: Math.round(z * 100) / 100, isAnomaly: std > 1e-9 && Math.abs(z) >= threshold }
    })
  }

  return {
    series,
    threshold,
    anomalies: series.filter(p => p.isAnomaly).map(({ key, label, value, z }) => ({ key, label, value, z })),
    method: mad > 1e-9 ? 'نمره Z مقاوم بر مبنای میانه و MAD — آستانه ۳٫۵ (Iglewicz–Hoaglin)' : 'نمره Z استاندارد (میانگین/انحراف معیار)',
    meta,
  }
}
