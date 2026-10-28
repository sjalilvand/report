// موتور هوشمند محلی — بخش ۲۵ سند: «قابلیت‌های هوشمند و هوش مصنوعی»
// این موتور بدون هیچ سرویس بیرونی، از خود داده پیشنهاد تولید می‌کند:
//   پیشنهاد نوع داده و برچسب ستون، کلید یکتا، روابط، قواعد پاک‌سازی، نمودار مناسب،
//   شاخص‌های قابل محاسبه، یافتن الگوها و نقاط غیرعادی
// الزامات کنترلی بخش ۲۵: اعداد توسط موتور تحلیل همین سامانه محاسبه می‌شوند،
// پاسخ‌ها به منبع/فیلتر/ستون قابل ردیابی‌اند و در نبود داده کافی ناتوانی اعلام می‌شود.

import { DataRow, FieldMeta, AggregationType } from '../types'
import { num } from '../query'
import { detectGeoColumn } from '../geo'

// ───────────────────────── انواع خروجی ─────────────────────────

export interface TypeSuggestion {
  fieldId: string
  label: string
  currentType: string
  suggestedType: string
  confidence: number
  reason: string
}

export interface UniqueKeySuggestion {
  fields: string[]        // شناسه ستون‌ها (ترکیبی در صورت لزوم)
  labels: string[]
  uniqueness: number      // نسبت یکتایی 0..1
  sampleDuplicates: number
  reason: string
}

export interface RelationSuggestion {
  fromDatasetId: string
  fromDatasetName: string
  fromField: string
  fromFieldLabel: string
  toDatasetId: string
  toDatasetName: string
  toField: string
  toFieldLabel: string
  valueOverlap: number    // نسبت هم‌پوشانی مقادیر 0..1
  reason: string
}

export interface CleaningSuggestion {
  kind: 'trim' | 'nulls' | 'persianDigits' | 'duplicates' | 'mixedType' | 'emptyCol'
  fieldId?: string
  fieldLabel?: string
  affected: number
  description: string
  op?: string             // عملیات متناظر در موتور تبدیل (بخش ۱۰) در صورت وجود
  config?: Record<string, unknown>
}

export interface ChartSuggestion {
  chartType: string       // نوع گزارش‌ساز: bar | line | pie | kpi | scatter | pivot | geomap | compare | table ...
  title: string
  reason: string
  confidence: number
  dims: string[]
  measures: { fieldId?: string; agg: AggregationType }[]
}

export interface MeasureSuggestion {
  fieldId: string
  label: string
  agg: AggregationType
  title: string
  reason: string
}

export interface AnomalyFinding {
  kind: 'outlier' | 'gap' | 'duplicate' | 'dominant' | 'skew'
  fieldId?: string
  fieldLabel?: string
  title: string
  detail: string
  severity: 'low' | 'medium' | 'high'
  examples?: string[]
}

export interface PatternFinding {
  kind: 'correlation' | 'trend' | 'concentration' | 'skew'
  title: string
  detail: string
  confidence: number
}

export interface SuggestionsResult {
  types: TypeSuggestion[]
  uniqueKeys: UniqueKeySuggestion[]
  relations: RelationSuggestion[]
  cleaning: CleaningSuggestion[]
  charts: ChartSuggestion[]
  measures: MeasureSuggestion[]
  anomalies: AnomalyFinding[]
  patterns: PatternFinding[]
  geo: { fieldId: string; label: string; matchRatio: number } | null
  scannedRecords: number
  notices: string[]      // اعلام ناتوانی/محدودیت — الزام بخش ۲۵
}

// ───────────────────────── ابزارهای آماری محلی ─────────────────────────

function statsOf(values: number[]): { mean: number; median: number; std: number; min: number; max: number } | null {
  if (values.length < 3) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return { mean, median, std: Math.sqrt(variance), min: sorted[0], max: sorted[sorted.length - 1] }
}

const isBlank = (v: unknown) => v === null || v === undefined || String(v).trim() === ''
const PERSIAN_DIGITS = /[۰-۹]/u
const ARABIC_DIGITS = /[٠-٩]/u

