// پرس‌وجوی تجمیعی — بخش ۱۱، ۱۳ و ۱۹ سند

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, parseJson } from '@/lib/server'
import { runQuery, buildDescriptiveReport } from '@/lib/query'
import { FieldMeta, DataRow, QuerySpec } from '@/lib/types'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = parseJson<DataRow[]>(ds.records, [])
    const spec: QuerySpec = {
      dimensions: Array.isArray(body.dimensions) ? body.dimensions : [],
      measures: Array.isArray(body.measures) && body.measures.length > 0 ? body.measures : [{ agg: 'count' }],
      filters: body.filters ?? [],
      orderBy: body.orderBy,
      limit: body.limit,
      searchText: body.searchText,
    }

    const result = runQuery(records, fields, spec)

    // گزارش توصیفی اختیاری — بخش ۲۰ سند
    let descriptive: string | undefined
    if (body.descriptive) {
      descriptive = buildDescriptiveReport(records, fields, spec, result, ds.name, body.dateField)
    }

    return ok({ ...result, descriptive })
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'خطا در اجرای پرس‌وجو')
  }
}
