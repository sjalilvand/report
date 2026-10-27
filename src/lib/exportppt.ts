// خروجی PowerPoint — بخش ۲۳.۱ سند («قابلیت توسعه برای ارائه مدیریتی»)
// اسلاید عنوان + اسلاید نمودار بومی + اسلایدهای جدول با سطر جمع کل
// متن‌ها راست‌به‌چپ با rtlMode — شکل‌دهی حروف فارسی را خود PowerPoint انجام می‌دهد

import PptxGenJS from 'pptxgenjs'
import { toPersianDigits } from './digits'

export interface PptxInput {
  title: string
  datasetName: string
  dataVersion: number
  project?: string
  generatedAt: string          // متن فارسی زمان تولید
  filtersText: string          // فیلترهای اعمال‌شده — بخش ۲۳.۲
  headers: string[]            // [...برچسب ابعاد، ...برچسب سنجه‌ها]
  rows: unknown[][]            // هم‌طول headers
  totalRow: unknown[]          // هم‌طول headers
  dimCount: number             // تعداد ستون‌های بُعد (مابقی سنجه‌اند)
  chartType?: string           // bar | line | pie — نوع نمودار انتخابی در گزارش‌ساز
}

const BRAND = '1E293B'   // سرمه‌ای
const ACCENT = '2563EB'  // آبی
const LIGHT = 'EFF6FF'

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number' && Number.isFinite(v)) return new Intl.NumberFormat('fa-IR').format(v)
  return String(v)
}

export async function buildPptx(input: PptxInput): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.rtlMode = true
  pptx.layout = 'LAYOUT_16x9'

  // ─── اسلاید ۱: عنوان ───
  const s1 = pptx.addSlide()
  s1.background = { color: BRAND }
  s1.addText(input.title, {
    x: 0.6, y: 1.6, w: 8.8, h: 1.2, align: 'right', rtlMode: true,
    fontSize: 32, bold: true, color: 'FFFFFF', fontFace: 'Vazirmatn',
  })
  const meta: { text: string; options?: Record<string, unknown> }[] = [
    { text: `مجموعه‌داده: ${input.datasetName}`, options: { breakLine: true } },
    { text: `نسخه داده: ${toPersianDigits(String(input.dataVersion))}  |  زمان تولید: ${input.generatedAt}`, options: { breakLine: true } },
  ]
  if (input.project) meta.push({ text: `پروژه: ${input.project}`, options: { breakLine: true } })
  s1.addText(meta, {
    x: 0.6, y: 3.0, w: 8.8, h: 1.1, align: 'right', rtlMode: true,
    fontSize: 14, color: 'CBD5E1', fontFace: 'Vazirmatn', lineSpacingMultiple: 1.4,
  })
  if (input.filtersText && input.filtersText !== '—') {
    s1.addText(`فیلترهای اعمال‌شده: ${input.filtersText}`, {
      x: 0.6, y: 4.6, w: 8.8, h: 0.9, align: 'right', rtlMode: true,
      fontSize: 12, color: '94A3B8', fontFace: 'Vazirmatn', wrap: true,
    })
  }

  // ─── اسلاید ۲: نمودار بومی PowerPoint ───
  if (input.chartType && input.rows.length > 0 && input.headers.length >= 2) {
    const measureIdx = input.headers.length - 1 // آخرین ستون به‌عنوان سنجه نمودار
    const labels = input.rows.slice(0, 15).map(r => fmt(r[0]))
    const values = input.rows.slice(0, 15).map(r => {
      const v = Number(r[measureIdx])
      return Number.isFinite(v) ? v : 0
    })
    const s2 = pptx.addSlide()
    s2.addText(`${input.headers[measureIdx]} بر حسب ${input.headers[0]}`, {
      x: 0.5, y: 0.3, w: 9.0, h: 0.6, align: 'right', rtlMode: true,
      fontSize: 18, bold: true, color: BRAND, fontFace: 'Vazirmatn',
    })
    const type = input.chartType === 'line' ? pptx.ChartType.line : input.chartType === 'pie' ? pptx.ChartType.pie : pptx.ChartType.bar
    s2.addChart(type, [{ name: input.headers[measureIdx], labels, values }], {
      x: 0.5, y: 1.0, w: 9.0, h: 4.6,
      showValue: type !== pptx.ChartType.line,
      showLegend: type === pptx.ChartType.pie,
      legendPos: 'b',
      chartColors: [ACCENT, '7C3AED', '059669', 'D97706', 'DC2626', '0891B2', 'DB2777', '65A30D', '4F46E5', 'EA580C', '0D9488', 'B45309', '9333EA', '16A34A', 'E11D48'],
      catAxisLabelFontFace: 'Vazirmatn', valAxisLabelFontFace: 'Vazirmatn', dataLabelFontFace: 'Vazirmatn',
      dataLabelColor: BRAND, catAxisLabelColor: BRAND, valAxisLabelColor: BRAND,
    })
  }

  // ─── اسلایدهای جدول ───
  const headerCell = (text: string) => ({
    text,
    options: { bold: true, color: 'FFFFFF', fill: { color: BRAND }, align: 'center', valign: 'middle', fontFace: 'Vazirmatn', fontSize: 12, rtlMode: true },
  })
  const bodyCell = (v: unknown, isDim: boolean) => ({
    text: fmt(v),
    options: { align: isDim ? 'right' : 'center', valign: 'middle', fontFace: 'Vazirmatn', fontSize: 11, rtlMode: true, color: '1F2937' },
  })
  const totalCell = (v: unknown, isDim: boolean) => ({
    text: fmt(v),
    options: { bold: true, color: BRAND, fill: { color: LIGHT }, align: isDim ? 'right' : 'center', valign: 'middle', fontFace: 'Vazirmatn', fontSize: 11, rtlMode: true },
  })

  const colW = input.headers.map((_, i) => (i === 0 ? 3.2 : 9.4 / Math.max(1, input.headers.length - 1)))
  const PAGE = 14
  const pages = Math.max(1, Math.ceil(input.rows.length / PAGE))
  for (let p = 0; p < pages; p++) {
    const chunk = input.rows.slice(p * PAGE, (p + 1) * PAGE)
    if (chunk.length === 0 && pages > 1) continue
    const slide = pptx.addSlide()
    slide.addText(`${input.title} — جدول ${toPersianDigits(String(p + 1))} از ${toPersianDigits(String(pages))}`, {
      x: 0.5, y: 0.25, w: 9.0, h: 0.55, align: 'right', rtlMode: true, fontSize: 16, bold: true, color: BRAND, fontFace: 'Vazirmatn',
    })
    const tableRows: { text: string; options: Record<string, unknown> }[][] = [
      input.headers.map(h => headerCell(h)),
      ...chunk.map(r => r.map((v, i) => bodyCell(v, i < input.dimCount))),
    ]
    if (p === pages - 1) tableRows.push(input.totalRow.map((v, i) => totalCell(v, i < input.dimCount)))
    slide.addTable(tableRows, {
      x: 0.3, y: 0.95, w: 9.4,
      colW,
      border: { type: 'solid', color: 'CBD5E1', pt: 0.5 },
      rowH: 0.32,
      autoPage: false,
    })
    slide.addText(`نسخه داده: ${toPersianDigits(String(input.dataVersion))} — ${input.generatedAt}`, {
      x: 0.5, y: 5.15, w: 9.0, h: 0.35, align: 'left', rtlMode: true, fontSize: 9, color: '94A3B8', fontFace: 'Vazirmatn',
    })
  }

  const out = (await pptx.write({ outputType: 'nodebuffer' })) as unknown as Buffer
  return out
}