// ───────────────────────── پیشنهاد نوع و برچسب ستون ─────────────────────────

function suggestTypes(records: DataRow[], fields: FieldMeta[]): TypeSuggestion[] {
  const out: TypeSuggestion[] = []
  const sample = records.slice(0, 1000)
  for (const f of fields) {
    const vals = sample.map(r => r[f.id]).filter(v => !isBlank(v)).map(String)
    if (vals.length < 5) continue

    let suggested: string | null = null
    let confidence = 0
    let reason = ''

    const numericHits = vals.filter(v => num(v) !== null).length / vals.length
    const persianDate = /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(vals[0])
    const dateHits = vals.filter(v => /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(v) || !Number.isNaN(Date.parse(v))).length / vals.length
    const boolHits = vals.filter(v => ['true', 'false', 'بله', 'خیر', 'دارد', 'ندارد', '1', '0', 'آری', 'نه'].includes((v.toLowerCase() || v))).length / vals.length
    const distinct = new Set(vals).size

    if (f.type === 'text') {
      if (dateHits >= 0.9 && persianDate) {
        suggested = 'date'; confidence = dateHits; reason = `${Math.round(dateHits * 100)}٪ مقادیر در قالب تاریخ شمسی هستند.`
      } else if (boolHits >= 0.95) {
        suggested = 'boolean'; confidence = boolHits; reason = 'مقادیر فقط دو حالت بله/خیر دارند.'
      } else if (numericHits >= 0.9 && distinct > 20) {
        const hasPercent = /درصد|نسبت/i.test(f.label)
        suggested = hasPercent ? 'percent' : (numericHits === 1 && vals.every(v => !String(v).includes('.')) ? 'integer' : 'decimal')
        confidence = numericHits; reason = `${Math.round(numericHits * 100)}٪ مقادیر عددی‌اند اما ستون به‌صورت متن ثبت شده است.`
      }
    }
    if (suggested && suggested !== f.type && confidence >= 0.85) {
      out.push({ fieldId: f.id, label: f.label, currentType: f.type, suggestedType: suggested, confidence, reason })
    }
  }
  return out.slice(0, 12)
}

// ───────────────────────── پیشنهاد کلید یکتا ─────────────────────────

function suggestUniqueKeys(records: DataRow[], fields: FieldMeta[]): UniqueKeySuggestion[] {
  const out: UniqueKeySuggestion[] = []
  if (records.length < 3) return out
  const total = records.length

  const tryCombo = (combo: FieldMeta[]) => {
    const seen = new Map<string, number>()
    let dup = 0
    for (const r of records) {
      const key = combo.map(f => String(r[f.id] ?? '')).join('§')
      const c = (seen.get(key) ?? 0) + 1
      seen.set(key, c)
      if (c === 2) dup++
    }
    const uniqueness = 1 - dup / total
    return { uniqueness, dup, distinct: seen.size }
  }

  const candidates = fields.filter(f =>
    f.role === 'identifier' || f.type === 'identifier' ||
    /کد|شناسه|id|شماره/i.test(f.label + f.sourceName)
  )
  for (const f of candidates) {
    const { uniqueness, dup } = tryCombo([f])
    if (uniqueness >= 0.999) {
      out.push({ fields: [f.id], labels: [f.label], uniqueness, sampleDuplicates: dup, reason: `ستون «${f.label}» در همه ${total.toLocaleString('fa-IR')} رکورد یکتاست و نام آن الگوی شناسه دارد.` })
      break // اولین کلید تک‌ستونی کافی است
    }
  }
  if (out.length === 0 && candidates.length >= 2) {
    const combo = candidates.slice(0, 2)
    const { uniqueness, dup } = tryCombo(combo)
    if (uniqueness >= 0.98) {
      out.push({ fields: combo.map(f => f.id), labels: combo.map(f => f.label), uniqueness, sampleDuplicates: dup, reason: `ترکیب «${combo.map(f => f.label).join(' + ')}» در ${Math.round(uniqueness * 100)}٪ رکوردها یکتاست.` })
    }
  }
  // سطح جزئیات پیشنهادی — حتی بدون الگوی شناسه
  if (out.length === 0) {
    for (const f of fields) {
      if (f.role === 'measure') continue
      const { uniqueness, dup } = tryCombo([f])
      if (uniqueness >= 0.999) {
        out.push({ fields: [f.id], labels: [f.label], uniqueness, sampleDuplicates: dup, reason: `ستون «${f.label}» در همه رکوردها یکتاست؛ گزینه خوبی برای کلید یا سطح جزئیات (بخش ۱۲ سند).` })
        break
      }
    }
  }
  return out
}

