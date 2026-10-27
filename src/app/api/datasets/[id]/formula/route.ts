// ساخت فیلد محاسباتی با زبان امن — بخش ۱۲ سند

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, logAudit, parseJson } from '@/lib/server'
import { computeDerivedField } from '@/lib/formula'
import { FieldMeta, DataRow } from '@/lib/types'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const formula = String(body.formula ?? '').trim()
    const newName = String(body.newName ?? '').trim().replace(/\s+/g, '_')
    const newLabel = String(body.newLabel ?? newName)
    if (!formula) return fail('فرمول الزامی است.')
    if (!newName) return fail('نام فیلد جدید الزامی است.')

    const ds = await db.dataset.findUnique({ where: { id } })
    if (!ds) return fail('مجموعه‌داده یافت نشد.', 404)

    const fields = parseJson<FieldMeta[]>(ds.fields, [])
    const records = parseJson<DataRow[]>(ds.records, [])
    if (fields.some(f => f.id === newName || f.label === newLabel)) {
      return fail('فیلدی با این نام از قبل وجود دارد.')
    }

    const result = computeDerivedField(records, fields, formula, newName, newLabel)
    if (result.errors.length > 0) return fail(result.errors.join('؛ '))

    // پیش‌نمایش نتیجه — بخش ۱۲.۲
    if (body.previewOnly) {
      return ok({ preview: result.preview, confirmed: false })
    }

    const newFields = [...fields, result.field]
    await db.dataset.update({
      where: { id },
      data: {
        records: JSON.stringify(result.records),
        fields: JSON.stringify(newFields),
        version: ds.version + 1,
      },
    })
    await logAudit(ds.projectId, 'ساخت فیلد محاسباتی', `فیلد «${newLabel}» با فرمول ${formula} ساخته شد (بخش ۱۲ سند)`)

    return ok({ field: result.field, preview: result.preview, version: ds.version + 1 }, 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'خطا در ساخت فیلد')
  }
}
