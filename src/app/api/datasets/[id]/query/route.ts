// پرس‌وجوی تجمیعی — بخش ۱۱، ۱۳ و ۱۹ سند

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { runQuery, buildDescriptiveReport } from '@/lib/query'
import { requireUser, errorResponse, applyRowRules, maskRecords, maskFieldsMeta, RowRule } from '@/lib/auth'
import { resolveRelationFilters, RelationFilter } from '@/lib/relfilter'
import { FieldMeta, DataRow, QuerySpec } from '@/lib/types'

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
    const spec: QuerySpec = {
      dimensions: Array.isArray(body.dimensions) ? body.dimensions : [],
      measures: Array.isArray(body.measures) && body.measures.length > 0 ? body.measures : [{ agg: 'count' }],
      filters: body.filters ?? [],
      orderBy: body.orderBy,
      limit: body.limit,
      searchText: body.searchText,
    }

    // فیلتر وابسته از روابط جداول — بخش ۱۹.۳ سند (تبدیل شبه‌اجرا به فیلتر کلید اتصال)
    const relationFilters: RelationFilter[] = Array.isArray(body.relationFilters) ? body.relationFilters : []
    const resolved = await resolveRelationFilters(ds.id, relationFilters, user)
    if (resolved.filters.length > 0) spec.filters = [...(spec.filters ?? []), ...resolved.filters]

    const result = runQuery(records, fields, spec)
    if (resolved.warnings.length > 0) result.warnings.push(...resolved.warnings)

    // ماسک اطلاعات حساس فقط روی مقادیر نمایشی (ابعاد) — بخش ۲۹ سند
    // تجمیع روی داده واقعی انجام شده تا صحت محاسبات حفظ شود
    const sensitiveIds = fields.filter(f => f.sensitivity === 'confidential').map(f => f.id)
    const outFields = maskFieldsMeta(fields, user.role)
    let outRows = result.rows
    if (sensitiveIds.length > 0) {
      const { maskValue } = await import('@/lib/auth')
      outRows = result.rows.map(r => {
        const row = { ...r }
        for (const sid of sensitiveIds) {
          if (row[sid] !== null && row[sid] !== undefined && String(row[sid]) !== '') row[sid] = maskValue(row[sid])
        }
        return row
      })
    }

    // گزارش توصیفی اختیاری — بخش ۲۰ سند
    let descriptive: string | undefined
    if (body.descriptive) {
      descriptive = buildDescriptiveReport(records, fields, spec, result, ds.name, body.dateField)
    }

    return ok({ ...result, rows: outRows, descriptive })
  } catch (e) {
    return errorResponse(e)
  }
}