// ───────────────────────── پیشنهاد روابط میان مجموعه‌داده‌ها ─────────────────────────

export interface DatasetLiteForAI {
  id: string
  name: string
  records: DataRow[]
  fields: FieldMeta[]
}

function suggestRelations(current: { id: string; name: string; records: DataRow[]; fields: FieldMeta[] }, others: DatasetLiteForAI[]): RelationSuggestion[] {
  const out: RelationSuggestion[] = []
  const curSample = current.records.slice(0, 300)
  if (curSample.length === 0) return out

  const normalizeVal = (v: unknown) => String(v ?? '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim()

  for (const other of others) {
    if (other.id === current.id) continue
    const otherSample = other.records.slice(0, 300)
    if (otherSample.length === 0) continue
    for (const cf of current.fields) {
      if (cf.role === 'measure') continue
      const curVals = new Set(curSample.map(r => normalizeVal(r[cf.id])).filter(s => s !== ''))
      if (curVals.size === 0 || curVals.size > 5000) continue
      for (const of_ of other.fields) {
        if (of_.role === 'measure') continue
        // نشانه نامی: برچسب مشابه
        const nameAffinity = normalizeVal(cf.label) === normalizeVal(of_.label) ? 0.15 : 0
        let overlapHit = 0
        for (const r of otherSample) {
          const v = normalizeVal(r[of_.id])
          if (v && curVals.has(v)) overlapHit++
        }
        const overlap = otherSample.length > 0 ? overlapHit / otherSample.length : 0
        const score = overlap * 0.85 + nameAffinity
        if (score >= 0.6 && overlap >= 0.5) {
          out.push({
            fromDatasetId: current.id, fromDatasetName: current.name, fromField: cf.id, fromFieldLabel: cf.label,
            toDatasetId: other.id, toDatasetName: other.name, toField: of_.id, toFieldLabel: of_.label,
            valueOverlap: Math.min(1, overlap + nameAffinity),
            reason: `${Math.round(overlap * 100)}٪ مقادیر «${of_.label}» در جدول «${other.name}» با مقادیر «${cf.label}» همین جدول مشترک است${nameAffinity > 0 ? ' و نام ستون‌ها یکسان است' : ''}.`,
          })
        }
      }
    }
  }
  // برترین‌ها
  return out.sort((a, b) => b.valueOverlap - a.valueOverlap).slice(0, 6)
}

// ───────────────────────── پیشنهاد قواعد پاک‌سازی ─────────────────────────

function suggestCleaning(records: DataRow[], fields: FieldMeta[]): CleaningSuggestion[] {
  const out: CleaningSuggestion[] = []
  const sample = records.slice(0, 1000)
  const total = sample.length
  if (total === 0) return out

  // ستون‌های کاملاً خالی
  for (const f of fields) {
    const filled = sample.filter(r => !isBlank(r[f.id])).length
    if (filled === 0) {
      out.push({ kind: 'emptyCol', fieldId: f.id, fieldLabel: f.label, affected: total, description: `ستون «${f.label}» هیچ مقداری ندارد؛ حذف آن خوانایی مدل را بهتر می‌کند.`, op: 'removeColumn', config: { column: f.id } })
    }
  }

  for (const f of fields) {
    const vals = sample.map(r => r[f.id])
    const blanks = vals.filter(isBlank).length
    // مقدار خالی
    if (blanks > 0) {
      const pct = Math.round((blanks / total) * 100)
      out.push({ kind: 'nulls', fieldId: f.id, fieldLabel: f.label, affected: blanks, description: `«${f.label}» در ${pct}٪ رکوردها خالی است؛ تصمیم تکمیل/حذف را در پاک‌سازی بگیرید (معیار ۳۳.۹).` })
    }
    // فاصله ابتدا/انتها
    const trimmed = vals.filter(v => !isBlank(v) && String(v) !== String(v).trim())
    if (trimmed.length > total * 0.02 && trimmed.length >= 3) {
      out.push({ kind: 'trim', fieldId: f.id, fieldLabel: f.label, affected: trimmed.length, description: `${trimmed.length.toLocaleString('fa-IR')} مقدار در «${f.label}» فاصله ابتدا/انتها دارد؛ نرمال‌سازی فاصله توصیه می‌شود.`, op: 'trim', config: { column: f.id } })
    }
    // ارقام فارسی/عربی در ستون عددی یا متن عددی‌نما
    const pd = vals.filter(v => PERSIAN_DIGITS.test(String(v))).length
    const ad = vals.filter(v => ARABIC_DIGITS.test(String(v))).length
    if (pd + ad > total * 0.3 && pd + ad >= 3) {
      out.push({ kind: 'persianDigits', fieldId: f.id, fieldLabel: f.label, affected: pd + ad, description: `در «${f.label}» ${pd + ad} مقدار با ارقام فارسی/عربی است؛ یکسان‌سازی ارقام برای تجمیع صحیح لازم است.`, op: 'unifyPersian', config: { column: f.id } })
    }
    // نوع مختلط: بخشی عدد بخشی متن
    const numeric = vals.filter(v => !isBlank(v) && num(v) !== null).length
    const nonNumeric = vals.filter(v => !isBlank(v) && num(v) === null).length
    if (numeric > 0 && nonNumeric > 0 && Math.min(numeric, nonNumeric) / (numeric + nonNumeric) >= 0.1 && numeric + nonNumeric >= 10) {
      out.push({ kind: 'mixedType', fieldId: f.id, fieldLabel: f.label, affected: nonNumeric, description: `«${f.label}» نوع مختلط دارد (${numeric.toLocaleString('fa-IR')} عددی و ${nonNumeric.toLocaleString('fa-IR')} متنی)؛ یکسان‌سازی نوع ضروری است.` })
    }
  }

  // رکورد تکراری کامل
  const seen = new Set<string>()
  let dups = 0
  for (const r of sample) {
    const key = fields.map(f => String(r[f.id] ?? '')).join('§')
    if (seen.has(key)) dups++
    else seen.add(key)
  }
  if (dups > 0) {
    out.push({ kind: 'duplicates', affected: dups, description: `${dups.toLocaleString('fa-IR')} رکورد تکراری کامل یافت شد؛ حذف تکراری‌ها پیش از مدل‌سازی توصیه می‌شود.`, op: 'dedupe', config: {} })
  }
  return out.slice(0, 14)
}

// ───────────────────────── پیشنهاد نمودار مناسب ─────────────────────────

function suggestCharts(records: DataRow[], fields: FieldMeta[]): ChartSuggestion[] {
  const out: ChartSuggestion[] = []
  const dims = fields.filter(f => f.role === 'dimension' || f.role === 'attribute' || f.type === 'category')
  const dateFields = fields.filter(f => f.type === 'date')
  const numFields = fields.filter(f => f.role === 'measure' || (f.type === 'integer' || f.type === 'decimal' || f.type === 'amount' || f.type === 'percent'))

  // ستون مکانی — بخش ۱۹.۲
  const geo = detectGeoColumn(fields, records)
  if (geo) {
    out.push({
      chartType: 'geomap', title: `نقشه جغرافیایی بر پایه «${geo.label}»`,
      reason: `ستون «${geo.label}» مقادیر جغرافیایی معتبر دارد (${Math.round(geo.matchRatio * 100)}٪ تطابق با استان‌ها)؛ نمایش حبابی روی نقشه ممکن است (بخش ۱۹.۲ سند).`,
      confidence: geo.matchRatio, dims: [geo.fieldId], measures: numFields.length > 0 ? [{ fieldId: numFields[0].id, agg: 'sum' }] : [{ agg: 'count' }],
    })
  }

  if (dateFields.length > 0 && numFields.length > 0) {
    out.push({
      chartType: 'line', title: `روند ${numFields[0].label} در طول زمان`,
      reason: `ستون تاریخ «${dateFields[0].label}» و سنجه «${numFields[0].label}» موجود است؛ نمودار خطی تغییرات زمانی را نشان می‌دهد.`,
      confidence: 0.9, dims: [dateFields[0].id], measures: [{ fieldId: numFields[0].id, agg: 'sum' }],
    })
  }

  // دسته کم‌مقدار → میله‌ای
  for (const d of dims) {
    const distinct = new Set(records.slice(0, 500).map(r => String(r[d.id] ?? '')).filter(s => s.trim() !== '')).size
    if (distinct >= 2 && distinct <= 12 && numFields.length > 0) {
      out.push({
        chartType: 'bar', title: `مقایسه ${numFields[0].label} به تفکیک ${d.label}`,
        reason: `«${d.label}» حدود ${distinct} مقدار متمایز دارد؛ برای مقایسه گروه‌ها نمودار میله‌ای مناسب است.`,
        confidence: 0.85, dims: [d.id], measures: [{ fieldId: numFields[0].id, agg: 'sum' }],
      })
      break
    }
  }

  // کارت شاخص — همیشه ممکن
  if (numFields.length > 0) {
    out.push({
      chartType: 'kpi', title: `کارت شاخص «${numFields[0].label}»`,
      reason: 'نمایش عدد تک‌مقداری جمع/میانگین برای مقدمه داشبورد مناسب است (بخش ۱۹.۲ سند).',
      confidence: 0.7, dims: [], measures: [{ fieldId: numFields[0].id, agg: 'sum' }],
    })
    // کارت مقایسه‌ای وقتی بُعد کم‌مقدار موجود است
    const cmpDim = dims.find(d => new Set(records.slice(0, 500).map(r => String(r[d.id] ?? ''))).size >= 2)
    if (cmpDim) {
      out.push({
        chartType: 'compare', title: `کارت مقایسه‌ای ${numFields[0].label} میان گروه‌های ${cmpDim.label}`,
        reason: 'دو گروه یا هدف قابل مقایسه است؛ کارت مقایسه‌ای اختلاف مطلق و درصدی را برجسته می‌کند (بخش ۱۹.۲ سند).',
        confidence: 0.75, dims: [cmpDim.id], measures: [{ fieldId: numFields[0].id, agg: 'sum' }],
      })
    }
  }

  // دو سنجه عددی → پراکندگی
  if (numFields.length >= 2) {
    out.push({
      chartType: 'scatter', title: `رابطه «${numFields[0].label}» و «${numFields[1].label}»`,
      reason: 'دو سنجه عددی موجود است؛ پراکندگی همبستگی را نشان می‌دهد.',
      confidence: 0.65, dims: [], measures: [{ fieldId: numFields[0].id, agg: 'sum' }, { fieldId: numFields[1].id, agg: 'sum' }],
    })
  }

  // جدول محوری برای ابعاد چندگانه
  if (dims.length >= 2 && numFields.length > 0) {
    out.push({
      chartType: 'pivot', title: `جدول محوری ${dims[1].label} در برابر ${dims[0].label}`,
      reason: 'دو بُعد و یک سنجه موجود است؛ جدول محوری تصویر دوبعدی می‌سازد (بخش ۱۹.۲ سند).',
      confidence: 0.6, dims: [dims[0].id, dims[1].id], measures: [{ fieldId: numFields[0].id, agg: 'sum' }],
    })
  }

  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 6)
}

