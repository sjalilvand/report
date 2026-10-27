// ساخت نمونه فایل‌های واقعی سازمانی (نامنظم) برای آزمون سامانه — بخش ۳۶ و ۳۵ سند
// چهار فایل مرتبط: تراکنش‌های فروش (دو دوره)، فهرست مشتریان، فهرست محصولات
// اجرا: bun scripts/make_samples.ts

import * as XLSX from 'xlsx'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const BASE = '/home/z/my-project'
const OUT_DIRS = [join(BASE, 'download', 'نمونه-فایل‌های-واقعی'), join(BASE, 'public', 'samples')]
for (const d of OUT_DIRS) mkdirSync(d, { recursive: true })

// داده‌های مرجع
const provinces = ['تهران', 'اصفهان', 'فارس', 'خراسان رضوی', 'آذربایجان شرقی', 'مازندران', 'البرز', 'خوزستان']
const customerGroups = ['عمده‌فروش', 'خرده‌فروش', 'دولتی', 'صادراتی']
const customers: [string, string, string, string, string][] = [
  ['C1001', 'بازرگانی آریا تجارت', 'تهران', 'عمده‌فروش', '10862139854'],
  ['C1002', 'فروشگاه‌های زنجیره‌ای مهر', 'اصفهان', 'خرده‌فروش', '13945206718'],
  ['C1003', 'پخش سراسری خاورمیانه', 'فارس', 'عمده‌فروش', '10892341765'],
  ['C1004', 'شرکت پخش البرز کالا', 'البرز', 'عمده‌فروش', '10102938475'],
  ['C1005', 'بازار ایرانیان', 'خراسان رضوی', 'خرده‌فروش', '10861239405'],
  ['C1006', 'اداره کل تدارکات دولتی', 'تهران', 'دولتی', '14003028471'],
  ['C1007', 'پخش جنوب پارس', 'خوزستان', 'عمده‌فروش', '10861109283'],
  ['C1008', 'تجارت بین‌الملل کیش', 'تهران', 'صادراتی', '10861402567'],
  ['C1009', 'هایپر ستاره فارس', 'فارس', 'خرده‌فروش', '10861503928'],
  ['C1010', 'پخش شمال مازند', 'مازندران', 'عمده‌فروش', '10861604837'],
]

const products: [string, string, string, string][] = [
  ['P201', 'روغن موتور الویت ۴ لیتری', 'روغن و روان‌کننده', 'عدد'],
  ['P202', 'روغن موتور الویت ۱ لیتری', 'روغن و روان‌کننده', 'عدد'],
  ['P203', 'لاستیک رادیال ۱۸۵/۶۵', 'لاستیک', 'حلقه'],
  ['P204', 'لنت ترمز جلو پراید', 'قطعات یدکی', 'ست'],
  ['P205', 'فیلتر روغن پراید', 'قطعات یدکی', 'عدد'],
  ['P206', 'باتری ۶۶ آمپر اتمی', 'برق و باتری', 'عدد'],
  ['P207', 'ضدیخ اورال ۴ لیتری', 'روغن و روان‌کننده', 'عدد'],
  ['P208', 'لاستیک رادیال ۲۰۵/۵۵', 'لاستیک', 'حلقه'],
]

