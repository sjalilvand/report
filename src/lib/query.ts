// موتور محاسبات و پرس‌وجو — بخش ۱۱، ۱۳ و ۲۰ سند
// تفکیک ابعاد و سنجه‌ها، انواع تجمیع، واحدها و تولید گزارش توصیفی

import { DataRow, FieldMeta, QuerySpec, QueryResult, AggregationType, QueryFilter, StatOptions } from './types'
import { toLatinDigits, toPersianDigits } from './digits'
import { formatAmount, getUnit, isCurrencyUnit } from './currency'

// پیش‌فرض گزینه‌های آماری — رفتار سازگار با نسخه‌های قبل (بخش ۱۳.۲)
export const DEFAULT_STAT_OPTIONS: StatOptions = {
  percentileMethod: 'linear',
  stdDevType: 'sample',
  nullBehavior: 'exclude',
}

export function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  // ممیز فارسی/عربی (٫) نیز پشتیبانی می‌شود — بخش ۱۰.۱
  const s = toLatinDigits(String(v)).replace(/[٫,\u060C\s]/g, m => m === '٫' ? '.' : '')
  if (s === '' || s === '.') return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function keyOf(v: unknown): string {
  if (v === null || v === undefined) return '—'
  return String(v)
}

// اجرای پرس‌وجوی تجمیعی — بخش ۱۳.۱ و ۱۳.۲
export function runQuery(records: DataRow[], fields: FieldMeta[], spec: QuerySpec): QueryResult {
  const warnings: string[] = []
  const fieldById = new Map(fields.map(f => [f.id, f]))

  // فیلترها
  let data = records
  for (const flt of spec.filters ?? []) {
    const f = fieldById.get(flt.fieldId)
    if (!f) { warnings.push(`فیلتر برای ستون ناشناخته «${flt.fieldId}» نادیده گرفته شد.`); continue }
    data = data.filter(r => matchFilter(r[flt.fieldId], flt))
  }

  // جست‌وجوی متنی
  if (spec.searchText?.trim()) {
    const q = spec.searchText.trim()
    data = data.filter(r => fields.some(f => String(r[f.id] ?? '').includes(q)))
  }

  const scanned = data.length
  // گزینه‌های آماری مدیر — بخش ۱۳.۲ (روش صدک، نوع انحراف معیار، رفتار خالی)
  const statOptions = spec.statOptions ?? DEFAULT_STAT_OPTIONS
  const aliasOf = (m: QuerySpec['measures'][number]) => m.alias ?? measureAlias(m.fieldId, m.agg, fields, m.percentileP)

    // بدون گروه‌بندی: آمار کل
  if (spec.dimensions.length === 0) {
    const totals: Record<string, unknown> = {}
    for (const m of spec.measures) {
      const alias = aliasOf(m)
      totals[alias] = aggregateMeasure(data, m, fields, warnings, statOptions)
    }
    return { rows: [totals], totals: {}, rowCount: 1, scannedRecords: scanned, warnings }
  }

  // گروه‌بندی بر اساس ابعاد
  const groups = new Map<string, DataRow[]>()
  for (const r of data) {
    const key = spec.dimensions.map(d => keyOf(r[d])).join('§')
    const arr = groups.get(key)
    if (arr) arr.push(r)
    else groups.set(key, [r])
  }

  const rows: Record<string, unknown>[] = []
  for (const [key, recs] of groups) {
    const row: Record<string, unknown> = {}
    spec.dimensions.forEach((d, i) => {
      const f = fieldById.get(d)
      row[d] = key.split('§')[i] === '—' ? null : key.split('§')[i]
      // برچسب نمایشی
      row[`__label_${d}`] = f?.label ?? d
    })
    for (const m of spec.measures) {
      const alias = aliasOf(m)
      row[alias] = aggregateMeasure(recs, m, fields, warnings, statOptions)
    }
    rows.push(row)
  }

  // مرتب‌سازی
  if (spec.orderBy?.length) {
    for (const ob of [...spec.orderBy].reverse()) {
      rows.sort((a, b) => {
        const av = a[ob.field], bv = b[ob.field]
        const an = typeof av === 'number' ? av : parseFloat(String(av))
        const bn = typeof bv === 'number' ? bv : parseFloat(String(bv))
        if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * (ob.dir === 'desc' ? -1 : 1)
        return String(av ?? '').localeCompare(String(bv ?? ''), 'fa') * (ob.dir === 'desc' ? -1 : 1)
      })
    }
  } else if (spec.measures.length > 0) {
    // پیش‌فرض: نزولی بر اساس نخستین سنجه
    const first = spec.measures[0]
    const alias = aliasOf(first)
    rows.sort((a, b) => (typeof b[alias] === 'number' ? b[alias] as number : 0) - (typeof a[alias] === 'number' ? a[alias] as number : 0))
  }

  // محاسبات پنجره‌ای روی ردیف‌های تجمیع‌شده (پیش از محدودسازی) — بخش ۱۳.۲
  // مجموع تجمعی و میانگین متحرک به ترتیب فعلی ردیف‌ها (ترتیب مرتب‌سازی spec)
  for (const wc of spec.windowCalcs ?? []) {
    let acc = 0
    const win: number[] = []
    for (const r of rows) {
      const v = r[wc.fieldAlias]
      if (typeof v === 'number' && Number.isFinite(v)) {
        acc += v
        win.push(v)
        const size = Math.max(1, Math.floor(wc.window ?? 3))
        while (win.length > size) win.shift()
        r[wc.alias] = wc.type === 'cumsum' ? acc : win.reduce((a, b) => a + b, 0) / win.length
      } else {
        r[wc.alias] = null
      }
    }
  }

  const limited = spec.limit ? rows.slice(0, spec.limit) : rows

  // جمع کل — از مقادیر دقیق محاسبه شود نه اعداد گردشده (بخش ۱۴.۴)
  const totals: Record<string, unknown> = {}
  for (const m of spec.measures) {
    const alias = aliasOf(m)
    totals[alias] = aggregateMeasure(data, m, fields, warnings, statOptions)
  }

  // هشدار میانگین ساده سنجه‌های غیرجمع‌پذیر — بخش ۱۱.۴
  for (const m of spec.measures) {
    const f = fieldById.get(m.fieldId ?? '')
    if (m.agg === 'avg' && f?.unitKind === 'percent') {
      warnings.push(`میانگین ساده «${f.label}» در سطح گروه‌ها غیرجمع‌پذیر است؛ میانگین وزنی را بررسی کنید (بخش ۱۱.۴ سند).`)
    }
  }

  return { rows: limited, totals, rowCount: limited.length, scannedRecords: scanned, warnings }
}

