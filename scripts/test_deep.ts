// آزمون موتور تحلیل عمیق + رندر گزارش جامع با فایل اکسل واقعی کاربر
import fs from 'fs'
import path from 'path'
import { buildDeepAnalysis } from '../src/lib/deep-analysis'
import { buildDeepReportHtml } from '../src/lib/deep-report'

const UPLOAD = '/home/z/my-project/upload'
const file = fs.readdirSync(UPLOAD).find(f => f.endsWith('.xlsx') && f.includes('1404'))

if (!file) {
  console.error('فایل اکسل یافت نشد')
  process.exit(1)
}

const buf = fs.readFileSync(path.join(UPLOAD, file))
const deep = buildDeepAnalysis(file.replace('.xlsx', ''), [{ name: file, buffer: buf }])

console.log('ok:', deep.ok, '| years:', deep.years.join(','), '| months:', deep.monthsWithData)
console.log('annual:', deep.annual.map(a => `${a.year}:${Math.round(a.revenue / 1e9)}B${a.partial ? '(ناقص)' : ''}${a.revenueGrowth !== null ? ` +${a.revenueGrowth.toFixed(1)}%` : ''}`).join('  '))
console.log('items:', deep.items.length, '| top:', deep.items[0]?.label, deep.items[0]?.share.toFixed(1) + '%')
console.log('finance:', deep.finance.map(f => `${f.year}: خدمات=${f.servicesTotal !== null ? (f.servicesTotal / 1e9).toFixed(0) + 'B' : '-'} مالیات=${f.vat !== null ? (f.vat / 1e9).toFixed(0) + 'B' : '-'} کل=${f.grandTotal !== null ? (f.grandTotal / 1e9).toFixed(0) + 'B' : '-'}`).join('  '))
console.log('integrity:', deep.integrity.map(i => `${i.year}:${i.diffPct.toFixed(3)}%`).join('  '))
console.log('matrices:', deep.matrices.map(m => `${m.kind}(${m.items.length}×${m.columns.length})`).join(', '))
console.log('insights:', deep.insights.length, '| swot:', deep.swot.s.length + deep.swot.w.length + deep.swot.o.length + deep.swot.t.length, '| recs:', deep.recommendations.length, '| kpis:', deep.suggestedKpis.length)

const html = buildDeepReportHtml(deep, {
  title: 'اطلاعات خدمات از ابتدای شرکت تا ۱۴۰۴ — گزارش تحلیلی جامع',
  datasetName: 'اطلاعات خدمات از ابتدای شرکت تا 1404 - 1403',
  project: 'گزارش عملکرد',
  rowCount: 20,
  columnCount: 31,
  dataVersion: 1,
  generatedAtFa: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date()),
  sourceFileName: file,
})

const out = '/home/z/my-project/download/deep-report-sample.html'
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, html)
console.log('\n✅ گزارش ذخیره شد:', out, `(${(html.length / 1024).toFixed(0)}KB)`)
