// موتور آماری نمودارهای تخصصی — بخش ۱۹.۲ سند
// هیستوگرام و نمودار جعبه‌ای (چهارک‌ها، پراکندگی IQR و نقاط دورافتاده)
// مقادیر خالی و نامعتبر از محاسبه کنار گذاشته می‌شوند (معیار ۳۳.۹ سند)

import { DataRow, FieldMeta, QueryFilter } from './types'
import { num, matchFilter } from './query'

// چهارک با درون‌یابی خطی — استاندارد متداول (R type 7)
export function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const idx = p * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo])
}

export interface HistogramBin {
  from: number
  to: number
  count: number
  label?: string
}

export interface HistogramResult {
  bins: HistogramBin[]
  min: number
  max: number
  used: number        // تعداد رکورد وارد محاسبه
  skipped: number     // مقادیر خالی/نامعتبر کنار گذاشته‌شده
  scannedRecords: number
  warnings: string[]
}

// هیستوگرام — توزیع فراوانی یک سنجه عددی در بازه‌های هم‌عرض
export function computeHistogram(
  records: DataRow[],
  fields: FieldMeta[],
  fieldId: string,
  binCountRaw: number | undefined,
  filters: QueryFilter[] = []
): HistogramResult {
  const warnings: string[] = []
  let data = records
  for (const flt of filters) {
    if (!fields.some(f => f.id === flt.fieldId)) {
      warnings.push(`فیلتر برای ستون ناشناخته «${flt.fieldId}» نادیده گرفته شد.`)
      continue
    }
    data = data.filter(r => matchFilter(r[flt.fieldId], flt))
  }
  const scanned = data.length

  const vals: number[] = []
  for (const r of data) {
    const n = num(r[fieldId])
    if (n !== null) vals.push(n)
  }
  const skipped = scanned - vals.length

  if (vals.length === 0) {
    return { bins: [], min: 0, max: 0, used: 0, skipped, scannedRecords: scanned, warnings }
  }

  const min = Math.min(...vals)
  const max = Math.max(...vals)
  let binCount = Math.max(1, Math.min(50, Math.floor(binCountRaw ?? 10)))
  if (min === max) binCount = 1
  const step = (max - min) / binCount

  const bins: HistogramBin[] = []
  for (let i = 0; i < binCount; i++) {
    bins.push({ from: min + i * step, to: min + (i + 1) * step, count: 0 })
  }
  // مقدار max در آخرین بازه (بسته) قرار می‌گیرد
  for (const v of vals) {
    let idx = Math.floor((v - min) / step)
    if (idx >= binCount) idx = binCount - 1
    bins[idx].count++
  }

  if (skipped > 0) {
    warnings.push(`${skipped.toLocaleString('fa-IR')} رکورد با مقدار خالی یا نامعتبر از هیستوگرام کنار گذاشته شد (بخش ۳۳.۹ سند).`)
  }

  return { bins, min, max, used: vals.length, skipped, scannedRecords: scanned, warnings }
}

export interface BoxStats {
  min: number
  loWhisker: number
  q1: number
  median: number
  q3: number
  hiWhisker: number
  max: number
  iqr: number
  count: number
  outliers: number[]
}

// آماره جعبه‌ای — چهارک‌ها، سبیل‌ها (۱٫۵×IQR) و نقاط دورافتاده
export function computeBoxStats(values: number[]): BoxStats {
  const s = [...values].sort((a, b) => a - b)
  const q1 = quantile(s, 0.25)
  const median = quantile(s, 0.5)
  const q3 = quantile(s, 0.75)
  const iqr = q3 - q1
  const loFence = q1 - 1.5 * iqr
  const hiFence = q3 + 1.5 * iqr
  const inside = s.filter(v => v >= loFence && v <= hiFence)
  const outliers = s.filter(v => v < loFence || v > hiFence)
  return {
    min: s[0],
    loWhisker: inside.length > 0 ? inside[0] : s[0],
    q1,
    median,
    q3,
    hiWhisker: inside.length > 0 ? inside[inside.length - 1] : s[s.length - 1],
    max: s[s.length - 1],
    iqr,
    count: s.length,
    outliers: outliers.slice(0, 20), // حداکثر ۲۰ نقطه برای نمایش
  }
}

export interface BoxGroup {
  name: string
  stats: BoxStats
}

export interface BoxPlotResult {
  groups: BoxGroup[]
  used: number
  skipped: number
  scannedRecords: number
  warnings: string[]
}

// نمودار جعبه‌ای — توزیع یک سنجه به تفکیک بُعد اختیاری
export function computeBoxPlot(
  records: DataRow[],
  fields: FieldMeta[],
  fieldId: string,
  groupFieldId: string | undefined,
  filters: QueryFilter[] = []
): BoxPlotResult {
  const warnings: string[] = []
  let data = records
  for (const flt of filters) {
    if (!fields.some(f => f.id === flt.fieldId)) {
      warnings.push(`فیلتر برای ستون ناشناخته «${flt.fieldId}» نادیده گرفته شد.`)
      continue
    }
    data = data.filter(r => matchFilter(r[flt.fieldId], flt))
  }
  const scanned = data.length

  const groupsMap = new Map<string, number[]>()
  let skipped = 0
  for (const r of data) {
    const n = num(r[fieldId])
    if (n === null) { skipped++; continue }
    const key = groupFieldId
      ? (r[groupFieldId] === null || r[groupFieldId] === undefined || String(r[groupFieldId]) === '' ? '—' : String(r[groupFieldId]))
      : 'کل داده'
    const arr = groupsMap.get(key)
    if (arr) arr.push(n)
    else groupsMap.set(key, [n])
  }

  const groups: BoxGroup[] = []
  for (const [name, vals] of groupsMap) {
    if (vals.length === 0) continue
    groups.push({ name, stats: computeBoxStats(vals) })
  }
  // مرتب‌سازی نزولی بر اساس میانه برای خوانایی
  groups.sort((a, b) => b.stats.median - a.stats.median)

  if (skipped > 0) {
    warnings.push(`${skipped.toLocaleString('fa-IR')} رکورد با مقدار خالی یا نامعتبر از نمودار جعبه‌ای کنار گذاشته شد (بخش ۳۳.۹ سند).`)
  }
  if (groups.length > 20) {
    warnings.push(`تعداد گروه‌ها ${groups.length.toLocaleString('fa-IR')} گروه است؛ ۲۰ گروه با میانه بزرگ‌تر نمایش داده شد.`)
  }

  return {
    groups: groups.slice(0, 20),
    used: scanned - skipped,
    skipped,
    scannedRecords: scanned,
    warnings,
  }
}
