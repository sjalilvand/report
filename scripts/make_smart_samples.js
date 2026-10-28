// ساخت فایل‌های نمونه قالب‌های هوشمند — فیش حقوقی، صورت مالی، سود محصولات
// اجرا: node scripts/make_smart_samples.js
// خروجی در public/samples — همین فایل‌ها از صفحه بارگذاری قابل دریافت‌اند

const path = require('path')
const XLSX = require(path.join(__dirname, '..', 'node_modules', 'xlsx'))
const { mkdirSync, writeFileSync } = require('fs')

const OUT = path.join(__dirname, '..', 'public', 'samples')
mkdirSync(OUT, { recursive: true })

const fa = n => n.toLocaleString('fa-IR')

// ─────────── ۱ و ۲: فیش حقوقی دو ماه (برای آزمون تجمیع) ───────────
const employees = [
  ['علی محمدی', 'P1001', 'مالی'],
  ['زهرا کریمی', 'P1002', 'منابع انسانی'],
  ['حسین رضایی', 'P1003', 'فروش'],
  ['مریم حسینی', 'P1004', 'فروش'],
  ['رضا موسوی', 'P1005', 'تولید'],
  ['فاطمه نوری', 'P1006', 'تولید'],
  ['امیر جعفری', 'P1007', 'فناوری اطلاعات'],
  ['سمیرا صادقی', 'P1008', 'فناوری اطلاعات'],
  ['مهدی عباسی', 'P1009', 'انبار'],
  ['نرگس اکبری', 'P1010', 'مالی'],
  ['سعید قاسمی', 'P1011', 'تولید'],
  ['لیلا شریفی', 'P1012', 'بازاریابی'],
]

function makePayslip(monthName, factor) {
  const rows = employees.map(([name, code, unit], i) => {
    const base = [280000000, 320000000, 250000000, 260000000, 220000000, 215000000, 380000000, 360000000, 190000000, 275000000, 210000000, 300000000][i] * factor
    const overtime = Math.round(base * (0.03 + ((i * 7) % 10) / 100))
    const benefits = 45000000 + ((i * 5) % 6) * 5000000
    const gross = base + overtime + benefits
    const insurance = Math.round(gross * 0.07)
    const tax = Math.round(gross * (0.06 + ((i % 4) * 0.01)))
    const deductions = insurance + tax + 12000000 // + سایر کسور
    const net = gross - deductions
    return {
      'کد پرسنلی': code,
      'نام و نام خانوادگی': name,
      'واحد سازمانی': unit,
      'ماه': monthName,
      'حقوق پایه': base,
      'اضافه‌کاری': overtime,
      'مزایا و کمک‌هزینه': benefits,
      'جمع دریافتی (ناخالص)': gross,
      'بیمه سهم کارمند': insurance,
      'مالیات حقوق': tax,
      'کسورات': deductions,
      'خالص پرداختی': net,
    }
  })
  return rows
}

const wsP1 = XLSX.utils.json_to_sheet(makePayslip('مهر ۱۴۰۳', 1))
const wb1 = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb1, wsP1, 'فیش حقوقی')
writeFileSync(path.join(OUT, 'نمونه-فیش-حقوقی-مهر.xlsx'), XLSX.write(wb1, { type: 'buffer', bookType: 'xlsx' }))

const wsP2 = XLSX.utils.json_to_sheet(makePayslip('آبان ۱۴۰۳', 1.04))
const wb2 = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb2, wsP2, 'فیش حقوقی')
writeFileSync(path.join(OUT, 'نمونه-فیش-حقوقی-آبان.xlsx'), XLSX.write(wb2, { type: 'buffer', bookType: 'xlsx' }))

// ─────────── ۳: صورت مالی — حالت طولی (شرح + سال + مبلغ) ───────────
const finData = [
  ['فروش خالص', 4200000000000, 5100000000000, 6350000000000],
  ['بهای تمام‌شده کالای فروش‌رفته', 2940000000000, 3519000000000, 4318000000000],
  ['سود ناخالص', 1260000000000, 1581000000000, 2032000000000],
  ['هزینه‌های فروش و اداری', 504000000000, 612000000000, 762000000000],
  ['سود عملیاتی', 756000000000, 969000000000, 1270000000000],
  ['هزینه‌های مالی', 126000000000, 153000000000, 190500000000],
  ['سود قبل از کسر مالیات', 630000000000, 816000000000, 1079500000000],
  ['مالیات بر درآمد', 126000000000, 163200000000, 215900000000],
  ['سود خالص', 504000000000, 652800000000, 863650000000],
]
const finRows = []
for (const [item, y1, y2, y3] of finData) {
  finRows.push({ 'شرح': item, 'سال': '۱۴۰۱', 'مبلغ (ریال)': y1 })
  finRows.push({ 'شرح': item, 'سال': '۱۴۰۲', 'مبلغ (ریال)': y2 })
  finRows.push({ 'شرح': item, 'سال': '۱۴۰۳', 'مبلغ (ریال)': y3 })
}
const wb3 = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb3, XLSX.utils.json_to_sheet(finRows), 'صورت سود و زیان')
writeFileSync(path.join(OUT, 'نمونه-صورت-مالی.xlsx'), XLSX.write(wb3, { type: 'buffer', bookType: 'xlsx' }))

// ─────────── ۴: سود محصولات (درآمد و هزینه در سطح قلم) ───────────
const products = [
  ['روغن موتور الویت ۴ لیتری', 'روغن و روان‌کننده'],
  ['روغن موتور الویت ۱ لیتری', 'روغن و روان‌کننده'],
  ['لاستیک رادیال ۱۸۵/۶۵', 'لاستیک'],
  ['لنت ترمز جلو پراید', 'قطعات یدکی'],
  ['فیلتر روغن پراید', 'قطعات یدکی'],
  ['باتری ۶۶ آمپر اتمی', 'برق و باتری'],
  ['ضدیخ اورال ۴ لیتری', 'روغن و روان‌کننده'],
  ['لاستیک رادیال ۲۰۵/۵۵', 'لاستیک'],
]
const months = ['مهر ۱۴۰۳', 'آبان ۱۴۰۳', 'آذر ۱۴۰۳']
const profitRows = []
products.forEach(([name, group], i) => {
  for (let m = 0; m < months.length; m++) {
    const qty = 120 + ((i * 37 + m * 13) % 90)
    const price = [9800000, 2600000, 49000000, 3100000, 740000, 21500000, 690000, 61000000][i]
    const rev = qty * price
    const cost = Math.round(rev * (0.62 + ((i + m) % 5) * 0.04))
    profitRows.push({
      'نام محصول': name,
      'گروه کالا': group,
      'ماه': months[m],
      'تعداد فروش': qty,
      'مبلغ فروش': rev,
      'بهای تمام‌شده': cost,
      'سود ناخالص': rev - cost,
    })
  }
})
const wb4 = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb4, XLSX.utils.json_to_sheet(profitRows), 'سود محصولات')
writeFileSync(path.join(OUT, 'نمونه-سود-محصولات.xlsx'), XLSX.write(wb4, { type: 'buffer', bookType: 'xlsx' }))

console.log('نمونه‌های قالب هوشمند ساخته شدند:')
for (const f of ['نمونه-فیش-حقوقی-مهر.xlsx', 'نمونه-فیش-حقوقی-آبان.xlsx', 'نمونه-صورت-مالی.xlsx', 'نمونه-سود-محصولات.xlsx']) {
  console.log('  -', f)
}
