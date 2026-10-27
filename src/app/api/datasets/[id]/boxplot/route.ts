// API نمودار جعبه‌ای — بخش ۱۹.۲ سند (نمودار تخصصی)
// چهارک‌ها، میانه، سبیل‌ها و نقاط دورافتاده به تفکیک بُعد اختیاری
// دسترسی سطری (۲۹) و ماسک ستون محرمانه روی نام گروه‌ها اعمال می‌شود

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { computeBoxPlot } from '@/lib/stats'
import { requireUser, errorResponse, applyRowRules, maskValue, RowRule } from '@/lib/auth'
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
      return fail('نمودار جعبه‌ای برای ستون عددی است؛ ابتدا نوع ستون را در برگه ستون‌ها اصلاح کنید (بخش ۸ سند).', 422)
    }
    const groupFieldId = body.groupFieldId && body.groupFieldId !== '—' ? String(body.groupFieldId) : undefined
    if (groupFieldId && !fields.some(x => x.id === groupFieldId)) {
      return fail('ستون گروه‌بندی یافت نشد.', 422)
    }

    const filters: QueryFilter[] = Array.isArray(body.filters) ? body.filters : []
    const result = computeBoxPlot(records, fields, fieldId, groupFieldId, filters)

    // ماسک نام گروه‌های محرمانه — تجمیع روی داده واقعی حفظ می‌شود (بخش ۲۹ سند)
    const sensitiveIds = fields.filter(fl => fl.sensitivity === 'confidential').map(fl => fl.id)
    let outGroups = result.groups
    if (groupFieldId && sensitiveIds.includes(groupFieldId)) {
      outGroups = result.groups.map(g => ({ ...g, name: maskValue(g.name) }))
    }

    return ok({ fieldId, fieldLabel: f.label, groupFieldId: groupFieldId ?? null, unit: f.unit ?? null, ...result, groups: outGroups })
  } catch (e) {
    return errorResponse(e)
  }
}