export function matchFilter(v: unknown, flt: QueryFilter): boolean {
  const s = v === null || v === undefined ? '' : String(v).trim()
  switch (flt.op) {
    case 'eq': return s === String(flt.value)
    case 'neq': return s !== String(flt.value)
    case 'in': return (flt.values ?? []).some(x => String(x) === s)
    case 'gt': { const a = num(v), b = num(flt.value); return a !== null && b !== null && a > b }
    case 'gte': { const a = num(v), b = num(flt.value); return a !== null && b !== null && a >= b }
    case 'lt': { const a = num(v), b = num(flt.value); return a !== null && b !== null && a < b }
    case 'lte': { const a = num(v), b = num(flt.value); return a !== null && b !== null && a <= b }
    case 'contains': return s.includes(String(flt.value))
    case 'notnull': return s !== ''
    case 'isnull': return s === ''
    default: return true
  }
}

// اعمال فیلترها روی رکوردها — برای Drill Through (بخش ۱۹.۳) و نماهای جزئیات
export function applyFilters(records: DataRow[], filters: QueryFilter[], fields: FieldMeta[]): DataRow[] {
  const fieldById = new Map(fields.map(f => [f.id, f]))
  let data = records
  for (const flt of filters) {
    const f = fieldById.get(flt.fieldId)
    if (!f) continue
    data = data.filter(r => matchFilter(r[flt.fieldId], flt))
  }
  return data
}

