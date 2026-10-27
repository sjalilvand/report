// ساخت فایل‌های به‌روزرسانی برای آزمون Upsert (بخش ۲۴) — همان ساختار نامنظم سناریو ۳۳.۱
// فایل ۱: مقادیر به‌روزشده + دو شعبه جدید (Upsert بر اساس «کد شعبه»)
// فایل ۲: همان فایل ۱ + ستون اضافه «توضیحات» برای آزمون کنترل تغییر ساختار (۲۴.۲)
const XLSX = require('xlsx')
const path = require('path')

function buildRows(extraCol) {
  const header = ['استان', 'شهرستان', 'کد شعبه', 'تاریخ تراکنش', 'مبلغ (میلیون ریال)', 'تعداد تراکنش']
  if (extraCol) header.push('توضیحات')
  const rows = [
    ['گزارش عملکرد فروش ماهانه', null, null, null, null, null, ...(extraCol ? [null] : [])],
    ['واحد: میلیون ریال | تاریخ: ۱۴۰۲/۰۵/۰۱ تا ۱۴۰۲/۰۷/۳۰', null, null, null, null, null, ...(extraCol ? [null] : [])],
    [null, null, null, null, null, null, ...(extraCol ? [null] : [])],
    header,
    // مقادیر به‌روزشده (مبلغ +۱۰) — کلید: کد شعبه
    ['استان تهران', 'تهران', '0101', '۱۴۰۲/۰۵/۰۳', '۲۶۰', '۱۲۲', ...(extraCol ? ['دوره جدید'] : [])],
    ['استان تهران', 'تهران', '0101', '۱۴۰۲/۰۵/۱۵', '۳۹۰', '۹۶', ...(extraCol ? [null] : [])],
    ['تهران ', 'تهران', '0102', '1402/05/20', '۱۳۰٫۵', '۶۲', ...(extraCol ? [null] : [])],
    ['استان اصفهان', 'اصفهان', '0201', '۱۴۰۲/۰۶/۰۲', '۲۲۵', '۸۵', ...(extraCol ? [null] : [])],
    ['فارس', 'شیراز', '0301', '۱۴۰۲/۰۶/۱۸', '۱۹۹', '۸۰', ...(extraCol ? [null] : [])],
    ['استان خراسان رضوی', 'مشهد', '0401', '۱۴۰۲/۰۷/۱۲', '۳۰۵', '۱۰۸', ...(extraCol ? [null] : [])],
    [null, null, null, null, null, null, ...(extraCol ? [null] : [])], // سطر خالی میانی
    // شعبه‌های جدید — درج در Upsert (در دامنه سطرهای مجموعه‌داده: اندیس ۱۱ و ۱۲)
    ['استان گیلان', 'رشت', '0501', '۱۴۰۲/۰۷/۲۰', '۱۵۰', '۵۵', ...(extraCol ? ['شعبه جدید'] : [])],
    ['استان تهران', 'کرج', '0502', '۱۴۰۲/۰۷/۲۸', '۲۱۰', '۷۰', ...(extraCol ? ['شعبه جدید'] : [])],
    ['جمع کل', null, null, null, '۲,۲۸۹٫۵', '۸۲۳', ...(extraCol ? [null] : [])],
  ]
  return rows
}

function makeBook(fileName, extraCol, sheetName) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(buildRows(extraCol))
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: extraCol ? 6 : 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: extraCol ? 6 : 5 } },
  ]
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const out = path.join('/home/z/my-project/upload', fileName)
  XLSX.writeFile(wb, out)
  console.log('ساخته شد:', out)
}

makeBook('فروش-به‌روزرسانی.xlsx', false, 'فروش')
makeBook('فروش-ساختار-تغییر.xlsx', true, 'فروش')
