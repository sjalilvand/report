// موتور داده مکانی ایران — بخش ۱۹.۲ سند: «نقشه جغرافیایی، در صورت وجود داده مکانی معتبر»
// نرمال‌سازی نام استان/شهر، جدول مرجع مختصات مراکز استان‌ها و تشخیص خودکار ستون مکانی
// این جدول محلی است و به سرویس بیرونی وابسته نیست (بخش ۲۵: پاسخ قابل ردیابی)

import { DataRow, FieldMeta } from './types'
import { num } from './query'
import { toLatinDigits } from './digits'

export interface GeoPlace {
  name: string          // نام رسمی استان
  lat: number
  lng: number
}

// مراکز استان‌های ایران — مختصات تقریبی مرکز (برای نمایش حبابی کافی است)
export const IRAN_PROVINCES: GeoPlace[] = [
  { name: 'تهران', lat: 35.69, lng: 51.39 },
  { name: 'البرز', lat: 35.99, lng: 50.93 },
  { name: 'قم', lat: 34.64, lng: 50.88 },
  { name: 'مرکزی', lat: 34.99, lng: 48.35 },
  { name: 'قزوین', lat: 36.27, lng: 50.00 },
  { name: 'زنجان', lat: 36.67, lng: 48.05 },
  { name: 'گیلان', lat: 37.28, lng: 49.58 },
  { name: 'مازندران', lat: 36.56, lng: 53.06 },
  { name: 'گلستان', lat: 36.84, lng: 54.44 },
  { name: 'اردبیل', lat: 38.25, lng: 48.29 },
  { name: 'آذربایجان شرقی', lat: 38.08, lng: 46.29 },
  { name: 'آذربایجان غربی', lat: 37.55, lng: 45.00 },
  { name: 'کردستان', lat: 35.31, lng: 46.99 },
  { name: 'کرمانشاه', lat: 34.31, lng: 47.07 },
  { name: 'همدان', lat: 34.80, lng: 48.51 },
  { name: 'لرستان', lat: 33.49, lng: 48.35 },
  { name: 'ایلام', lat: 33.64, lng: 46.42 },
  { name: 'خوزستان', lat: 31.32, lng: 48.67 },
  { name: 'چارمحال و بختیاری', lat: 32.33, lng: 50.86 },
  { name: 'کهگیلویه و بویراحمد', lat: 30.67, lng: 51.61 },
  { name: 'بوشهر', lat: 28.92, lng: 50.84 },
  { name: 'فارس', lat: 29.59, lng: 52.58 },
  { name: 'هرمزگان', lat: 27.19, lng: 56.28 },
  { name: 'اصفهان', lat: 32.65, lng: 51.67 },
  { name: 'یزد', lat: 31.90, lng: 54.37 },
  { name: 'کرمان', lat: 30.29, lng: 57.08 },
  { name: 'سمنان', lat: 35.23, lng: 53.92 },
  { name: 'خراسان شمالی', lat: 37.47, lng: 57.10 },
  { name: 'خراسان رضوی', lat: 36.30, lng: 59.60 },
  { name: 'خراسان جنوبی', lat: 32.86, lng: 59.22 },
  { name: 'سیستان و بلوچستان', lat: 29.50, lng: 60.86 },
]

// نام‌های جایگزین و شهرهای بزرگ → استان (برای پوشش داده‌های نامنظم واقعی)
const ALIASES: Record<string, string> = {
  'تهران بزرگ': 'تهران',
  'کرج': 'البرز',
  'خراسان': 'خراسان رضوی',
  'خراسان بزرگ': 'خراسان رضوی',
  'مشهد': 'خراسان رضوی',
  'بجنورد': 'خراسان شمالی',
  'بیرجند': 'خراسان جنوبی',
  'سیستان': 'سیستان و بلوچستان',
  'بلوچستان': 'سیستان و بلوچستان',
  'زاهدان': 'سیستان و بلوچستان',
  'سیستانوبلوچستان': 'سیستان و بلوچستان',
  'سیستان و بلوچistan': 'سیستان و بلوچستان',
  'بویراحمد': 'کهگیلویه و بویراحمد',
  'کهگیلویه': 'کهگیلویه و بویراحمد',
  'یاسوج': 'کهگیلویه و بویراحمد',
  'چهارمحال': 'چارمحال و بختیاری',
  'چارمحال بختیاری': 'چارمحال و بختیاری',
  'شهرکرد': 'چارمحال و بختیاری',
  'آذربایجان شرقی': 'آذربایجان شرقی',
  'آذربایجان غربی': 'آذربایجان غربی',
  'تبریز': 'آذربایجان شرقی',
  'ارومیه': 'آذربایجان غربی',
  'اصفهان': 'اصفهان',
  'شیراز': 'فارس',
  'اهواز': 'خوزستان',
  'رشت': 'گیلان',
  'ساری': 'مازندران',
  'گرگان': 'گلستان',
  'بندرعباس': 'هرمزگان',
  'کرمان': 'کرمان',
  'یزد': 'یزد',
  'سمنان': 'سمنان',
  'قم': 'قم',
  'اراک': 'مرکزی',
  'قزوین': 'قزوین',
  'زنجان': 'زنجان',
  'سنندج': 'کردستان',
  'کرمانشاه': 'کرمانشاه',
  'کرمانشآن': 'کرمانشاه',
  'همدان': 'همدان',
  'خرم‌آباد': 'لرستان',
  'خرم آباد': 'لرستان',
  'ایلام': 'ایلام',
  'بوشهر': 'بوشهر',
  'اردبیل': 'اردبیل',
}