export function measureAlias(fieldId: string | undefined, agg: AggregationType, fields: FieldMeta[], percentileP?: number): string {
  const f = fields.find(x => x.id === fieldId)
  const label = f?.label ?? (fieldId ?? '')
  switch (agg) {
    case 'sum': return `جمع ${label}`
    case 'count': return 'تعداد رکورد'
    case 'countDistinct': return `${label} متمایز`
    case 'avg': return `میانگین ${label}`
    case 'weightedAvg': return `میانگین وزنی ${label}`
    case 'min': return `کمینه ${label}`
    case 'max': return `بیشینه ${label}`
    case 'median': return `میانه ${label}`
    case 'last': return `آخرین ${label}`
    // محاسبات آماری — بخش ۱۳.۲ سند
    case 'mode': return `نما ${label}`
    case 'range': return `دامنه ${label}`
    case 'variance': return `واریانس ${label}`
    case 'varianceSample': return `واریانس نمونه ${label}`
    case 'stdDev': return `انحراف معیار ${label}`
    case 'stdDevSample': return `انحراف معیار نمونه ${label}`
    case 'quartile1': return `چارک اول ${label}`
    case 'quartile3': return `چارک سوم ${label}`
    case 'percentile': return `صدک ${toPersianDigits(String(Math.round((percentileP ?? 0.5) * 100)))} ${label}`
    case 'iqr': return `فاصله بین چارکی ${label}`
    case 'cv': return `ضریب تغییرات ${label}`
    default: return label
  }
}

// تجمیع سنجه — بخش ۱۳.۱ و ۱۳.۲ سند
// مبلغ‌ها ابتدا به مبنای ریال تبدیل می‌شوند تا همه آماره‌ها (از جمله واریانس) در واحد صحیح باشند — بخش ۱۴.۱
// عمومی: توسط موتور جدول محوری (بخش ۱۹.۲) نیز استفاده می‌شود
export function aggregateMeasure(
  recs: DataRow[], m: QuerySpec['measures'][number], fields: FieldMeta[], warnings: string[],
  statOptions: StatOptions = DEFAULT_STAT_OPTIONS
): number {
  const fieldId = m.fieldId ?? ''
  const f = fields.find(x => x.id === fieldId)
  const isAmount = f?.type === 'amount' && f.unit && isCurrencyUnit(f.unit)
  const factor = isAmount ? getUnit(f!.unit!).factor : 1
  // میانگین وزنی — Σ(x·w)/Σw (بخش ۱۳.۱)
  if (m.agg === 'weightedAvg' && m.weightFieldId) {
    const wId = m.weightFieldId
    let sw = 0, sxw = 0
    for (const r of recs) {
      const x = num(r[fieldId]); const w = num(r[wId])
      if (x === null || w === null) continue
      const xb = isAmount ? x * factor : x
      sw += w; sxw += xb * w
    }
    if (sw === 0) {
      warnings.push('جمع وزن‌ها صفر است؛ میانگین وزنی تعریف‌نشده است (بخش ۱۳.۱ سند).')
      return 0
    }
    return sxw / sw
  }
  const raw = aggregate(recs, fieldId, m.agg, r => {
    const n = num(r[fieldId])
    return n === null ? null : n * factor // تبدیل واحد پیش از محاسبه — صحت واریانس و انحراف معیار
  }, warnings, statOptions, m.percentileP)
  return raw
}

