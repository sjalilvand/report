// مدیریت ارقام فارسی/عربی/لاتین — بخش ۱۰.۱ سند
// تبدیل ارقام فارسی، عربی و لاتین به یکدیگر

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const LATIN_DIGITS = '0123456789'

export function toLatinDigits(input: string): string {
  if (!input) return input
  let out = ''
  for (const ch of String(input)) {
    const pi = PERSIAN_DIGITS.indexOf(ch)
    if (pi >= 0) { out += LATIN_DIGITS[pi]; continue }
    const ai = ARABIC_DIGITS.indexOf(ch)
    if (ai >= 0) { out += LATIN_DIGITS[ai]; continue }
    out += ch
  }
  return out
}

export function toPersianDigits(input: string): string {
  if (input === null || input === undefined) return input
  let out = ''
  for (const ch of String(input)) {
    const li = LATIN_DIGITS.indexOf(ch)
    out += li >= 0 ? PERSIAN_DIGITS[li] : ch
  }
  return out
}

export function hasPersianOrArabicDigits(input: string): boolean {
  for (const ch of String(input)) {
    if (PERSIAN_DIGITS.includes(ch) || ARABIC_DIGITS.includes(ch)) return true
  }
  return false
}

// جداکننده هزارگان با پشتیبانی نمایش فارسی
export function groupThousands(s: string, separator = '،'): string {
  const parts = s.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator)
  return parts.join('.')
}

// تبدیل عدد به حروف فارسی — بخش ۱۴.۳ (تبدیل مبلغ به حروف فارسی)
const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const SCALES = ['', ' هزار', ' میلیون', ' میلیارد', ' هزار میلیارد', ' میلیون میلیارد']

function threeDigitToWords(n: number): string {
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h > 0) parts.push(HUNDREDS[h])
  if (rest >= 10 && rest < 20) {
    parts.push(TEENS[rest - 10])
  } else {
    const t = Math.floor(rest / 10)
    const o = rest % 10
    if (t > 0) parts.push(TENS[t])
    if (o > 0) parts.push(ONES[o])
  }
  return parts.join(' و ')
}

export function numberToPersianWords(input: number | string): string {
  let s = toLatinDigits(String(input)).replace(/[,\u060C]/g, '').trim()
  if (!s || !/^-?\d+$/.test(s)) return ''
  const neg = s.startsWith('-')
  s = s.replace('-', '')
  let n = BigInt(s)
  if (n === 0n) return 'صفر'
  const chunks: string[] = []
  let scaleIdx = 0
  const big1000 = 1000n
  while (n > 0n) {
    const chunk = Number(n % big1000)
    if (chunk > 0) {
      chunks.unshift(threeDigitToWords(chunk) + (SCALES[scaleIdx] ?? ''))
    }
    n = n / big1000
    scaleIdx++
  }
  return (neg ? 'منفی ' : '') + chunks.join(' و ')
}