const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// تولید تراکنش‌ها با تاریخ شمسی
function makeTransactions(seed: number, months: { year: number; month: number; label: string }[]) {
  const rows: (string | number)[][] = []
  let txId = seed
  for (const m of months) {
    const txCount = 18 + Math.floor(Math.random() * 8)
    for (let i = 0; i < txCount; i++) {
      txId++
      const cust = randomItem(customers)
      const prod = randomItem(products)
      const day = 1 + Math.floor(Math.random() * 29)
      const qty = 1 + Math.floor(Math.random() * 12)
      const unitPrice = [1_850_000, 620_000, 2_450_000, 890_000, 320_000, 4_980_000, 1_450_000, 3_150_000][products.findIndex(p => p[0] === prod[0])]
      rows.push([
        `TX-${txId}`,
        cust[0],
        prod[0],
        `${m.year}/${String(m.month).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
        qty,
        unitPrice * qty,
        randomItem(['نقدی', 'اعتباری', 'چک']),
      ])
    }
  }
  return rows
}

function writeIrregularWorkbook(path: string, title: string, headers: string[], rows: (string | number)[][]) {
  const aoa: (string | number)[][] = [
    [title],           // عنوان در سطر اول (ساختار نامنظم — بخش ۳.۲ سند)
    [],
    headers,           // سرستون در سطر سوم
    ...rows,
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  // ادغام سلول عنوان
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }]
  ws['!cols'] = headers.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'داده‌ها')
  // شیت راهنما
  const guide = XLSX.utils.aoa_to_sheet([
    ['راهنمای فایل نمونه'],
    [''],
    ['ساختار', 'عنوان در سطر ۱ (ادغام‌شده)، سرستون در سطر ۳، داده از سطر ۴'],
    ['واحد مبلغ', 'ریال (مبنای سامانه — بخش ۱۴ سند)'],
    ['قالب تاریخ', 'شمسی به‌صورت YYYY/MM/DD'],
    ['ملاحظه', 'این فایل نمونه است؛ فایل‌های واقعی سازمان را نیز برای آزمون بارگذاری کنید (بخش ۳۶ سند)'],
  ])
  XLSX.utils.book_append_sheet(wb, guide, 'راهنما')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  writeFileSync(path, buf)
  console.log('✓ نوشته شد:', path)
}

const txHeaders = ['کد تراکنش', 'کد مشتری', 'کد محصول', 'تاریخ', 'تعداد', 'مبلغ کل (ریال)', 'نحوه تسویه']
const custHeaders = ['کد مشتری', 'نام مشتری', 'استان', 'گروه مشتری', 'کد ملی']
const prodHeaders = ['کد محصول', 'نام محصول', 'دسته محصول', 'واحد شمارش']

const period1 = makeTransactions(5000, [
  { year: 1404, month: 7, label: 'مهر' },
  { year: 1404, month: 8, label: 'آبان' },
])
const period2 = makeTransactions(7000, [
  { year: 1404, month: 9, label: 'آذر' },
])

for (const dir of OUT_DIRS) {
  writeIrregularWorkbook(join(dir, '۱-تراکنش‌های-فروش-مهر-و-آبان.xlsx'),
    'گزارش تراکنش‌های فروش — دوره مهر و آبان ۱۴۰۴', txHeaders, period1)
  writeIrregularWorkbook(join(dir, '۲-تراکنش‌های-فروش-آذر.xlsx'),
    'گزارش تراکنش‌های فروش — دوره آذر ۱۴۰۴', txHeaders, period2)
  writeIrregularWorkbook(join(dir, '۳-فهرست-مشتریان.xlsx'),
    'فهرست مشتریان سازمان', custHeaders, customers.map(c => [c[0], c[1], c[2], c[3], c[4]]))
  writeIrregularWorkbook(join(dir, '۴-فهرست-محصولات.xlsx'),
    'فهرست کالا و محصولات', prodHeaders, products.map(p => [p[0], p[1], p[2], p[3]]))
}

// سناریوی آزمون اتصال — فایل راهنمای سناریو
const scenario = `سناریوی آزمون اتصال بصری جداول (بخش ۱۶ سند)
=================================================

۱) هر چهار فایل را در یک پروژه بارگذاری و چهار مجموعه‌داده بسازید.
۲) در برگه «روابط جداول»:
   - سامانه پیشنهاد «کد مشتری» بین تراکنش‌ها و مشتریان و «کد محصول» بین تراکنش‌ها و محصولات را می‌دهد.
   - رابطه تراکنش‌ها → مشتریان باید «چندبه‌یک» تشخیص داده شود (کلید مشتری در سمت مشتری یکتاست).
   - رابطه تراکنش‌ها(مهر/آبان) + تراکنش‌ها(آذر) با Append برای افزودن سطرهای هم‌ساختار.
۳) پرس‌وجوی اتصالی: جدول پایه «تراکنش‌های مهر و آبان» + مسیر روابط مشتریان و محصولات؛
   بُعد «استان» و سنجه «جمع مبلغ کل» → سهم هر استان.
۴) آزمون سد امن ۱۶.۴: اگر مسیر معکوس (پایه = مشتریان، سنجه از سمت تراکنش‌ها با کلید تکراری) ساخته شود،
   سامانه باید اتصال را مسدود یا «تجمیع پیش از اتصال» را الزام کند تا مبالغ چندبرابر نشوند.
۵) فایل ۲ و ۱ هم‌ساختارند و برای آزمون Append/Union (بخش ۱۶.۲) طراحی شده‌اند.
`
for (const dir of OUT_DIRS) {
  writeFileSync(join(dir, 'سناریوی-آزمون.txt'), scenario, 'utf8')
}

console.log(`\n۴ فایل نمونه در دو مسیر ساخته شد:\n  - download/نمونه-فایل‌های-واقعی/\n  - public/samples/ (قابل دانلود از رابط کاربری)`)
