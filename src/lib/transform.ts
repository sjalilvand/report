// ابزارهای پاک‌سازی و تبدیل — بخش ۱۰ سند
// هر اقدام در دفترچه مراحل تبدیل ثبت می‌شود (بخش ۱۰.۳)

import { DataRow, TransformStep, FieldMeta } from './types'
import { toLatinDigits, toPersianDigits } from './digits'

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
