// شناسنامه و کیفیت داده — بخش ۹ سند
// محاسبه آمار توصیفی هر ستون و کل مجموعه‌داده

import { DataRow, FieldMeta } from './types'
import { toLatinDigits } from './digits'
import { parseDateValue } from './jalali'

export interface FieldProfile {
  fieldId: string
  total: number          // تعداد کل رکوردها
  nullCount: number      // تعداد مقدارهای خالی
  nullPercent: number    // درصد مقدارهای خالی
  distinctCount: number  // تعداد مقادیر متمایز
  topValues: { value: string; count: number; percent: number }[] // فراوانی مقادیر پرتکرار
  min?: number | string  // کمینه
  max?: number | string  // بیشینه
  mean?: number          // میانگین (برای انواع مناسب)
  median?: number        // میانه
  minLength?: number     // طول کمینه متن
  maxLength?: number     // طول بیشینه متن
  typeDistribution: Record<string, number> // توزیع نوع داده
  patternViolations: number // مقادیر خارج از الگو
  quality: 'valid' | 'partial' | 'inconsistent' // وضعیت کیفیت
}

export interface DatasetProfile {
  rowCount: number
  duplicateRows: number    // تعداد سطرهای تکراری
  fields: FieldProfile[]
  dateRange?: { field: string; from: string; to: string; invalid: number } // توزیع زمانی داده‌ها
  warnings: string[]
}

export function profileDataset(records: DataRow[], fields: FieldMeta[]): DatasetProfile {
  const warnings: string[] = []
  const profiles: FieldProfile[] = fields.map(f => profileField(records, f))

  // سطرهای تکراری کامل
  const seen = new Set<string>()
  let dup = 0
  for (const r of records) {
    const key = fields.map(f => String(r[f.id] ?? '')).join('§')
    if (seen.has(key)) dup++
    else seen.add(key)
  }

  // توزیع زمانی — بر نخستین ستون تاریخ
  const dateField = fields.find(f => f.type === 'date')
  let dateRange: DatasetProfile['dateRange'] | undefined
  if (dateField) {
    let minIso: string | null = null
    let maxIso: string | null = null
    let invalid = 0
    for (const r of records) {
      const p = parseDateValue(r[dateField.id])
      if (p.ok && p.iso) {
        if (!minIso || p.iso < minIso) minIso = p.iso
        if (!maxIso || p.iso > maxIso) maxIso = p.iso
      } else if (r[dateField.id] !== null && String(r[dateField.id]).trim() !== '') {
        invalid++
      }
    }
    if (minIso && maxIso) dateRange = { field: dateField.id, from: minIso, to: maxIso, invalid }
    if (invalid > 0) warnings.push(`${invalid} مقدار تاریخ نامعتبر در ستون «${dateField.label}» جداگانه گزارش می‌شود (معیار پذیرش ۳۳.۵ سند).`)
  }

  // هشدارهای کیفیت
  const partial = profiles.filter(p => p.quality !== 'valid')
  if (partial.length > 0) {
    warnings.push(`${partial.length} ستون وضعیت کیفیت غیرکامل دارد (بخش ۹ سند).`)
  }

  return { rowCount: records.length, duplicateRows: dup, fields: profiles, dateRange, warnings }
}

function profileField(records: DataRow[], f: FieldMeta): FieldProfile {
  const total = records.length
  let nullCount = 0
  const freq = new Map<string, number>()
  const typeDist: Record<string, number> = {}
  const nums: number[] = []
  let minLen = Infinity, maxLen = 0
  let min: number | string | undefined
  let max: number | string | undefined
  let patternViolations = 0

  const isNumericType = ['amount', 'decimal', 'integer', 'percent'].includes(f.type)

  for (const r of records) {
    const raw = r[f.id]
    const s = raw === null || raw === undefined ? '' : String(raw).trim()
    if (s === '') { nullCount++; continue }

    freq.set(s, (freq.get(s) ?? 0) + 1)

    // توزیع نوع واقعی
    let t = 'text'
    const lat = toLatinDigits(s)
    if (/^-?\d*\.?\d+$/.test(lat.replace(/[,\u060C]/g, ''))) t = 'number'
    else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(lat)) t = 'date'
    else if (['بله', 'خیر', 'true', 'false'].includes(s.toLowerCase())) t = 'boolean'
    typeDist[t] = (typeDist[t] ?? 0) + 1

    if (isNumericType) {
      const n = parseFloat(lat.replace('٫', '.').replace(/[,\u060C]/g, ''))
      if (Number.isFinite(n)) {
        nums.push(n)
        if (min === undefined || n < (min as number)) min = n
        if (max === undefined || n > (max as number)) max = n
      } else {
        patternViolations++
      }
    } else if (f.type === 'date') {
      const p = parseDateValue(raw)
      if (p.ok && p.iso) {
        if (min === undefined || p.iso < min) min = p.iso
        if (max === undefined || p.iso > max) max = p.iso
      } else patternViolations++
    } else {
      const L = s.length
      if (L < minLen) minLen = L
      if (L > maxLen) maxLen = L
    }
  }

  const distinctCount = freq.size
  const topValues = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([value, count]) => ({ value, count, percent: total ? count / total : 0 }))

  let mean: number | undefined
  let median: number | undefined
  if (nums.length > 0) {
    mean = nums.reduce((a, b) => a + b, 0) / nums.length
    const sorted = [...nums].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }

  // وضعیت کیفیت — بخش ۸ و ۹
  const nullRatio = total ? nullCount / total : 0
  let quality: 'valid' | 'partial' | 'inconsistent' = 'valid'
  if (nullRatio > 0.15 || patternViolations > 0) quality = 'partial'
  if (nullRatio > 0.4 || (typeDist['number'] && typeDist['text'] && Math.min(typeDist['number'], typeDist['text']) > total * 0.1)) quality = 'inconsistent'

  return {
    fieldId: f.id,
    total,
    nullCount,
    nullPercent: total ? nullRatio : 0,
    distinctCount,
    topValues,
    min,
    max,
    mean,
    median,
    minLength: minLen === Infinity ? undefined : minLen,
    maxLength: maxLen || undefined,
    typeDistribution: typeDist,
    patternViolations,
    quality,
  }
}
