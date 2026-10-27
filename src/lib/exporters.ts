// تولید خروجی گزارش — بخش ۲۳ سند
// منطق مشترک خروجی مستقیم و صف پردازش پس‌زمینه (۳۰.۲): Excel، CSV، PowerPoint، PDF
// فیلترها، نسخه داده و زمان تولید در خروجی ثبت می‌شود (بخش ۲۳.۲)

import * as XLSX from 'xlsx'
import { buildPptx } from './exportppt'
import { buildPdf } from './exportpdf'

export const EXPORT_FORMATS = ['xlsx', 'csv', 'pptx', 'pdf'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

export const EXPORT_MIME: Record<ExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
}

const OP_LABELS: Record<string, string> = { eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', contains: 'شامل', notnull: 'خالی نیست', isnull: 'خالی' }

export function filtersTextOf(
  filters: { fieldId?: string; op?: string; value?: unknown; values?: unknown }[] | undefined,
  fieldById: Map<string, { label?: string }>
): string {
  const list = filters ?? []
  if (list.length === 0) return '—'
  return list
    .map(f => {
      const label = fieldById.get(f.fieldId ?? '')?.label ?? f.fieldId
      const val = Array.isArray(f.values) ? (f.values as unknown[]).map(String).join('، ') : String(f.value ?? '')
      return `${label} ${OP_LABELS[f.op ?? ''] ?? f.op ?? ''} ${val}`
    })
    .join('، ')
}

export interface ExportBuildInput {
  format: ExportFormat
  title: string
  datasetName: string
  dataVersion: number
  filtersJson?: unknown
  filtersText: string
  headers: string[]
  rows: unknown[][]
  totalRow: unknown[]
  dimCount: number
  chartType?: string
}

export interface ExportBuildOutput {
  buf: Buffer
  mime: string
  ext: ExportFormat
  fileName: string
}

/** ساخت محتوای خروجی — نقطه مشترک خروجی مستقیم و صف پردازش پس‌زمینه */
export async function buildExportBuffer(input: ExportBuildInput): Promise<ExportBuildOutput> {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_')
  const safeName = (input.datasetName || 'report').replace(/[^\w\u0600-\u06FF-]+/g, '_')
  const { format, headers, rows, totalRow, dimCount } = input

  if (format === 'csv') {
    // CSV با جداکننده و کدگذاری متداول — بخش ۲۳.۱
    const aoa = [headers, ...rows, totalRow]
    const csv = aoa
      .map(row =>
        row
          .map(v => {
            const s = v === null || v === undefined ? '' : String(v)
            return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(';')
      )
      .join('\r\n')
    const withMeta =
      `# گزارش: ${input.datasetName} | نسخه داده: ${input.dataVersion} | زمان تولید: ${stamp}\r\n` + csv
    const buf = Buffer.from('\uFEFF' + withMeta, 'utf8')
    return { buf, mime: EXPORT_MIME.csv, ext: 'csv', fileName: `report_${safeName}_${stamp}.csv` }
  }

  if (format === 'pptx') {
    // PowerPoint — ارائه مدیریتی — بخش ۲۳.۱
    const faTime = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())
    const buf = await buildPptx({
      title: input.title,
      datasetName: input.datasetName,
      dataVersion: input.dataVersion,
      generatedAt: faTime,
      filtersText: input.filtersText,
      headers,
      rows,
      totalRow,
      dimCount,
      chartType: input.chartType,
    })
    return { buf, mime: EXPORT_MIME.pptx, ext: 'pptx', fileName: `report_${safeName}_${stamp}.pptx` }
  }

  if (format === 'pdf') {
    // PDF — فونت جاسازی‌شده، فارسی صحیح، صفحه‌بندی — بخش ۲۳.۱
    const faTime = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())
    const buf = await buildPdf({
      title: input.title,
      datasetName: input.datasetName,
      dataVersion: input.dataVersion,
      generatedAt: faTime,
      filtersText: input.filtersText,
      headers,
      rows,
      totalRow,
      dimCount,
    })
    return { buf, mime: EXPORT_MIME.pdf, ext: 'pdf', fileName: `report_${safeName}_${stamp}.pdf` }
  }

  // Excel پیش‌فرض — نوع عددی مناسب (معیار پذیرش ۳۳.۱۲)
  const aoa = [headers, ...rows, totalRow]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  for (let R = 1; R < aoa.length; R++) {
    for (let C = dimCount; C < aoa[R].length; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })]
      if (cell && typeof cell.v === 'number') cell.t = 'n'
    }
  }
  ws['!cols'] = headers.map(h => ({ wch: Math.max(12, Math.min(40, h.length * 1.6)) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'گزارش')
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['مشخصه', 'مقدار'],
      ['گزارش', input.datasetName],
      ['نسخه داده', input.dataVersion],
      ['زمان تولید', stamp],
      ['فیلترهای اعمال‌شده', JSON.stringify(input.filtersJson ?? [])],
      ['فیلترها (متن)', input.filtersText],
    ]),
    'شناسنامه'
  )
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return { buf, mime: EXPORT_MIME.xlsx, ext: 'xlsx', fileName: `report_${safeName}_${stamp}.xlsx` }
}