// تجمیع با مدیریت مقادیر خالی — معیار پذیرش ۳۳.۹ و کنترل مدیر بخش ۱۳.۲
function aggregate(
  recs: DataRow[], fieldId: string, agg: AggregationType,
  extract: (r: DataRow) => number | null,
  warnings: string[],
  statOptions: StatOptions = DEFAULT_STAT_OPTIONS,
  percentileP = 0.5
): number {
  let vals = recs.map(extract).filter((v): v is number => v !== null)
  if (statOptions.nullBehavior === 'zero' && recs.length > 0) {
    // رفتار خالی «صفر»: رکوردهای بدون مقدار عددی صفر فرض می‌شوند — بخش ۱۳.۲
    vals = recs.map(r => extract(r) ?? 0)
  }
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  const sorted = () => [...vals].sort((a, b) => a - b)
  switch (agg) {
    case 'sum': return vals.reduce((a, b) => a + b, 0)
    case 'count': return recs.length
    case 'countDistinct': return new Set(recs.map(r => String(r[fieldId] ?? ''))).size
    case 'avg': return vals.length ? mean : 0
    case 'weightedAvg': return vals.length ? mean : 0 // بدون ستون وزن = میانگین ساده
    case 'min': return vals.length ? Math.min(...vals) : 0
    case 'max': return vals.length ? Math.max(...vals) : 0
    case 'median': return vals.length ? statQuantile(sorted(), 0.5, statOptions.percentileMethod) : 0
    case 'last': return vals.length ? vals[vals.length - 1] : 0
    // محاسبات آماری — بخش ۱۳.۲ سند
    case 'mode': {
      if (!vals.length) return 0
      const freq = new Map<number, number>()
      for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1)
      let best = vals[0], bestC = -1
      for (const [v, c] of freq) if (c > bestC || (c === bestC && v < best)) { best = v; bestC = c }
      return best
    }
    case 'range': return vals.length ? Math.max(...vals) - Math.min(...vals) : 0
    case 'variance': return statVariance(vals, statOptions.stdDevType === 'population' ? 'population' : 'sample')
    case 'varianceSample': return statVariance(vals, 'sample')
    case 'stdDev': return Math.sqrt(statVariance(vals, statOptions.stdDevType === 'population' ? 'population' : 'sample'))
    case 'stdDevSample': return Math.sqrt(statVariance(vals, 'sample'))
    case 'quartile1': return vals.length ? statQuantile(sorted(), 0.25, statOptions.percentileMethod) : 0
    case 'quartile3': return vals.length ? statQuantile(sorted(), 0.75, statOptions.percentileMethod) : 0
    case 'percentile': return vals.length ? statQuantile(sorted(), Math.min(1, Math.max(0, percentileP)), statOptions.percentileMethod) : 0
    case 'iqr': {
      if (!vals.length) return 0
      const s = sorted()
      return statQuantile(s, 0.75, statOptions.percentileMethod) - statQuantile(s, 0.25, statOptions.percentileMethod)
    }
    case 'cv': {
      // ضریب تغییرات = انحراف معیار ÷ میانگین — بدون واحد؛ نوع از تنظیمات مدیر
      if (!vals.length || mean === 0) return 0
      return Math.sqrt(statVariance(vals, statOptions.stdDevType === 'population' ? 'population' : 'sample')) / Math.abs(mean)
    }
    default: return 0
  }
}

// واریانس جامعه (n) یا نمونه (n−۱) — بخش ۱۳.۲
function statVariance(vals: number[], kind: 'sample' | 'population'): number {
  const n = vals.length
  if (n === 0) return 0
  if (kind === 'sample' && n < 2) return 0 // واریانس نمونه برای یک داده تعریف‌نشده است
  const mean = vals.reduce((a, b) => a + b, 0) / n
  const ss = vals.reduce((a, b) => a + (b - mean) ** 2, 0)
  return ss / (kind === 'sample' ? n - 1 : n)
}

// صدک/چارک با روش قابل تنظیم مدیر — بخش ۱۳.۲
// linear: درون‌یابی خطی (استاندارد R-7)؛ nearest: نزدیک‌ترین رتبه
export function statQuantile(sortedVals: number[], p: number, method: 'linear' | 'nearest' = 'linear'): number {
  const s = sortedVals
  if (s.length === 0) return 0
  if (s.length === 1) return s[0]
  if (method === 'nearest') {
    const idx = Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))
    return s[idx]
  }
  const idx = p * (s.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return s[lo]
  return s[lo] + (idx - lo) * (s[hi] - s[lo])
}