// ───────────────────────── پیشنهاد شاخص‌های قابل محاسبه ─────────────────────────

function suggestMeasures(records: DataRow[], fields: FieldMeta[]): MeasureSuggestion[] {
  const out: MeasureSuggestion[] = []
  const numFields = fields.filter(f => f.role === 'measure' || f.type === 'integer' || f.type === 'decimal' || f.type === 'amount' || f.type === 'percent')
  const countFields = fields.filter(f => f.type === 'identifier' || /کد|شناسه/i.test(f.label))

  for (const f of numFields.slice(0, 4)) {
    const isAmount = f.type === 'amount'
    const isPercent = f.type === 'percent'
    const agg: AggregationType = isPercent ? 'avg' : 'sum'
    out.push({
      fieldId: f.id, agg, label: f.label,
      title: isPercent ? `میانگین ${f.label}` : `جمع ${f.label}`,
      reason: isPercent
        ? 'درصدها جمع‌پذیر نیستند (بخش ۱۱.۴)؛ شاخص پیشنهادی میانگین است.'
        : isAmount
          ? 'مبالغ جمع‌پذیرند؛ شاخص جمع در گزارش‌های مدیریتی پرکاربرد است.'
          : 'ستون عددی جمع‌پذیر؛ به‌عنوان شاخص در فرهنگ داده (بخش ۱۸) قابل ثبت است.',
    })
    out.push({
      fieldId: f.id, agg: 'avg', label: f.label,
      title: `میانگین ${f.label}`,
      reason: 'میانگین سطح رکورد برای پایش نرمال بودن مقادیر مفید است.',
    })
  }
  if (countFields.length > 0) {
    out.push({
      fieldId: countFields[0].id, agg: 'countDistinct', label: countFields[0].label,
      title: `تعداد متمایز ${countFields[0].label}`,
      reason: 'شمارش موجودیت‌های متمایز (مثلاً تعداد مشتریان) شاخص پرکاربرد مدیریتی است.',
    })
  }
  return out.slice(0, 9)
}

