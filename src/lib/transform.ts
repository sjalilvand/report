// ابزارهای پاک‌سازی و تبدیل — بخش ۱۰ سند
// هر اقدام در دفترچه مراحل تبدیل ثبت می‌شود (بخش ۱۰.۳)

import { DataRow, TransformStep, FieldMeta } from './types'
import { toLatinDigits, toPersianDigits } from './digits'
import { getUnit, isCurrencyUnit } from './currency'

// تحلیل عدد از مقدار خام — پشتیبانی ممیز فارسی و جداکننده
function parseNumLoose(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = toLatinDigits(String(v)).replace(/[٫,\u060C\s]/g, m => m === '٫' ? '.' : '')
  if (s === '' || s === '.') return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

export interface TransformOpDef {
  op: string
  label: string
  category: 'text' | 'structural'
  description: string
  params?: { key: string; label: string; type: 'text' | 'number' | 'select' | 'boolean'; options?: string[] }[]
}

// فهرست عملیات در دسترس — بخش‌های ۱۰.۱ و ۱۰.۲ سند
export const TRANSFORM_OPS: TransformOpDef[] = [
  { op: 'trim', label: 'حذف فاصله ابتدا و انتها', category: 'text', description: 'حذف فاصله‌های ابتدا و انتهای مقادیر متنی (بخش ۱۰.۱)' },
  { op: 'collapseSpaces', label: 'اصلاح فاصله‌های تکراری', category: 'text', description: 'فاصله‌های متوالی به یک فاصله تبدیل می‌شود' },
  { op: 'unifyPersian', label: 'یکسان‌سازی «ی» و «ک»', category: 'text', description: 'حروف عربی «ي» و «ك» به فارسی تبدیل می‌شود' },
  { op: 'toLatinDigits', label: 'تبدیل ارقام به لاتین', category: 'text', description: 'ارقام فارسی و عربی به لاتین تبدیل می‌شود (بخش ۱۰.۱)' },
  { op: 'toPersianDigits', label: 'تبدیل ارقام به فارسی', category: 'text', description: 'ارقام لاتین به فارسی تبدیل می‌شود' },
  { op: 'replace', label: 'جست‌وجو و جایگزینی', category: 'text', description: 'جایگزینی مقدار یا الگو در ستون', params: [
    { key: 'find', label: 'مقدار جست‌وجو', type: 'text' },
    { key: 'replaceWith', label: 'مقدار جایگزین', type: 'text' },
  ] },
  { op: 'mapValues', label: 'نگاشت مقادیر به مقدار مرجع', category: 'text', description: 'نگاشت معادل‌ها به یک مقدار مرجع؛ مانند «تهران »، «استان تهران» → «تهران» (بخش ۱۰.۱)', params: [
    { key: 'mapping', label: 'نگاشت (مقدار فعلی => مقدار مرجع) هر سطر یک مورد', type: 'text' },
  ] },
  { op: 'splitColumn', label: 'تقسیم ستون با جداکننده', category: 'text', description: 'شکستن یک ستون به چند ستون', params: [
    { key: 'separator', label: 'جداکننده', type: 'text' },
  ] },
  { op: 'mergeColumns', label: 'ادغام چند ستون', category: 'text', description: 'ترکیب چند ستون متنی', params: [
    { key: 'separator', label: 'جداکننده', type: 'text' },
    { key: 'newName', label: 'نام ستون جدید', type: 'text' },
  ] },
  { op: 'dropColumns', label: 'حذف ستون‌ها', category: 'structural', description: 'حذف ستون‌های انتخاب‌شده (بخش ۱۰.۲)', params: [
    { key: 'columns', label: 'شناسه ستون‌ها (با کاما)', type: 'text' },
  ] },
  { op: 'keepColumns', label: 'نگهداری ستون‌ها', category: 'structural', description: 'فقط ستون‌های انتخاب‌شده باقی بمانند', params: [
    { key: 'columns', label: 'شناسه ستون‌ها (با کاما)', type: 'text' },
  ] },
  { op: 'filterRows', label: 'فیلتر سطرها', category: 'structural', description: 'نگه‌داشتن سطرهایی که شرط را دارند (بخش ۱۰.۲)', params: [
    { key: 'column', label: 'ستون', type: 'text' },
    { key: 'op', label: 'عملگر', type: 'select', options: ['eq', 'neq', 'contains', 'gt', 'lt', 'notnull', 'isnull'] },
    { key: 'value', label: 'مقدار', type: 'text' },
  ] },
  { op: 'sortRows', label: 'مرتب‌سازی', category: 'structural', description: 'مرتب‌سازی بر اساس یک ستون', params: [
    { key: 'column', label: 'ستون', type: 'text' },
    { key: 'dir', label: 'ترتیب', type: 'select', options: ['asc', 'desc'] },
  ] },
  { op: 'dedupe', label: 'حذف تکرار', category: 'structural', description: 'حذف رکوردهای تکراری با کلید و سیاست نگهداری (بخش ۱۰.۲ و ۱۷.۲)', params: [
    { key: 'columns', label: 'کلیدها (با کاما؛ خالی = همه ستون‌ها)', type: 'text' },
    { key: 'keep', label: 'سیاست نگهداری', type: 'select', options: ['first', 'last'] },
  ] },
  { op: 'fillNull', label: 'پرکردن مقدار خالی', category: 'structural', description: 'پرکردن مقادیر خالی با قاعده مشخص (بخش ۱۰.۲)', params: [
    { key: 'column', label: 'ستون', type: 'text' },
    { key: 'method', label: 'روش', type: 'select', options: ['value', 'ffill'] },
    { key: 'value', label: 'مقدار (برای روش value)', type: 'text' },
  ] },
  { op: 'addSourceColumn', label: 'افزودن ستون منشأ فایل و شیت', category: 'structural', description: 'ثبت منشأ داده برای ردیابی (بخش ۱۰.۲ و ۴)', params: [
    { key: 'fileName', label: 'نام فایل', type: 'text' },
    { key: 'sheetName', label: 'نام شیت', type: 'text' },
  ] },
  { op: 'unpivot', label: 'تبدیل ستون‌ها به سطر (Unpivot)', category: 'structural', description: 'گسترش ستون‌های انتخابی به جفت «شاخص/مقدار» — فرمت پهن به بلند (بخش ۱۰.۲)', params: [
    { key: 'keepColumns', label: 'ستون‌های ثابت (با کاما)', type: 'text' },
    { key: 'unpivotColumns', label: 'ستون‌های تبدیل‌شونده (با کاما)', type: 'text' },
    { key: 'attrName', label: 'نام ستون شاخص', type: 'text' },
    { key: 'valueName', label: 'نام ستون مقدار', type: 'text' },
  ] },
  { op: 'pivot', label: 'تبدیل سطرها به ستون (Pivot ساختاری)', category: 'structural', description: 'تبدیل مقادیر یک ستون به ستون‌های جدید با تجمیع — فرمت بلند به پهن (بخش ۱۰.۲)', params: [
    { key: 'keyColumns', label: 'ستون‌های کلید گروه‌بندی (با کاما)', type: 'text' },
    { key: 'attributeColumn', label: 'ستونی که مقادیرش ستون می‌شوند', type: 'text' },
    { key: 'valueColumn', label: 'ستون مقدار', type: 'text' },
    { key: 'agg', label: 'تجمیع', type: 'select', options: ['sum', 'avg', 'count', 'min', 'max', 'first'] },
    { key: 'fillValue', label: 'مقدار پرکننده خانه‌های خالی (اختیاری)', type: 'text' },
    { key: 'colLimit', label: 'حداکثر ستون خروجی', type: 'number' },
  ] },
]

const YATYPES = { y: 'ي', k: 'ك' }

// اعمال یک عملیات تبدیل — خروجی همیشه نسخه جدید است (ویرایش غیرمخرب — بخش ۴)
export function applyTransform(
  records: DataRow[],
  fields: FieldMeta[],
  op: string,
  config: Record<string, unknown>
): { records: DataRow[]; fields: FieldMeta[]; warnings: string[]; errors: string[] } {
  let out = records
  let outFields = fields
  const warnings: string[] = []
  const errors: string[] = []

  switch (op) {
    case 'trim': {
      out = records.map(r => mapTextCol(r, config, v => v.trim()))
      break
    }
    case 'collapseSpaces': {
      out = records.map(r => mapTextCol(r, config, v => v.replace(/\s{2,}/g, ' ')))
      break
    }
    case 'unifyPersian': {
      out = records.map(r => mapTextCol(r, config, v => v.replace(YATYPES.y, 'ی').replace(YATYPES.k, 'ک')))
      break
    }
    case 'toLatinDigits': {
      out = records.map(r => mapTextCol(r, config, v => toLatinDigits(v)))
      break
    }
    case 'toPersianDigits': {
      out = records.map(r => mapTextCol(r, config, v => toPersianDigits(v)))
      break
    }
    case 'replace': {
      const find = String(config.find ?? '')
      const rep = String(config.replaceWith ?? '')
      if (!find) { errors.push('مقدار جست‌وجو الزامی است.'); break }
      out = records.map(r => mapTextCol(r, config, v => v.split(find).join(rep)))
      break
    }
    case 'mapValues': {
      const raw = String(config.mapping ?? '')
      const mapping = new Map<string, string>()
      for (const line of raw.split('\n')) {
        const idx = line.indexOf('=>')
        if (idx < 0) continue
        const from = line.slice(0, idx).trim()
        const to = line.slice(idx + 2).trim()
        if (from) mapping.set(from, to)
      }
      if (mapping.size === 0) { errors.push('حداقل یک قاعده نگاشت به شکل «مقدار => مقدار مرجع» لازم است.'); break }
      let changed = 0
      out = records.map(r => {
        const col = String(config.column ?? '')
        const v = String(r[col] ?? '').trim()
        const t = mapping.get(v)
        if (t !== undefined && t !== v) changed++
        return t !== undefined ? { ...r, [col]: t } : r
      })
      warnings.push(`${changed} مقدار با قواعد نگاشت اصلاح شد.`)
      break
    }
    case 'splitColumn': {
      const col = String(config.column ?? '')
      const sep = String(config.separator ?? '-')
      if (!col || !records.some(r => col in r)) { errors.push('ستون موردنظر یافت نشد.'); break }
      const newNames = [`${col}-۱`, `${col}-۲`]
      out = records.map(r => {
        const v = String(r[col] ?? '')
        const parts = v.split(sep)
        return { ...r, [newNames[0]]: parts[0] ?? '', [newNames[1]]: parts.slice(1).join(sep) ?? '' }
      })
      outFields = [...fields,
        { ...fields[0], id: newNames[0], sourceName: newNames[0], label: newNames[0], type: 'text', role: 'attribute', aggregation: 'count' },
        { ...fields[0], id: newNames[1], sourceName: newNames[1], label: newNames[1], type: 'text', role: 'attribute', aggregation: 'count' },
      ]
      break
    }
    case 'mergeColumns': {
      const cols = String(config.columns ?? '').split(',').map(s => s.trim()).filter(Boolean)
      if (cols.length < 2) { errors.push('حداقل دو ستون لازم است.'); break }
      const sep = String(config.separator ?? ' ')
      const newName = String(config.newName ?? cols.join('-'))
      out = records.map(r => ({ ...r, [newName]: cols.map(c => String(r[c] ?? '')).filter(Boolean).join(sep) }))
      outFields = [...fields, { ...fields[0], id: newName, sourceName: newName, label: newName, type: 'text', role: 'attribute', aggregation: 'count' }]
      break
    }
    case 'dropColumns': {
      const cols = String(config.columns ?? '').split(',').map(s => s.trim()).filter(Boolean)
      if (cols.length === 0) { errors.push('حداقل یک ستون لازم است.'); break }
      out = records.map(r => { const c = { ...r }; for (const k of cols) delete c[k]; return c })
      outFields = fields.filter(f => !cols.includes(f.id))
      break
    }
    case 'keepColumns': {
      const cols = String(config.columns ?? '').split(',').map(s => s.trim()).filter(Boolean)
      if (cols.length === 0) { errors.push('حداقل یک ستون لازم است.'); break }
      out = records.map(r => {
        const c: DataRow = {}
        for (const k of cols) if (k in r) c[k] = r[k]
        return c
      })
      outFields = fields.filter(f => cols.includes(f.id))
      break
    }
    case 'filterRows': {
      const col = String(config.column ?? '')
      const o = String(config.op ?? 'eq')
      const val = config.value === undefined ? '' : String(config.value)
      const before = out.length
      out = records.filter(r => {
        const v = r[col]
        const sv = v === null || v === undefined ? '' : String(v).trim()
        const numV = parseFloat(toLatinDigits(sv))
        const numT = parseFloat(toLatinDigits(val))
        switch (o) {
          case 'eq': return sv === val || (Number.isFinite(numV) && Number.isFinite(numT) && numV === numT)
          case 'neq': return sv !== val
          case 'contains': return sv.includes(val)
          case 'gt': return Number.isFinite(numV) && Number.isFinite(numT) && numV > numT
          case 'lt': return Number.isFinite(numV) && Number.isFinite(numT) && numV < numT
          case 'notnull': return sv !== ''
          case 'isnull': return sv === ''
          default: return true
        }
      })
      warnings.push(`${before - out.length} سطر حذف شد.`)
      break
    }
    case 'sortRows': {
      const col = String(config.column ?? '')
      const dir = String(config.dir ?? 'asc') === 'desc' ? -1 : 1
      out = [...records].sort((a, b) => {
        const av = a[col], bv = b[col]
        const an = parseFloat(toLatinDigits(String(av)))
        const bn = parseFloat(toLatinDigits(String(bv)))
        if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir
        return String(av ?? '').localeCompare(String(bv ?? ''), 'fa') * dir
      })
      break
    }
    case 'dedupe': {
      const cols = String(config.columns ?? '').split(',').map(s => s.trim()).filter(Boolean)
      const keyCols = cols.length > 0 ? cols : outFields.map(f => f.id)
      const keep = String(config.keep ?? 'first')
      const before = out.length
      const seen = new Map<string, number>()
      out = records.filter(r => {
        const key = keyCols.map(c => String(r[c] ?? '')).join('§')
        if (!seen.has(key)) { seen.set(key, 1); return keep === 'first' }
        if (keep === 'last') { return false }
        return false
      })
      warnings.push(`${before - out.length} رکورد تکراری حذف شد (کلید: ${keyCols.join('، ')}) — بخش ۱۷.۲ سند.`)
      break
    }
    case 'fillNull': {
      const col = String(config.column ?? '')
      const method = String(config.method ?? 'value')
      const val = String(config.value ?? '')
      let filled = 0
      let last = val
      out = records.map(r => {
        const v = r[col]
        if (v === null || v === undefined || String(v).trim() === '') {
          filled++
          if (method === 'ffill') return { ...r, [col]: last }
          return { ...r, [col]: val }
        }
        if (method === 'ffill') last = String(v)
        return r
      })
      warnings.push(`${filled} مقدار خالی پر شد (بخش ۱۰.۲ سند).`)
      break
    }
    case 'addSourceColumn': {
      const name = 'منشأ'
      out = records.map(r => ({ ...r, [name]: `${config.fileName ?? ''} / ${config.sheetName ?? ''}` }))
      outFields = [...fields, { ...fields[0], id: name, sourceName: name, label: 'منشأ فایل و شیت', type: 'text', role: 'attribute', aggregation: 'count', description: 'ستون منشأ داده — بخش ۱۰.۲ سند' }]
      break
    }
    // تبدیل ستون‌ها به سطر (Unpivot) — بخش ۱۰.۲: فرمت پهن به بلند
    case 'unpivot': {
      const keepCols = String(config.keepColumns ?? '').split(',').map(s => s.trim()).filter(Boolean)
      const unpivotCols = String(config.unpivotColumns ?? '').split(',').map(s => s.trim()).filter(c => c && fields.some(f => f.id === c))
      if (unpivotCols.length === 0) { errors.push('حداقل یک ستون معتبر برای تبدیل به سطر لازم است (بخش ۱۰.۲ سند).'); break }
      const unknownKeep = keepCols.filter(c => !fields.some(f => f.id === c))
      if (unknownKeep.length > 0) warnings.push(`ستون‌های ثابت ناشناخته نادیده گرفته شد: ${unknownKeep.join('، ')}`)
      const attrName = String(config.attrName ?? '').trim() || 'شاخص'
      const valueName = String(config.valueName ?? '').trim() || 'مقدار'
      const effKeep = keepCols.filter(c => fields.some(f => f.id === c) && !unpivotCols.includes(c))
      const rows: DataRow[] = []
      // مبلغ‌های ارزی هنگام گسترش به مبنای ریال نرمال می‌شوند تا جمع پس از Unpivot حفظ شود — بخش ۱۴.۱
      const currencyFactor = new Map<string, number>()
      for (const c of unpivotCols) {
        const fm = fields.find(f => f.id === c)
        currencyFactor.set(c, fm?.type === 'amount' && fm.unit && isCurrencyUnit(fm.unit) ? getUnit(fm.unit).factor : 1)
      }
      for (const r of records) {
        for (const c of unpivotCols) {
          const row: DataRow = {}
          for (const k of effKeep) row[k] = r[k] ?? null
          row[attrName] = fields.find(f => f.id === c)?.label ?? c
          const rawV = r[c]
          const fnum = parseNumLoose(rawV)
          row[valueName] = rawV === null || rawV === undefined
            ? null
            : (fnum !== null ? fnum * (currencyFactor.get(c) ?? 1) : rawV)
          rows.push(row)
        }
      }
      out = rows
      const keptFields = fields.filter(f => effKeep.includes(f.id))
      const attrField: FieldMeta = { ...fields[0], id: attrName, sourceName: attrName, label: attrName, type: 'text', role: 'dimension', aggregation: 'count', description: 'ستون شاخص پس از Unpivot — بخش ۱۰.۲ سند' }
      const allNumeric = unpivotCols.every(c => ['integer', 'decimal', 'amount', 'percent'].includes(fields.find(x => x.id === c)?.type ?? ''))
      const allCurrency = unpivotCols.length > 0 && unpivotCols.every(c => {
        const fm = fields.find(x => x.id === c)
        return fm?.type === 'amount' && fm.unit && isCurrencyUnit(fm.unit)
      })
      const valField: FieldMeta = {
        ...fields[0], id: valueName, sourceName: valueName, label: valueName,
        type: allNumeric ? 'decimal' : 'text',
        role: allNumeric ? 'measure' : 'attribute',
        aggregation: allNumeric ? 'sum' : 'count',
        unit: allCurrency ? 'ریال' : undefined, // همه ستون‌ها ارزی‌اند → مقادیر اکنون مبنای ریال‌اند
        description: 'ستون مقدار پس از Unpivot — بخش ۱۰.۲ سند',
      }
      outFields = [...keptFields, attrField, valField]
      warnings.push(`${records.length} سطر به ${rows.length} سطر گسترش یافت (${unpivotCols.length} ستون تبدیل شد — بخش ۱۰.۲ سند).`)
      break
    }
    // تبدیل سطرها به ستون (Pivot ساختاری) — بخش ۱۰.۲: فرمت بلند به پهن
    case 'pivot': {
      const keyCols = String(config.keyColumns ?? '').split(',').map(s => s.trim()).filter(c => c && fields.some(f => f.id === c))
      const attrCol = String(config.attributeColumn ?? '').trim()
      const valCol = String(config.valueColumn ?? '').trim()
      if (keyCols.length === 0 || !attrCol || !valCol) {
        errors.push('ستون کلید، ستون شاخص و ستون مقدار همه الزامی‌اند (بخش ۱۰.۲ سند).')
        break
      }
      if (!fields.some(f => f.id === attrCol) || !fields.some(f => f.id === valCol)) {
        errors.push('ستون شاخص یا ستون مقدار یافت نشد.')
        break
      }
      const agg = String(config.agg ?? 'sum')
      const rawFill = String(config.fillValue ?? '').trim()
      const fillValue = rawFill === '' ? null : (Number.isFinite(parseFloat(rawFill)) ? parseFloat(rawFill) : rawFill)
      const colLimit = Math.max(1, Math.min(100, Math.floor(Number(config.colLimit ?? 30))))
      // مقادیر متمایز ستون شاخص به ترتیب اولین وقوع
      const colKeys: string[] = []
      for (const r of records) {
        const k = r[attrCol] === null || r[attrCol] === undefined || String(r[attrCol]).trim() === '' ? '—' : String(r[attrCol])
        if (!colKeys.includes(k)) colKeys.push(k)
      }
      let truncated = false
      if (colKeys.length > colLimit) { colKeys.length = colLimit; truncated = true }
      // گروه‌بندی بر اساس کلیدها
      const groups = new Map<string, DataRow[]>()
      const keyOrder: string[] = []
      for (const r of records) {
        const key = keyCols.map(c => String(r[c] ?? '')).join('§')
        if (!groups.has(key)) keyOrder.push(key)
        const arr = groups.get(key)
        if (arr) arr.push(r)
        else groups.set(key, [r])
      }
      // مقدار عددی یا متنی؟
      const valIsNumeric = ['integer', 'decimal', 'amount', 'percent'].includes(fields.find(x => x.id === valCol)?.type ?? '')
      const rows: DataRow[] = []
      for (const key of keyOrder) {
        const recs = groups.get(key) ?? []
        const row: DataRow = {}
        keyCols.forEach((c, i) => { row[c] = key.split('§')[i] })
        for (const ck of colKeys) {
          const subset = recs.filter(r => (r[attrCol] === null || r[attrCol] === undefined || String(r[attrCol]).trim() === '' ? '—' : String(r[attrCol])) === ck)
          let v: number | string | null
          if (subset.length === 0) {
            v = fillValue
          } else if (agg === 'count') {
            v = subset.length
          } else if (!valIsNumeric && agg !== 'first') {
            v = null // تجمیع عددی روی مقدار غیرعددی تعریف‌نشده است
          } else {
            const nums = subset.map(r => parseFloat(String(r[valCol] ?? '').replace(/[٫,\u060C\s]/g, m => m === '٫' ? '.' : ''))).filter(Number.isFinite)
            switch (agg) {
              case 'sum': v = nums.length ? nums.reduce((a, b) => a + b, 0) : (fillValue ?? 0); break
              case 'avg': v = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : (fillValue ?? 0); break
              case 'min': v = nums.length ? Math.min(...nums) : (fillValue ?? 0); break
              case 'max': v = nums.length ? Math.max(...nums) : (fillValue ?? 0); break
              case 'first': default: {
                const fv = subset[0][valCol]
                v = fv === null || fv === undefined ? fillValue : (typeof fv === 'number' || typeof fv === 'string' ? fv : String(fv))
                break
              }
            }
          }
          row[ck] = v
        }
        rows.push(row)
      }
      out = rows
      const keptFields = fields.filter(f => keyCols.includes(f.id))
      const valFieldMeta = fields.find(x => x.id === valCol)
      const newCols: FieldMeta[] = colKeys.map(ck => ({
        ...fields[0],
        id: ck, sourceName: ck, label: ck,
        type: agg === 'count' || (valIsNumeric && agg !== 'first') ? 'decimal' : 'text',
        role: agg === 'count' || (valIsNumeric && agg !== 'first') ? 'measure' : 'attribute',
        aggregation: agg === 'count' || (valIsNumeric && agg !== 'first') ? 'sum' : 'count',
        unit: agg === 'count' ? undefined : valFieldMeta?.unit,
        description: `ستون حاصل از Pivot مقدار «${ck}» — بخش ۱۰.۲ سند`,
      }))
      outFields = [...keptFields, ...newCols]
      if (truncated) warnings.push(`تعداد مقادیر متمایز ستون شاخص بیش از حد مجاز بود؛ ${colLimit} ستون نخست ساخته شد (بخش ۱۰.۲ سند).`)
      warnings.push(`${records.length} سطر به ${rows.length} سطر با ${colKeys.length} ستون جدید فشرده شد (تجمیع: ${agg} — بخش ۱۰.۲ سند).`)
      break
    }
    default:
      errors.push(`عملیات «${op}» شناخته نشد.`)
  }
  return { records: out, fields: outFields, warnings, errors }
}

function mapTextCol(r: DataRow, config: Record<string, unknown>, fn: (s: string) => string): DataRow {
  const col = String(config.column ?? '')
  if (!col) return r
  const v = r[col]
  if (v === null || v === undefined) return r
  return { ...r, [col]: fn(String(v)) }
}

// ساخت مرحله ثبت‌شده برای دفترچه — بخش ۱۰.۳
export function makeStep(op: string, config: Record<string, unknown>, before: number, after: number, warnings: string[], errors: string[], userId = 'مدیر'): TransformStep {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    op, config, userId, at: new Date().toISOString(),
    before, after, warnings: warnings.length ? warnings : undefined, errors: errors.length ? errors : undefined,
  }
}