// تولید پیش‌نویس گزارش توصیفی — بخش ۲۰ سند
// متن از داده و محاسبات تأییدشده تولید می‌شود و اعداد با جدول سازگارند
export function buildDescriptiveReport(
  records: DataRow[], fields: FieldMeta[], spec: QuerySpec,
  result: QueryResult, datasetName: string, dateField?: string
): string {
  const lines: string[] = []
  const fieldById = new Map(fields.map(f => [f.id, f]))

  // حجم داده و بازه پوشش — بخش ۲۰
  lines.push(`در مجموعه‌داده «${datasetName}» تعداد ${result.scannedRecords.toLocaleString('fa-IR')} رکورد با اعمال فیلترهای انتخابی بررسی شد.`)

  if (dateField && fieldById.get(dateField)?.type === 'date') {
    const vals = records.map(r => r[dateField]).filter(Boolean)
    if (vals.length > 0) {
      lines.push(`داده‌های زمانی مربوط به «${fieldById.get(dateField)?.label}» مبنای تحلیل روند قرار گرفته است.`)
    }
  }

  // مجموع و میانگین سنجه‌ها
  for (const m of spec.measures) {
    const f = fieldById.get(m.fieldId ?? '')
    const alias = m.alias ?? measureAlias(m.fieldId, m.agg, fields)
    const val = result.totals[alias]
    if (typeof val !== 'number') continue
    if (f?.type === 'amount') {
      // نمایش با واحد مناسب — واحد ورودی به مبنای ریال تبدیل شده و سپس نمایش داده می‌شود (بخش ۱۴ سند)
      const display = m.displayUnit && m.displayUnit !== 'auto' ? m.displayUnit : undefined
      lines.push(`${alias} برابر ${formatAmount(val, { displayUnit: display, autoUnitLabel: true })} است.`)
    } else {
      lines.push(`${alias} برابر ${val.toLocaleString('fa-IR', { maximumFractionDigits: 2 })} است.`)
    }
  }

  // گروه‌های برتر — بخش ۲۰
  if (spec.dimensions.length > 0 && spec.measures.length > 0 && result.rows.length > 0) {
    const firstMeasure = spec.measures[0]
    const alias = firstMeasure.alias ?? measureAlias(firstMeasure.fieldId, firstMeasure.agg, fields)
    const sorted = [...result.rows].sort((a, b) => (typeof b[alias] === 'number' ? b[alias] as number : 0) - (typeof a[alias] === 'number' ? a[alias] as number : 0))
    const top = sorted[0]
    const dimLabel = fieldById.get(spec.dimensions[0])?.label ?? spec.dimensions[0]
    const total = typeof result.totals[alias] === 'number' ? result.totals[alias] as number : 0
    const topVal = typeof top[alias] === 'number' ? top[alias] as number : 0
    const share = total > 0 ? (topVal / total * 100).toFixed(1) : '0'
    if (top[spec.dimensions[0]] !== null && top[spec.dimensions[0]] !== undefined) {
      lines.push(`بیشترین سهم به «${top[spec.dimensions[0]]}» در بُعد ${dimLabel} اختصاص دارد (حدود ${share}٪ از کل).`)
    }
    const bottom = sorted[sorted.length - 1]
    if (sorted.length > 1 && bottom[spec.dimensions[0]] !== null) {
      lines.push(`کمترین مقدار مربوط به «${bottom[spec.dimensions[0]]}» است.`)
    }
    lines.push(`تعداد گروه‌های متمایز در این گزارش ${result.rowCount.toLocaleString('fa-IR')} گروه است.`)
  }

  // داده‌های ناقص و محدودیت‌های گزارش — بخش ۲۰
  if (result.warnings.length > 0) {
    lines.push('محدودیت‌ها و هشدارها:')
    for (const w of result.warnings) lines.push(`• ${w}`)
  }

  // مقادیر خالی
  const nulls = fields.filter(f => {
    const n = records.filter(r => r[f.id] === null || r[f.id] === undefined || String(r[f.id]).trim() === '').length
    return n > 0
  })
  if (nulls.length > 0) {
    lines.push(`${nulls.length} ستون دارای مقدار خالی است؛ این داده‌ها در تجمیع مربوطه لحاظ نشده‌اند و باید در تفسیر گزارش لحاظ شوند.`)
  }

  return lines.join('\n')
}