// ───────────────────────── الگوها و نقاط غیرعادی ─────────────────────────

function findAnomalies(records: DataRow[], fields: FieldMeta[]): { anomalies: AnomalyFinding[]; patterns: PatternFinding[] } {
  const anomalies: AnomalyFinding[] = []
  const patterns: PatternFinding[] = []
  const sample = records.slice(0, 5000)
  if (sample.length < 8) return { anomalies, patterns }

  for (const f of fields) {
    const vals: number[] = []
    for (const r of sample) {
      const n = num(r[f.id])
      if (n !== null) vals.push(n)
    }
    if (vals.length < 8) continue
    const st = statsOf(vals)
    if (!st || st.std === 0) continue

    // نقاط دورافتاده با نمره Z — آستانه ۳
    const outliers = sample.filter(r => {
      const n = num(r[f.id])
      return n !== null && Math.abs((n - st.mean) / st.std) > 3
    })
    if (outliers.length > 0) {
      anomalies.push({
        kind: 'outlier', fieldId: f.id, fieldLabel: f.label,
        title: `${outliers.length.toLocaleString('fa-IR')} مقدار غیرعادی در «${f.label}»`,
        detail: `میانگین ${st.mean.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} و انحراف معیار ${st.std.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} است؛ مقادیر بیش از ۳ انحراف از میانگین بررسی شوند. نمونه: ${outliers.slice(0, 3).map(r => String(r[f.id])).join('، ')}`,
        severity: outliers.length > vals.length * 0.02 ? 'medium' : 'low',
        examples: outliers.slice(0, 3).map(r => String(r[f.id])),
      })
    }

    // چولگی شدید
    if (st.mean !== 0 && Math.abs(st.median - st.mean) / st.std > 0.6) {
      patterns.push({
        kind: 'skew', title: `توزیع «${f.label}» چوله است`,
        detail: `میانگین (${st.mean.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}) با میانه (${st.median.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}) فاصله معنادار دارد؛ برای مقایسه گروه‌ها میانه قابل اتکاتر از میانگین است.`,
        confidence: 0.7,
      })
    }
  }

  // غلبه یک مقدار (concentration)
  const catFields = fields.filter(f => f.role === 'dimension' || f.type === 'category' || f.role === 'attribute')
  for (const f of catFields.slice(0, 5)) {
    const freq = new Map<string, number>()
    let filled = 0
    for (const r of sample) {
      const v = r[f.id]
      if (isBlank(v)) continue
      filled++
      freq.set(String(v), (freq.get(String(v)) ?? 0) + 1)
    }
    if (filled < 10) continue
    const [top, topCount] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]
    const share = topCount / filled
    if (share >= 0.8) {
      anomalies.push({
        kind: 'dominant', fieldId: f.id, fieldLabel: f.label,
        title: `تمرکز شدید در «${f.label}»`,
        detail: `${Math.round(share * 100)}٪ رکوردها مقدار «${top}» دارند؛ تحلیل به تفکیک این بُعد تفکیک‌کننده نیست و باید در تفسیر گزارش لحاظ شود.`,
        severity: share >= 0.95 ? 'medium' : 'low',
      })
    }
  }

  // همبستگی پیرسون میان دو سنجه نخست
  const numFields = fields.filter(f => f.role === 'measure' || f.type === 'integer' || f.type === 'decimal' || f.type === 'amount').slice(0, 2)
  if (numFields.length === 2) {
    const pairs: [number, number][] = []
    for (const r of sample) {
      const a = num(r[numFields[0].id]), b = num(r[numFields[1].id])
      if (a !== null && b !== null) pairs.push([a, b])
    }
    if (pairs.length >= 10) {
      const n = pairs.length
      const mx = pairs.reduce((s, p) => s + p[0], 0) / n
      const my = pairs.reduce((s, p) => s + p[1], 0) / n
      let cov = 0, vx = 0, vy = 0
      for (const [x, y] of pairs) { cov += (x - mx) * (y - my); vx += (x - mx) ** 2; vy += (y - my) ** 2 }
      const r = vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0
      if (Math.abs(r) >= 0.5) {
        patterns.push({
          kind: 'correlation',
          title: `همبستگی ${r > 0 ? 'مثبت' : 'منفی'} میان «${numFields[0].label}» و «${numFields[1].label}»`,
          detail: `ضریب پیرسون ${r.toFixed(2)} است؛ ${Math.abs(r) >= 0.7 ? 'رابطه قوی' : 'رابطه متوسط'} مشاهده می‌شود (همبستگی به معنای علیّت نیست).`,
          confidence: Math.min(0.95, Math.abs(r)),
        })
      }
    }
  }

  return { anomalies, patterns }
}

