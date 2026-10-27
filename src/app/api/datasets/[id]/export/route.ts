// خروجی مستقیم گزارش — بخش ۲۳ سند
// منطق تولید با src/lib/exporters.ts مشترک است؛ همان موتورِ صف پردازش پس‌زمینه (۳۰.۲)
// فیلترهای اعمال‌شده، زمان تولید و نسخه داده در خروجی ثبت می‌شود (بخش ۲۳.۲)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { fail, parseJson, logAudit } from '@/lib/server'
import { runQuery } from '@/lib/query'
import { requirePerm, errorResponse, applyRowRules, RowRule } from '@/lib/auth'
import { FieldMeta, DataRow, QuerySpec } from '@/lib/types'
import { buildExportBuffer, filtersTextOf, EXPORT_FORMATS, ExportFormat } from '@/lib/exporters'

// برچسب فارسی عملیات خروجی برای ثبت رویداد (ردیابی — بخش ۴)
const EXPORT_ACTION: Record<ExportFormat, string> = {
  xlsx: 'خروجی Excel',
  csv: 'خروجی CSV',
  pptx: 'خروجی PowerPoint',
  pdf: 'خروجی PDF',
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const user = await requirePerm(req, 'export.run')
    const body = await req.json()
    const format = String(body.format ?? 'xlsx') as ExportFormat
    if (!EXPORT_FORMATS.includes(format)) return fail(`قالب نامعتبر است؛ قالب‌های مجاز: ${EXPORT_FORMATS.join('، ')}`, 400)
    const spec: QuerySpec = {
      dimensions: Array.isArray(body.dimensions) ? body.dimensions : [],
      measures: Array.isArray(body.measures) && body.measures.length > 0 ? body.measures : [{ agg: 'count' }],
      filters: body.filters ?? [],
      orderBy: body.orderBy,
      limit: body.limit,
    }

    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)
    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    // قواعد سطح سطر — بخش ۲۹ سند
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)

    const result = runQuery(records, fields, spec)

    // ماسک مقادیر حساس در ابعاد خروجی — بخش ۲۹ سند
    const sensitiveIds = fields.filter(f => f.sensitivity === 'confidential').map(f => f.id)

    // ساخت سطرهای خروجی با برچسب‌های نمایشی
    const fieldById = new Map(fields.map(f => [f.id, f]))
    const dimCols = spec.dimensions.map(d => fieldById.get(d)?.label ?? d)
    const measureCols = spec.measures.map(m => m.alias ?? '')
    const headers = [...dimCols, ...measureCols]

    const rows = result.rows.map(r => {
      const row: unknown[] = []
      for (const d of spec.dimensions) {
        let v = r[d]
        if (sensitiveIds.includes(d) && v !== null && v !== undefined && String(v) !== '') {
          v = String(v).slice(0, 2) + '•'.repeat(Math.max(3, Math.min(10, String(v).length - 2)))
        }
        row.push(v)
      }
      for (const m of spec.measures) {
        const alias = m.alias ?? ''
        row.push(r[alias])
      }
      return row
    })
    // سطر جمع کل — بخش ۲۳.۲: مجموع خروجی با گزارش منطبق باشد
    const totalRow = [...Array(spec.dimensions.length).fill('جمع کل'), ...spec.measures.map(m => result.totals[m.alias ?? ''] ?? null)]

    const built = await buildExportBuffer({
      format,
      title: body.title ? String(body.title) : `گزارش ${ds.name}`,
      datasetName: ds.name,
      dataVersion: ds.version,
      filtersJson: spec.filters ?? [],
      filtersText: filtersTextOf(spec.filters as { fieldId?: string; op?: string; value?: unknown; values?: unknown }[] | undefined, fieldById),
      headers,
      rows,
      totalRow,
      dimCount: spec.dimensions.length,
      chartType: body.chartType ? String(body.chartType) : undefined,
    })

    await logAudit(ds.projectId, EXPORT_ACTION[format] ?? `خروجی ${format.toUpperCase()}`, `${ds.name} — ${rows.length} سطر`, user.name)
    return new Response(new Uint8Array(built.buf), {
      headers: {
        'Content-Type': built.mime,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(built.fileName)}"`,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
