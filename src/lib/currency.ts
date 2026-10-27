// مدیریت مبلغ و واحد پول — بخش ۱۴ سند
// تفکیک سه ویژگی: واحد ورودی، واحد ذخیره‌سازی مبنا، واحد نمایش
// مبنای ذخیره‌سازی: ریال (factor = 1)

import { CurrencyUnit } from './types'
import { toLatinDigits, toPersianDigits, groupThousands } from './digits'

// جدول ضرایب تبدیل با مبنای ریال — بخش ۱۴.۲ سند
export const CURRENCY_UNITS: CurrencyUnit[] = [
  { code: 'rial', label: 'ریال', factor: 1 },
  { code: 'toman', label: 'تومان', factor: 10 },
  { code: 'k_rial', label: 'هزار ریال', factor: 1_000 },
  { code: 'm_rial', label: 'میلیون ریال', factor: 1_000_000 },
  { code: 'b_rial', label: 'میلیارد ریال', factor: 1_000_000_000 },
  { code: 'k_toman', label: 'هزار تومان', factor: 10_000 },
  { code: 'm_toman', label: 'میلیون تومان', factor: 10_000_000 },
  { code: 'b_toman', label: 'میلیارد تومان', factor: 10_000_000_000 },
  { code: 'hemt', label: 'همت (هزار میلیارد تومان)', factor: 10_000_000_000_000 },
]

export function getUnit(code?: string): CurrencyUnit {
  return CURRENCY_UNITS.find(u => u.code === code) ?? CURRENCY_UNITS[0]
}

// تشخیص واحد از برچسب ستون — مثال: «مبلغ (میلیون ریال)»
export function detectUnitFromLabel(label: string): string | undefined {
  const t = toLatinDigits(String(label)).replace(/[_\-\s]/g, '')
  const norms: [RegExp, string][] = [
    [/همت|هزارمیلیاردتومان/, 'hemt'],
    [/میلیاردتومان/, 'b_toman'],
    [/میلیونتومان/, 'm_toman'],
    [/هزارتومان/, 'k_toman'],
    [/تومان/, 'toman'],
    [/میلیاردریال/, 'b_rial'],
    [/میلیونریال/, 'm_rial'],
    [/هزارریال/, 'k_rial'],
    [/ریال/, 'rial'],
  ]
  for (const [re, code] of norms) {
    if (re.test(t)) return code
  }
  return undefined
}

// تبدیل مقدار از واحد ورودی به مبنای ریال
export function toBaseRial(value: number, fromUnitCode: string): number {
  const u = getUnit(fromUnitCode)
  return value * u.factor
}

// تبدیل از مبنای ریال به واحد نمایش
export function fromBaseRial(baseValue: number, toUnitCode: string): number {
  const u = getUnit(toUnitCode)
  return baseValue / u.factor
}

// انتخاب خودکار واحد نمایش مناسب — بخش ۱۴.۳
export function autoDisplayUnit(baseValue: number): string {
  const abs = Math.abs(baseValue)
  if (abs >= 10_000_000_000_000) return 'hemt'
  if (abs >= 1_000_000_000_000) return 'b_toman'
  if (abs >= 1_000_000_000) return 'b_rial'
  if (abs >= 10_000_000) return 'm_toman'
  if (abs >= 1_000_000) return 'm_rial'
  if (abs >= 10_000) return 'k_toman'
  if (abs >= 1_000) return 'k_rial'
  return 'toman'
}

export function isCurrencyUnit(code?: string): boolean {
  return CURRENCY_UNITS.some(u => u.code === code)
}

// قالب‌بندی نمایش مبلغ — بخش ۱۴.۳
export interface AmountFormatOptions {
  displayUnit?: string        // واحد نمایش؛ در صورت ندهی، خودکار انتخاب می‌شود
  decimals?: number           // تعداد اعشار (پیش‌فرض 0؛ برای همت ۲)
  separator?: string          // جداکننده هزارگان
  negativeMode?: 'sign' | 'paren' // نمایش منفی با علامت یا پرانتز
  persianDigits?: boolean     // نمایش با ارقام فارسی
  autoUnitLabel?: boolean     // افزودن برچسب واحد به خروجی
}

export function formatAmount(
  baseValue: number | null | undefined,
  opts: AmountFormatOptions = {}
): string {
  if (baseValue === null || baseValue === undefined || Number.isNaN(baseValue)) return '—'
  const unitCode = opts.displayUnit || autoDisplayUnit(baseValue)
  const val = fromBaseRial(baseValue, unitCode)
  // گردکردن نمایشی مقدار ذخیره‌شده را تغییر نمی‌دهد — بخش ۱۴.۴
  const decimals = opts.decimals ?? (Number.isInteger(val) ? 0 : Math.abs(val) < 1 ? 3 : 2)
  const neg = val < 0
  const absVal = Math.abs(val)
  let s = absVal.toFixed(decimals)
  if (decimals > 0) s = s.replace(/\.?0+$/, '') // حذف صفرهای انتهایی نمایشی (مقدار ذخیره‌شده تغییر نمی‌کند)
  s = groupThousands(s, opts.separator ?? '،')
  if (opts.persianDigits) {
    s = toPersianDigits(s)
  }
  if (neg) {
    s = opts.negativeMode === 'paren' ? `(${s})` : `−${s}`
  }
  if (opts.autoUnitLabel) {
    s += ' ' + getUnit(unitCode).label.replace(' (هزار میلیارد تومان)', '')
  }
  return s
}

// قالب‌بندی عدد ساده (غیر پولی)
export function formatNumber(v: number | null | undefined, persianDigits = false, decimals = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  let s = Math.abs(v).toFixed(decimals)
  if (decimals > 0) s = s.replace(/\.?0+$/, '')
  s = groupThousands(s)
  if (v < 0) s = '−' + s
  return persianDigits ? toPersianDigits(s) : s
}

// جمع مبلغ‌های دارای واحد نامشخص ممنوع است — بخش ۱۴.۳
// این تابع پیش از تجمیع کنترل می‌کند که همه مقادیر واحد مشخص داشته باشند
export function safeSumAmounts(values: { value: number; unit?: string }[]): { sum: number | null; warning?: string } {
  if (values.length === 0) return { sum: 0 }
  const noUnit = values.filter(v => !v.unit).length
  if (noUnit > 0 && values.some(v => v.unit)) {
    return { sum: null, warning: `${noUnit} رکورد فاقد واحد پول مشخص است؛ تجمیع مبلغ‌های دارای واحد نامشخص مجاز نیست (بخش ۱۴.۳ سند).` }
  }
  return { sum: values.reduce((a, v) => a + toBaseRial(v.value, v.unit ?? 'rial'), 0) }
}