// نرمال‌سازی متن فارسی: ی/ک عربی → فارسی، حذف «استان»، فاصله‌ها و نیم‌فاصله
export function normalizeGeoName(raw: string): string {
  let s = String(raw ?? '').trim()
  // ارقام و حروف عربی → فارسی
  s = s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ۀ/g, 'ه').replace(/ة/g, 'ه')
  s = s.replace(/\u200c/g, ' ') // نیم‌فاصله → فاصله
  s = s.replace(/[\u064B-\u0652]/g, '') // اعراب
  s = s.replace(/^استان\s+/, '').replace(/\s+استان$/, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

const PROVINCE_INDEX: Map<string, GeoPlace> = (() => {
  const m = new Map<string, GeoPlace>()
  for (const p of IRAN_PROVINCES) {
    m.set(normalizeGeoName(p.name), p)
    // نسخه بدون فاصله برای مقایسه مقاوم‌تر
    m.set(normalizeGeoName(p.name).replace(/ /g, ''), p)
  }
  for (const [alias, prov] of Object.entries(ALIASES)) {
    const target = m.get(normalizeGeoName(prov))
    if (target) {
      m.set(normalizeGeoName(alias), target)
      m.set(normalizeGeoName(alias).replace(/ /g, ''), target)
    }
  }
  return m
})()

// تبدیل یک مقدار به مکان — خروجی null یعنی تطابق نیافت (به‌صورت شفاف گزارش می‌شود)
export function resolveGeoName(raw: unknown): GeoPlace | null {
  if (raw === null || raw === undefined) return null
  const s = normalizeGeoName(String(raw))
  if (!s) return null
  const direct = PROVINCE_INDEX.get(s) ?? PROVINCE_INDEX.get(s.replace(/ /g, ''))
  if (direct) return direct
  // تطابق بخشی: مقدار شامل نام یک استان (مثل «استان خراسان رضوی - مشهد»)
  for (const [key, place] of PROVINCE_INDEX) {
    if (key.length >= 4 && s.includes(key)) return place
  }
  return null
}

export { toLatinDigits }

export interface GeoColumnDetection {
  fieldId: string
  label: string
  kind: 'province' | 'latlng' | 'lat' | 'lng'
  matchRatio: number     // نسبت مقادیری که به استان تبدیل می‌شوند
  latFieldId?: string    // برای kind='latlng'
  lngFieldId?: string
}

// تشخیص خودکار ستون مکانی از میان فیلدها و نمونه داده — بخش ۱۹.۲
export function detectGeoColumn(fields: FieldMeta[], records: DataRow[]): GeoColumnDetection | null {
  const sample = records.slice(0, 500)
  if (sample.length === 0) return null

  // ۱) ستون‌های با نوع geo اعلام‌شده
  const declared = fields.find(f => f.type === 'geo')
  if (declared) {
    let hit = 0
    for (const r of sample) if (resolveGeoName(r[declared.id])) hit++
    return { fieldId: declared.id, label: declared.label, kind: 'province', matchRatio: hit / sample.length }
  }

  // ۲) جفت ستون عرض/طول جغرافیایی با نام شناخته‌شده
  const latField = fields.find(f => /عرض|lat/i.test(f.label + ' ' + f.sourceName) && sample.some(r => num(r[f.id]) !== null && num(r[f.id])! >= 20 && num(r[f.id])! <= 45))
  const lngField = fields.find(f => /طول|lng|lon/i.test(f.label + ' ' + f.sourceName) && sample.some(r => num(r[f.id]) !== null && num(r[f.id])! >= 40 && num(r[f.id])! <= 65))
  if (latField && lngField) {
    return { fieldId: latField.id, label: `${latField.label} + ${lngField.label}`, kind: 'latlng', matchRatio: 1, latFieldId: latField.id, lngFieldId: lngField.id }
  }

  // ۳) ستون دسته‌ای که مقادیرش با نام استان‌ها تطابق دارد (آستانه ۴۰٪)
  let best: { f: FieldMeta; ratio: number } | null = null
  for (const f of fields) {
    if (f.role === 'measure' && (f.type === 'integer' || f.type === 'decimal' || f.type === 'amount' || f.type === 'percent')) continue
    if (f.type === 'date' || f.type === 'time' || f.type === 'datetime') continue
    let hit = 0, filled = 0
    for (const r of sample) {
      const v = r[f.id]
      if (v === null || v === undefined || String(v).trim() === '') continue
      filled++
      if (resolveGeoName(v)) hit++
    }
    if (filled >= Math.min(5, sample.length)) {
      const ratio = hit / filled
      if (ratio >= 0.4 && (!best || ratio > best.ratio)) best = { f, ratio }
    }
  }
  if (best) return { fieldId: best.f.id, label: best.f.label, kind: 'province', matchRatio: best.ratio }
  return null
}

// مرز تقریبی ایران برای پس‌زمینه نقشه SVG — [طول، عرض] در جهت ساعت‌گرد
// تقریب قابل قبول برای نمایش حبابی؛ مرز دقیق سیاسی مدنظر نیست
export const IRAN_OUTLINE: [number, number][] = [
  [44.0, 39.4], [44.8, 39.7], [45.0, 39.2], [45.5, 38.9], [46.1, 38.9], [46.5, 38.4],
  [47.0, 38.9], [47.9, 39.4], [48.4, 38.6], [48.9, 38.4],
  [49.1, 37.6], [50.0, 37.3], [50.8, 36.8], [51.9, 36.6], [53.0, 36.8], [53.9, 37.3],
  [54.8, 37.5], [55.5, 37.9], [56.4, 38.1], [57.4, 38.0], [58.5, 37.7], [59.4, 37.5],
  [60.4, 36.6], [61.1, 36.6], [61.2, 35.6], [60.9, 34.1], [60.5, 33.5], [60.9, 32.6],
  [61.8, 31.4], [61.7, 30.1], [61.8, 29.8], [61.7, 28.7], [61.6, 27.5], [62.8, 27.2],
  [63.3, 27.1], [63.3, 26.7],
  [61.6, 25.2], [59.5, 25.5], [57.3, 25.8], [56.9, 27.0], [56.3, 26.9], [55.7, 26.9],
  [54.7, 26.5], [53.7, 26.7], [52.6, 27.4], [51.5, 27.9], [50.8, 28.9], [50.1, 29.9],
  [49.5, 30.2], [48.9, 30.3], [48.5, 29.9], [48.0, 30.0], [47.7, 30.5], [48.0, 30.9],
  [48.4, 31.5], [47.9, 31.8], [48.0, 32.5], [47.7, 33.4], [47.3, 34.3], [46.8, 34.9],
  [46.2, 35.4], [45.6, 35.9], [45.4, 36.6], [44.8, 37.1], [44.4, 37.9], [44.0, 38.4],
  [44.4, 38.9],
]

// نقشه حبابی — ورودی سطرهای تجمیعی و خروجی نقاط با مختصات (بخش ۱۹.۲)
export interface GeoPoint {
  name: string
  value: number
  lat: number
  lng: number
  province: string
  matched: boolean
}

export function buildGeoPoints(
  rows: { name: string; value: number }[],
  mode: 'province' | 'latlng',
  latFieldId?: string,
  lngFieldId?: string,
  rawRecords?: DataRow[],
): { points: GeoPoint[]; unmatched: string[] } {
  const points: GeoPoint[] = []
  const unmatched: string[] = []

  if (mode === 'latlng' && rawRecords && latFieldId && lngFieldId) {
    // داده نقطه‌ای با مختصات صریح — تجمیع روی مختصات یکسان انجام شده است
    for (const r of rawRecords.slice(0, 2000)) {
      const lat = num(r[latFieldId])
      const lng = num(r[lngFieldId])
      if (lat === null || lng === null) continue
      if (lat < 20 || lat > 45 || lng < 40 || lng > 65) continue // خارج از محدوده ایران
      points.push({ name: `${lat.toFixed(2)}، ${lng.toFixed(2)}`, value: 1, lat, lng, province: '', matched: true })
    }
    return { points, unmatched }
  }

  for (const row of rows) {
    const place = resolveGeoName(row.name)
    if (place) {
      points.push({ name: String(row.name), value: row.value, lat: place.lat, lng: place.lng, province: place.name, matched: true })
    } else {
      unmatched.push(String(row.name))
    }
  }
  return { points, unmatched }
}
