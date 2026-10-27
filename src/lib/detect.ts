// تشخیص نوع داده و نقش تحلیلی — بخش ۸ سند
// تشخیص خودکار «پیشنهاد است نه تصمیم قطعی» — مبنای تأیید مدیر (بخش ۴)

import { FieldType, FieldRole, DataRow } from './types'
import { toLatinDigits } from './digits'
import { parseDateValue } from './jalali'
import { detectUnitFromLabel, isCurrencyUnit } from './currency'

export interface ColumnDetection {
  detectedType: FieldType
  confidence: number // 0..1 — میزان اطمینان، نه تضمین صحت
  roleSuggestion: FieldRole
  unitSuggestion?: string
  invalidIndices: number[] // شاخص رکوردهای نامعتبر نسبت به نوع پیشنهادی
  distinctCount: number
  nullCount: number
}

const AMOUNT_KEYWORDS = ['مبلغ', 'بهای', 'قیمت', 'ارزش', 'درآمد', 'هزینه', 'اعتبار', 'بودجه', 'وصولی', 'پرداختی', 'مانده']
const DATE_KEYWORDS = ['تاریخ', 'زمان', 'موعد']
const ID_KEYWORDS = ['شناسه', 'کد', 'شماره', 'ای‌دی', 'id', 'نمبر']
const NAME_KEYWORDS = ['نام', 'عنوان', 'شرح', 'استان', 'شهر', 'واحد', 'گروه', 'نوع']

function norm(v: unknown): string {
  return toLatinDigits(String(v ?? '')).trim().replace('٫', '.') // ممیز فارسی/عربی
}

function isNumeric(s: string): boolean {
  if (!s) return false
  const lat = toLatinDigits(s).replace('٫', '.')
  return /^-?[\d,.\u060C]+$/.test(lat.replace(/\s/g, '')) && /\d/.test(lat)
}

function toNumber(s: string): number | null {
  // جداکننده اعشار فارسی/عربی (٫) و ارقام فارسی/عربی — بخش ۱۰.۱
  const clean = norm(s).replace(/[\u060C,]/g, '')
  if (!/^-?\d*\.?\d+$/.test(clean)) return null
  const n = parseFloat(clean)
  return Number.isFinite(n) ? n : null
}

