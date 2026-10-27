// موتور محاسبات و پرس‌وجو — بخش ۱۱، ۱۳ و ۲۰ سند
// تفکیک ابعاد و سنجه‌ها، انواع تجمیع، واحدها و تولید گزارش توصیفی

import { DataRow, FieldMeta, QuerySpec, QueryResult, AggregationType, QueryFilter } from './types'
import { toLatinDigits } from './digits'
import { formatAmount, getUnit, isCurrencyUnit } from './currency'

function num(v: unknown): number | null {
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

    // بدون گروه‌بندی: آمار کل
  if (spec.dimensions.length === 0) {
    const totals: Record<string, unknown> = {}
    for (const m of spec.measures) {
      const alias = m.alias ?? measureAlias(m.fieldId, m.agg, fields)
      totals[alias] = aggregateMeasure(data, m, fields, warnings)
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
      const alias = m.alias ?? measureAlias(m.fieldId, m.agg, fields)
      row[alias] = aggregateMeasure(recs, m, fields, warnings)
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
    const alias = first.alias ?? measureAlias(first.fieldId, first.agg, fields)
    rows.sort((a, b) => (typeof b[alias] === 'number' ? b[alias] as number : 0) - (typeof a[alias] === 'number' ? a[alias] as number : 0))
  }

  const limited = spec.limit ? rows.slice(0, spec.limit) : rows

  // جمع کل — از مقادیر دقیق محاسبه شود نه اعداد گردشده (بخش ۱۴.۴)
  const totals: Record<string, unknown> = {}
  for (const m of spec.measures) {
    const alias = m.alias ?? measureAlias(m.fieldId, m.agg, fields)
    totals[alias] = aggregateMeasure(data, m, fields, warnings)
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

function matchFilter(v: unknown, flt: QueryFilter): boolean {
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

export function measureAlias(fieldId: string | undefined, agg: AggregationType, fields: FieldMeta[]): string {
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
    default: return label
  }
}

// تجمیع سنجه با تبدیل واحد پول به مبنای ریال — بخش ۱۴.۱ سند
// واحد ورودی (فیلد) → واحد ذخیره‌سازی مبنا (ریال) → واحد نمایش (در زمان قالب‌بندی)
function aggregateMeasure(
  recs: DataRow[], m: QuerySpec['measures'][number], fields: FieldMeta[], warnings: string[]
): number {
  const fieldId = m.fieldId ?? ''
  const f = fields.find(x => x.id === fieldId)
  const raw = aggregate(recs, fieldId, m.agg, r => num(r[fieldId]), warnings)
  if (!f) return raw
  // مبلغ‌ها به مبنای ریال تبدیل می‌شوند تا جمع مبلغ‌های با واحد متفاوت صحیح باشد (بخش ۱۴.۳)
  if (f.type === 'amount' && f.unit && isCurrencyUnit(f.unit) && ['sum', 'avg', 'min', 'max', 'median', 'last', 'weightedAvg'].includes(m.agg)) {
    return raw * getUnit(f.unit).factor
  }
  return raw
}

// تجمیع با مدیریت مقادیر خالی — معیار پذیرش ۳۳.۹ سند
function aggregate(
  recs: DataRow[], fieldId: string, agg: AggregationType,
  extract: (r: DataRow) => number | null,
  warnings: string[]
): number {
  const vals = recs.map(extract).filter((v): v is number => v !== null)
  switch (agg) {
    case 'sum': return vals.reduce((a, b) => a + b, 0)
    case 'count': return recs.length
    case 'countDistinct': return new Set(recs.map(r => String(r[fieldId] ?? ''))).size
    case 'avg': return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    case 'weightedAvg': return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 // MVP: ساده
    case 'min': return vals.length ? Math.min(...vals) : 0
    case 'max': return vals.length ? Math.max(...vals) : 0
    case 'median': {
      if (!vals.length) return 0
      const s = [...vals].sort((a, b) => a - b)
      const mid = Math.floor(s.length / 2)
      return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
    }
    case 'last': return vals.length ? vals[vals.length - 1] : 0
    default: return 0
  }
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
