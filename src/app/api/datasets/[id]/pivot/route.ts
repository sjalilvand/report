// API جدول محوری — بخش ۱۹.۲ سند
// سلسله‌مراتب سطرها، بعد ستون‌ها، جمع جزء/کل، سهم از کل و رتبه
// قواعد دسترسی سطح سطر و ماسک اطلاعات حساس مانند سایر مسیرها اعمال می‌شود (بخش ۲۹)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { buildPivot, PivotSpec } from '@/lib/pivot'
import { requireUser, errorResponse, applyRowRules, maskValue, RowRule } from '@/lib/auth'
import { FieldMeta, DataRow } from '@/lib/types'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const user = await requireUser(req)
    const body = await req.json()
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    // قواعد دسترسی سطح سطر — بخش ۲۹ سند
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)

    const spec: PivotSpec = {
      rowDims: Array.isArray(body.rowDims) ? body.rowDims.map(String) : [],
      colDim: body.colDim ? String(body.colDim) : undefined,
      measures: Array.isArray(body.measures) && body.measures.length > 0 ? body.measures : [{ agg: 'count' as const }],
      filters: Array.isArray(body.filters) ? body.filters : [],
      colLimit: Number(body.colLimit ?? 12),
      showRowTotals: body.showRowTotals !== false,
      showColTotals: body.showColTotals !== false,
      showShare: body.showShare === true,
      showRank: body.showRank === true,
      subtotals: body.subtotals !== false,
    }

    if (spec.rowDims.length === 0) return fail('حداقل یک بُعد سطر برای جدول محوری الزامی است (بخش ۱۹.۲ سند).')

    const result = buildPivot(records, fields, spec)

    // ماسک اطلاعات حساس روی برچسب ابعاد — تجمیع روی داده واقعی حفظ می‌شود (بخش ۲۹ سند)
    const sensitiveIds = fields.filter(f => f.sensitivity === 'confidential').map(f => f.id)
    let outRows = result.rows
    if (sensitiveIds.length > 0) {
      outRows = result.rows.map(r => {
        const row = { ...r, dimValues: r.dimValues.map(d => ({ ...d })) }
        for (const dv of row.dimValues) {
          if (sensitiveIds.includes(dv.fieldId) && dv.value !== null && String(dv.value) !== '') {
            dv.value = maskValue(dv.value)
          }
        }
        return row
      })
    }

    return ok({ ...result, rows: outRows })
  } catch (e) {
    return errorResponse(e)
  }
}