// تشخیص نوع یک ستون بر اساس نمونه مقادیر — بخش ۸.۱
export function detectColumn(
  values: unknown[],
  headerLabel: string
): ColumnDetection {
  const nonNull = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '')
  const nullCount = values.length - nonNull.length
  const sample = nonNull.slice(0, 500).map(String)

  if (nonNull.length === 0) {
    return { detectedType: 'text', confidence: 0.3, roleSuggestion: 'attribute', invalidIndices: [], distinctCount: 0, nullCount }
  }

  const header = norm(headerLabel).toLowerCase()
  const invalid: number[] = []

  // ۱) بررسی تاریخ
  const dateHits = sample.filter(v => {
    const s = toLatinDigits(v).trim()
    return /^\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}$/.test(s) || (typeof values[sample.indexOf(v)] === 'number' && +v > 20000 && +v < 80000)
  }).length
  const dateRatio = dateHits / sample.length

  // ۲) بررسی عددی
  const numHits = sample.filter(v => isNumeric(v)).length
  const numRatio = numHits / sample.length

  // ۳) بررسی منطقی
  const boolVals = new Set(['بله', 'خیر', 'true', 'false', 'دارد', 'ندارد', '0', '1', '1.0', '0.0'])
  const boolRatio = sample.filter(v => boolVals.has(v.trim().toLowerCase()) || boolVals.has(v.trim())).length / sample.length

  // ۴) شناسه: صفر ابتدایی یا طول یکنواخت بدون معنای عددی — بخش ۸.۱ نکته مهم
  const leadingZero = sample.filter(v => /^0\d+$/.test(toLatinDigits(v).trim())).length
  const allDigits = sample.filter(v => /^\d+$/.test(toLatinDigits(v).trim())).length
  const lengths = new Set(sample.filter(v => /^\d+$/.test(toLatinDigits(v).trim())).map(v => toLatinDigits(v).trim().length))
  const idLike = (leadingZero > 0 || (allDigits === sample.length && lengths.size === 1 && sample[0].length >= 4)) ? 1 : 0

  // تصمیم‌گیری به ترتیب اولویت
  if (dateRatio >= 0.7 || (dateRatio > 0 && DATE_KEYWORDS.some(k => header.includes(k)) && dateRatio > 0.3)) {
    let bad = 0
    nonNull.forEach((v, i) => { if (!parseDateValue(v).ok) { invalid.push(i); bad++ } })
    const conf = Math.min(1, dateRatio * 0.7 + (DATE_KEYWORDS.some(k => header.includes(k)) ? 0.3 : 0))
    return {
      detectedType: 'date', confidence: Math.max(0.55, conf), roleSuggestion: 'dimension',
      invalidIndices: invalid, distinctCount: new Set(sample).size, nullCount,
    }
  }

  if (boolRatio === 1 && sample.length > 1 && new Set(sample.map(v => v.trim())).size <= 3) {
    return { detectedType: 'boolean', confidence: 0.85, roleSuggestion: 'dimension', invalidIndices: [], distinctCount: new Set(sample).size, nullCount }
  }

  if (numRatio >= 0.85) {
    nonNull.forEach((v, i) => { if (toNumber(String(v)) === null) invalid.push(i) })
    const nums = sample.map(v => toNumber(v)).filter((n): n is number => n !== null)
    const allInt = nums.every(n => Number.isInteger(n))
    const hasDecimal = sample.some(v => /[.,]\d{1,}/.test(toLatinDigits(v)))
    // پیشنهاد واحد پول از سرستون — بخش ۱۴
    const unit = detectUnitFromLabel(headerLabel)
    let type: FieldType = allInt && !hasDecimal ? 'integer' : 'decimal'
    let role: FieldRole = 'measure'
    if (idLike === 1) {
      // کدهایی با صفر ابتدایی باید شناسه/متن بمانند نه عدد — بخش ۸.۱
      type = 'identifier'; role = 'identifier'
    } else if (isCurrencyUnit(unit) || AMOUNT_KEYWORDS.some(k => header.includes(k))) {
      type = 'amount'
    } else if (header.includes('درصد') || header.includes('نرخ')) {
      type = 'percent'
    } else if (allInt && new Set(nums).size <= Math.max(6, nums.length * 0.05) && !AMOUNT_KEYWORDS.some(k => header.includes(k))) {
      type = 'category'; role = 'dimension' // کد دسته‌بندی عددی کم‌مقدار
    }
    const conf = numRatio === 1 ? 0.95 : 0.7
    return { detectedType: type, confidence: conf, roleSuggestion: role, unitSuggestion: type === 'amount' ? (unit ?? 'rial') : undefined, invalidIndices: invalid, distinctCount: new Set(sample).size, nullCount }
  }

  if (idLike === 1 || (ID_KEYWORDS.some(k => header.includes(k)) && new Set(sample).size / sample.length > 0.9)) {
    return { detectedType: 'identifier', confidence: 0.8, roleSuggestion: 'identifier', invalidIndices: [], distinctCount: new Set(sample).size, nullCount }
  }

  // متن / دسته‌بندی
  const distinct = new Set(sample).size
  const catRatio = distinct / sample.length
  const type: FieldType = catRatio <= 0.35 || NAME_KEYWORDS.some(k => header.includes(k)) ? (catRatio <= 0.35 ? 'category' : 'text') : 'text'
  return {
    detectedType: type, confidence: catRatio <= 0.35 ? 0.8 : 0.65,
    roleSuggestion: type === 'category' ? 'dimension' : 'attribute',
    invalidIndices: [], distinctCount: distinct, nullCount,
  }
}

// تشخیص نقش‌ها برای کل جدول — بخش ۱۱ (تفکیک ابعاد و سنجه‌ها)
export function suggestRoles(
  fields: { id: string; label: string; type: FieldType; distinctCount?: number }[]
): Record<string, FieldRole> {
  const out: Record<string, FieldRole> = {}
  for (const f of fields) {
    if (f.type === 'amount' || f.type === 'decimal' || f.type === 'integer' || f.type === 'percent') {
      out[f.id] = 'measure'
    } else if (f.type === 'identifier') {
      out[f.id] = 'identifier'
    } else {
      out[f.id] = 'dimension'
    }
  }
  // اطمینان از وجود حداقل یک سنجه؛ در نبود آن، ستون عددی پیشنهاد می‌شود
  if (!Object.values(out).includes('measure')) {
    const numeric = fields.find(f => ['integer', 'decimal'].includes(f.type))
    if (numeric) out[numeric.id] = 'measure'
  }
  return out
}

// آزمون یکتایی کلید — بخش ۱۷.۱
export function checkUniqueness(records: DataRow[], fieldIds: string[]): {
  total: number; distinct: number; duplicateGroups: { key: string; count: number }[]; unique: boolean
} {
  const counts = new Map<string, number>()
  for (const r of records) {
    const key = fieldIds.map(f => String(r[f] ?? '')).join('§')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const dupGroups: { key: string; count: number }[] = []
  for (const [key, count] of counts) {
    if (count > 1) dupGroups.push({ key: key.split('§').join(' | '), count })
  }
  return {
    total: records.length,
    distinct: counts.size,
    duplicateGroups: dupGroups.slice(0, 50),
    unique: dupGroups.length === 0,
  }
}
