// مدیریت تاریخ، تقویم و دوره‌های زمانی — بخش ۱۵ سند
// پشتیبانی از تاریخ شمسی و میلادی، استانداردسازی و استخراج فیلدهای زمانی

import { toJalaali, toGregorian, isValidJalaaliDate, jalaaliMonthLength } from 'jalaali-js'
import { toLatinDigits } from './digits'

export interface ParsedDate {
  ok: boolean
  kind: 'jalali' | 'gregorian' | 'ambiguous' | 'invalid'
  jy?: number
  jm?: number
  jd?: number
  iso?: string // تاریخ میلادی ISO
  reason?: string
}

const FA_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
export const JALALI_SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'] // فصل — بخش ۱۵.۲
const JALALI_SEASON_MONTHS: Record<string, string[]> = {
  'بهار': ['فروردین', 'اردیبهشت', 'خرداد'],
  'تابستان': ['تیر', 'مرداد', 'شهریور'],
  'پاییز': ['مهر', 'آبان', 'آذر'],
  'زمستان': ['دی', 'بهمن', 'اسفند'],
}
const WEEKDAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']

// پارس تاریخ متداول شمسی/میلادی — بخش ۱۵.۱
// قالب‌های پشتیبانی‌شده: 1402/05/12 ، ۱۴۰۲-۰۵-۱۲ ، 2023-08-03 ، 12/08/1402 و مشابه
export function parseDateValue(raw: unknown, calendar: 'jalali' | 'gregorian' | 'auto' = 'auto'): ParsedDate {
  if (raw === null || raw === undefined || raw === '') return { ok: false, kind: 'invalid', reason: 'خالی' }

  // Date واقعی (از اکسل)
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const g = toJalaali(raw.getFullYear(), raw.getMonth() + 1, raw.getDate())
    return { ok: true, kind: 'gregorian', jy: g.jy, jm: g.jm, jd: g.jd, iso: raw.toISOString() }
  }
  // عدد سریالی اکسل — بخش ۱۵.۱ (تشخیص تاریخ‌های سریالی اکسل)
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
    const d = excelSerialToDate(raw)
    const g = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    return { ok: true, kind: 'gregorian', jy: g.jy, jm: g.jm, jd: g.jd, iso: d.toISOString().slice(0, 10) }
  }

  let s = toLatinDigits(String(raw)).trim().replace(/[.\-]/g, '/').replace(/\/+/g, '/')
  // قالب ISO میلادی
  const isoMatch = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})([T ].*)?$/)
  if (isoMatch) {
    const y = +isoMatch[1], m = +isoMatch[2], d = +isoMatch[3]
    if (calendar === 'jalali' || (calendar === 'auto' && y >= 1200 && y <= 1500)) {
      if (isValidJalaaliDate(y, m, d)) {
        const g = toGregorian(y, m, d)
        return { ok: true, kind: 'jalali', jy: y, jm: m, jd: d, iso: `${g.gy}-${pad(g.gm)}-${pad(g.gd)}` }
      }
      return { ok: false, kind: 'invalid', reason: 'تاریخ شمسی نامعتبر' }
    }
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2200) {
      const g = toJalaali(y, m, d)
      return { ok: true, kind: 'gregorian', jy: g.jy, jm: g.jm, jd: g.jd, iso: `${y}-${pad(m)}-${pad(d)}` }
    }
    return { ok: false, kind: 'invalid', reason: 'خارج از محدوده' }
  }
  return { ok: false, kind: 'invalid', reason: 'قالب تاریخ ناشناخته' }
}

function pad(n: number): string { return String(n).padStart(2, '0') }

export function excelSerialToDate(serial: number): Date {
  // مبنای سریال اکسل: 1899-12-30
  const ms = Math.round((serial - 25569) * 86400 * 1000)
  const d = new Date(ms)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// استخراج فیلدهای زمانی — بخش ۱۵.۲ سند
export function extractDateParts(raw: unknown): Record<string, unknown> | null {
  const p = parseDateValue(raw)
  if (!p.ok) return null
  const parts: Record<string, unknown> = {
    jy: p.jy, // سال
    jm: p.jm, // ماه (شمسی)
    monthName: FA_MONTHS[(p.jm ?? 1) - 1], // نام ماه
    jd: p.jd, // روز ماه
    season: JALALI_SEASONS[Math.floor(((p.jm ?? 1) - 1) / 3)], // فصل
    quarter: Math.floor(((p.jm ?? 1) - 1) / 3) + 1,
    halfYear: (p.jm ?? 1) <= 6 ? 'نیم‌سال اول' : 'نیم‌سال دوم', // نیم‌سال
    // ابتدا و انتهای ماه — بخش ۱۵.۲
    monthStart: `${p.jy}/${pad(p.jm!)}/01`,
    monthEnd: `${p.jy}/${pad(p.jm!)}/${pad(jalaaliMonthLength(p.jy!, p.jm!))}`,
  }
  // روز هفته
  if (p.iso) {
    const d = new Date(p.iso + 'T00:00:00Z')
    // شنبه = 6 در getUTCDay؛ تبدیل: شنبه اول هفته شمسی
    const wd = d.getUTCDay() // 0=Sunday ... 6=Saturday
    parts.weekday = WEEKDAYS_FA[(wd + 1) % 7]
    parts.weekOfYear = Math.ceil((dayOfYearJalali(p.jy!, p.jm!, p.jd!)) / 7)
    parts.dayOfYear = dayOfYearJalali(p.jy!, p.jm!, p.jd!)
    // دوره متناظر سال قبل — بخش ۱۵.۳
    parts.prevYearSame = `${p.jy! - 1}/${pad(p.jm!)}/${pad(p.jd!)}`
  }
  return parts
}

function dayOfYearJalali(jy: number, jm: number, jd: number): number {
  let n = jd
  for (let m = 1; m < jm; m++) n += jalaaliMonthLength(jy, m)
  return n
}

export { FA_MONTHS, JALALI_SEASONS, JALALI_SEASON_MONTHS, WEEKDAYS_FA }