// ───────────────────────── ورودی اصلی موتور ─────────────────────────

export function buildSuggestions(
  current: { id: string; name: string; records: DataRow[]; fields: FieldMeta[] },
  others: DatasetLiteForAI[] = [],
): SuggestionsResult {
  const notices: string[] = []
  const records = current.records
  if (records.length === 0) {
    notices.push('این مجموعه‌داده رکوردی ندارد؛ پیشنهاد هوشمند نیازمند حداقل چند رکورد داده است (الزام بخش ۲۵: اعلام ناتوانی).')
    return { types: [], uniqueKeys: [], relations: [], cleaning: [], charts: [], measures: [], anomalies: [], patterns: [], geo: null, scannedRecords: 0, notices }
  }
  if (records.length < 5) {
    notices.push(`فقط ${records.length} رکورد موجود است؛ پیشنهادها با احتیاط و پس از افزودن داده کامل‌تر بازبینی شوند.`)
  }

  const geo = detectGeoColumn(current.fields, records)
  const { anomalies, patterns } = findAnomalies(records, current.fields)

  return {
    types: suggestTypes(records, current.fields),
    uniqueKeys: suggestUniqueKeys(records, current.fields),
    relations: suggestRelations(current, others),
    cleaning: suggestCleaning(records, current.fields),
    charts: suggestCharts(records, current.fields),
    measures: suggestMeasures(records, current.fields),
    anomalies,
    patterns,
    geo: geo ? { fieldId: geo.fieldId, label: geo.label, matchRatio: geo.matchRatio } : null,
    scannedRecords: records.length,
    notices,
  }
}
