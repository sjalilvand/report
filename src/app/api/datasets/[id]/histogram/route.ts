// API هیستوگرام — بخش ۱۹.۲ سند (نمودار تخصصی)
// توزیع فراوانی یک سنجه عددی در بازه‌های هم‌عرض با اعمال فیلترها و دسترسی سطری (بخش ۲۹)

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { computeHistogram } from '@/lib/stats'
import { requireUser, errorResponse, applyRowRules, RowRule } from '@/lib/auth'
import { FieldMeta, DataRow, QueryFilter } from '@/lib/types'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const user = await requireUser(req)
    const body = await req.json()
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = applyRowRules(parseJson<DataRow[]>(ds.records, []), user.rowRules as RowRule[], ds.id)

    const fieldId = String(body.fieldId ?? '')
    const f = fields.find(x => x.id === fieldId)
    if (!f) return fail('ستون موردنظر در مجموعه‌داده یافت نشد.', 422)
    if (!['amount', 'decimal', 'integer', 'percent'].includes(f.type)) {
      return fail('هیستوگرام برای ستون عددی است؛ ابتدا نوع ستون را در برگه ستون‌ها اصلاح کنید (بخش ۸ سند).', 422)
    }

    const filters: QueryFilter[] = Array.isArray(body.filters) ? body.filters : []
    const binCount = Number.isFinite(Number(body.binCount)) ? Number(body.binCount) : undefined

    const result = computeHistogram(records, fields, fieldId, binCount, filters)
    return ok({ fieldId, fieldLabel: f.label, unit: f.unit ?? null, ...result })
  } catch (e) {
    return errorResponse(e)
  }
}
